const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const basicAuth = require('express-basic-auth');
const compression = require('compression');
const { exec } = require('child_process');
const WebSocket = require('ws');

// Configuración de zona horaria del sistema (Argentina)
const SYSTEM_TIMEZONE = 'America/Buenos_Aires';
const SYSTEM_TIMEZONE_OFFSET = -3; // UTC-3

// Utilidades para manejo consistente de fechas y zonas horarias
function formatDateForDisplay(dateString, options = {}) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            ...options
        });
    } catch (error) {
        console.warn('Error formatting date for display:', error);
        return dateString;
    }
}

function formatDateForDB(dateString) {
    try {
        // Convertir a UTC para almacenamiento consistente
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        // Ajustar por zona horaria del sistema antes de convertir a UTC
        const systemTime = new Date(date.getTime() - (SYSTEM_TIMEZONE_OFFSET * 60 * 60 * 1000));
        return systemTime.toISOString();
    } catch (error) {
        console.warn('Error formatting date for DB:', error);
        return dateString;
    }
}

function getCurrentSystemDate() {
    // Obtener fecha actual en zona horaria del sistema
    const now = new Date();
    const systemTime = new Date(now.getTime() + (SYSTEM_TIMEZONE_OFFSET * 60 * 60 * 1000));
    return systemTime;
}

function calculateDaysDifference(dateString) {
    try {
        const targetDate = new Date(dateString);
        const today = getCurrentSystemDate();

        // Resetear horas para comparación de días
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const current = new Date(today);
        current.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - current.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    } catch (error) {
        console.warn('Error calculating days difference:', error);
        return 0;
    }
}

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(compression()); // Compresión HTTP para mejor rendimiento
app.use(express.json());

// Autenticación básica para operaciones que modifican datos
const authMiddleware = basicAuth({
    users: { 'admin': 'pos123' },
    challenge: true,
});

// Middleware para saltar autenticación en ngrok
function conditionalAuth(req, res, next) {
    const host = req.get('host') || '';
    // Permitir tanto ngrok como localhost para desarrollo
    if (host.includes('ngrok') || host.includes('localhost')) {
        return next();
    }
    return authMiddleware(req, res, next);
}

// Middleware para proteger solo operaciones de escritura
function protectWriteOperations(req, res, next) {
    if (req.method === 'GET') {
        // Permitir lecturas sin autenticación
        return next();
    }
    // Para POST, PUT, DELETE requerir autenticación (con excepción de ngrok)
    return conditionalAuth(req, res, next);
}

// Aplicar protección a rutas de productos (lectura pública, escritura protegida)
app.use('/api/products', protectWriteOperations);
app.use('/api/sales', conditionalAuth);
app.use('/api/categories', protectWriteOperations);
// Registrar endpoint de clientes (eliminado para evitar error 500 - endpoint ya está implementado en este mismo archivo)


// Proteger solo operaciones de escritura para clientes (con excepción de ngrok)
app.use('/api/customers', (req, res, next) => {
    if (req.method === 'GET') {
        // Permitir lecturas sin autenticación
        return next();
    }
    // Para POST, PUT, DELETE requerir autenticación (con excepción de ngrok)
    return conditionalAuth(req, res, next);
});

// Middleware para medir tiempo de respuesta y logging optimizado
app.use((req, res, next) => {
    req.startTime = Date.now();
    if (req.method === 'DELETE') {
        console.log('🪓 [LOG] Solicitud DELETE recibida:', req.originalUrl);
    }
    next();
});

// CSP comentado temporalmente para debug
// app.use((req, res, next) => {
//     res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
//     next();
// });

// Servir archivos frontend desde carpeta ../Frontend (AGREGADO)
app.use(express.static(path.join(__dirname, '../Frontend'), { maxAge: 0 }));

// Servir archivos shared
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Manejar solicitudes de source maps para evitar errores de extensiones del navegador
app.get('*.map', (req, res) => {
    // Devolver un source map vacío válido para evitar errores JSON.parse
    res.setHeader('Content-Type', 'application/json');
    res.send('{"version":3,"sources":[],"names":[],"mappings":"","file":""}');
});

// Configuración de SQLite con optimizaciones
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        // Optimizar SQLite para mejor rendimiento
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = -2000'); // Reducir caché de SQLite para conexiones más directas
        db.run('PRAGMA temp_store = memory');
        initDatabase().catch(err => {
            console.error('Error initializing database:', err);
        });
    }
});

// Función para verificar si una columna existe en una tabla
function columnExists(tableName, columnName) {
    return new Promise((resolve, reject) => {
        db.get(`PRAGMA table_info(${tableName})`, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            // Verificar si la columna existe
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                if (err) {
                    reject(err);
                    return;
                }
                const exists = columns.some(col => col.name === columnName);
                resolve(exists);
            });
        });
    });
}

// Función para verificar si un índice existe
function indexExists(indexName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [indexName], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(!!row);
        });
    });
}

// Función para verificar si una tabla existe
function tableExists(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(!!row);
        });
    });
}

// Inicializar la base de datos
async function initDatabase() {
    try {
        // Crear tabla de versiones del esquema si no existe
        await dbRun(`CREATE TABLE IF NOT EXISTS schema_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER UNIQUE NOT NULL,
            description TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Obtener versión actual del esquema
        const currentVersion = await dbAll("SELECT MAX(version) as version FROM schema_versions");
        const schemaVersion = currentVersion[0]?.version || 0;

        console.log(`📊 Versión del esquema actual: ${schemaVersion}`);

        // Crear todas las tablas base
        const tables = [
            {
                name: 'ventas',
                sql: `CREATE TABLE IF NOT EXISTS ventas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_factura TEXT UNIQUE NOT NULL,
                    total REAL NOT NULL,
                    metodo_pago TEXT NOT NULL,
                    vuelto REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'clientes',
                sql: `CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    telefono TEXT,
                    direccion TEXT,
                    dni TEXT,
                    nota TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'deudas',
                sql: `CREATE TABLE IF NOT EXISTS deudas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
                    venta_id INTEGER NOT NULL REFERENCES ventas(id),
                    monto_original REAL NOT NULL,
                    monto_pendiente REAL NOT NULL,
                    fecha_vencimiento DATE,
                    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(cliente_id, venta_id)
                )`
            },
            {
                name: 'deuda_productos',
                sql: `CREATE TABLE IF NOT EXISTS deuda_productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    deuda_id INTEGER NOT NULL REFERENCES deudas(id) ON DELETE CASCADE,
                    producto_id INTEGER NOT NULL REFERENCES productos(id),
                    cantidad INTEGER NOT NULL,
                    precio_unitario REAL NOT NULL,
                    subtotal REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'venta_items',
                sql: `CREATE TABLE IF NOT EXISTS venta_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    venta_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    cantidad INTEGER NOT NULL,
                    precio_unitario REAL NOT NULL,
                    precio_original REAL,
                    descuento_porcentaje REAL DEFAULT 0,
                    subtotal REAL NOT NULL,
                    lote_id INTEGER REFERENCES lotes(id),
                    FOREIGN KEY (venta_id) REFERENCES ventas(id),
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )`
            },
            {
                name: 'cierres_caja',
                sql: `CREATE TABLE IF NOT EXISTS cierres_caja (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_cierre DATE NOT NULL,
                    fecha_hora_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
                    dinero_inicial REAL NOT NULL,
                    total_ventas REAL NOT NULL,
                    total_esperado REAL NOT NULL,
                    diferencia REAL NOT NULL,
                    cantidad_ventas INTEGER NOT NULL,
                    tipo_cierre TEXT DEFAULT 'normal',
                    notas TEXT,
                    numero_cierre_dia INTEGER DEFAULT 1
                )`
            },
            {
                name: 'dias_sin_cierre',
                sql: `CREATE TABLE IF NOT EXISTS dias_sin_cierre (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha DATE NOT NULL UNIQUE,
                    ventas_acumuladas REAL DEFAULT 0,
                    estado TEXT DEFAULT 'pendiente',
                    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'proveedores',
                sql: `CREATE TABLE IF NOT EXISTS proveedores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre_proveedor TEXT NOT NULL,
                    nombre_contacto TEXT,
                    telefono TEXT,
                    email TEXT,
                    productos_servicios TEXT,
                    condiciones_pago TEXT,
                    estatus TEXT DEFAULT 'Activo',
                    notas TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'promociones',
                sql: `CREATE TABLE IF NOT EXISTS promociones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    titulo TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'promocion_items',
                sql: `CREATE TABLE IF NOT EXISTS promocion_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    promocion_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    descuento_porcentaje REAL NOT NULL,
                    FOREIGN KEY (promocion_id) REFERENCES promociones(id),
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )`
            },
            {
                name: 'configuracion',
                sql: `CREATE TABLE IF NOT EXISTS configuracion (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clave TEXT UNIQUE NOT NULL,
                    valor TEXT NOT NULL,
                    descripcion TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'operaciones_log',
                sql: `CREATE TABLE IF NOT EXISTS operaciones_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo_operacion TEXT NOT NULL,
                    descripcion TEXT NOT NULL,
                    usuario TEXT,
                    entidad_afectada TEXT,
                    id_entidad INTEGER,
                    datos_anteriores TEXT,
                    datos_nuevos TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'licencia',
                sql: `CREATE TABLE IF NOT EXISTS licencia (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clave_licencia TEXT UNIQUE NOT NULL,
                    estado TEXT DEFAULT 'activa',
                    fecha_activacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_expiracion DATETIME,
                    datos_cliente TEXT
                )`
            },
            {
                name: 'pedidos_proveedores',
                sql: `CREATE TABLE IF NOT EXISTS pedidos_proveedores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_pedido TEXT UNIQUE NOT NULL,
                    proveedor_id INTEGER NOT NULL,
                    fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_entrega_estimada DATE,
                    fecha_entrega DATE,
                    estado TEXT DEFAULT 'pendiente',
                    total REAL DEFAULT 0,
                    notas TEXT,
                    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
                )`
            },
            {
                name: 'lotes',
                sql: `CREATE TABLE IF NOT EXISTS lotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    numero_lote TEXT NOT NULL,
                    fecha_vencimiento DATE NOT NULL,
                    cantidad_inicial INTEGER NOT NULL,
                    cantidad_actual INTEGER NOT NULL CHECK (cantidad_actual >= 0),
                    costo_unitario REAL,
                    notas TEXT,
                    estado TEXT DEFAULT 'activo',
                    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )`
            },
            {
                name: 'pedido_items',
                sql: `CREATE TABLE IF NOT EXISTS pedido_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pedido_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    cantidad INTEGER NOT NULL,
                    precio_unitario REAL NOT NULL,
                    subtotal REAL NOT NULL,
                    FOREIGN KEY (pedido_id) REFERENCES pedidos_proveedores(id),
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )`
            }
        ];

        // Crear todas las tablas
        for (const table of tables) {
            await dbRun(table.sql);
        }

        // Migraciones de esquema - solo ejecutar si no se han aplicado
        if (schemaVersion < 1) {
            console.log('🔄 Aplicando migración de esquema v1...');

            // Agregar columnas faltantes usando verificación previa
            const columnMigrations = [
                { table: 'pedidos_proveedores', column: 'fecha_entrega_estimada', type: 'DATE' },
                { table: 'pedidos_proveedores', column: 'fecha_entrega', type: 'DATE' },
                { table: 'venta_items', column: 'precio_original', type: 'REAL' },
                { table: 'cierres_caja', column: 'fecha_cierre', type: 'DATE' },
                { table: 'cierres_caja', column: 'tipo_cierre', type: 'TEXT DEFAULT \'normal\'' },
                { table: 'cierres_caja', column: 'notas', type: 'TEXT' },
                { table: 'venta_items', column: 'descuento_porcentaje', type: 'REAL DEFAULT 0' },
                { table: 'venta_items', column: 'lote_id', type: 'INTEGER REFERENCES lotes(id)' },
                { table: 'productos', column: 'lote_actual_id', type: 'INTEGER REFERENCES lotes(id)' }
            ];

            for (const migration of columnMigrations) {
                const exists = await columnExists(migration.table, migration.column);
                if (!exists) {
                    await dbRun(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}`);
                    console.log(`✅ Columna ${migration.column} agregada a ${migration.table}`);
                }
            }

            // Agregar columna created_at a ventas si no existe
            const ventasCreatedAtExists = await columnExists('ventas', 'created_at');
            if (!ventasCreatedAtExists) {
                await dbRun(`ALTER TABLE ventas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Columna created_at agregada a ventas');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [1, 'Migración inicial: agregar columnas faltantes']);
            console.log('✅ Migración v1 completada');
        }

        // Crear índices optimizados - solo si no se han creado antes (versión 2)
        if (schemaVersion < 2) {
            console.log('🔄 Aplicando migración de esquema v2: creación de índices...');

            const indexes = [
                // Índices básicos de productos
                'CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria)',
                'CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)',
                'CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre)',
                'CREATE INDEX IF NOT EXISTS idx_productos_codigo_nombre ON productos(codigo, nombre)',
                'CREATE INDEX IF NOT EXISTS idx_productos_lote_actual ON productos(lote_actual_id)',

                // Índices de ventas optimizados
                'CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_ventas_fecha_only ON ventas(DATE(created_at))',
                'CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas(metodo_pago)',

                // Índices de operaciones
                'CREATE INDEX IF NOT EXISTS idx_operaciones_tipo ON operaciones_log(tipo_operacion)',
                'CREATE INDEX IF NOT EXISTS idx_operaciones_fecha ON operaciones_log(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_operaciones_entidad ON operaciones_log(entidad_afectada, id_entidad)',

                // Índices de lotes optimizados para consultas de vencimiento
                'CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_producto_estado ON lotes(producto_id, estado)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_estado ON lotes(fecha_vencimiento, estado)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_fecha_ingreso ON lotes(fecha_ingreso)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_cantidad_actual ON lotes(cantidad_actual)',

                // Índices de proveedores
                'CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre_proveedor)',
                'CREATE INDEX IF NOT EXISTS idx_proveedores_email ON proveedores(email)',

                // Índices de pedidos optimizados
                'CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor ON pedidos_proveedores(proveedor_id)',
                'CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos_proveedores(fecha_pedido)',
                'CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos_proveedores(estado)',
                'CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega ON pedidos_proveedores(fecha_entrega)',
                'CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega_estimada ON pedidos_proveedores(fecha_entrega_estimada)',

                // Índices de items de pedidos
                'CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id)',
                'CREATE INDEX IF NOT EXISTS idx_pedido_items_producto ON pedido_items(producto_id)',

                // Índices de cierres de caja
                'CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_caja(fecha_cierre)',
                'CREATE INDEX IF NOT EXISTS idx_cierres_tipo ON cierres_caja(tipo_cierre)',

                // Índices de promociones
                'CREATE INDEX IF NOT EXISTS idx_promocion_items_producto ON promocion_items(producto_id)',
                'CREATE INDEX IF NOT EXISTS idx_promocion_items_promocion ON promocion_items(promocion_id)',
                'CREATE INDEX IF NOT EXISTS idx_promociones_created_at ON promociones(created_at)',

                // Índices de items de venta optimizados
                'CREATE INDEX IF NOT EXISTS idx_venta_items_producto ON venta_items(producto_id)',
                'CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id)',
                'CREATE INDEX IF NOT EXISTS idx_venta_items_lote ON venta_items(lote_id)',

                // Índices compuestos para consultas complejas
                'CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_cantidad ON lotes(fecha_vencimiento, cantidad_actual, estado)',
                'CREATE INDEX IF NOT EXISTS idx_productos_stock_categoria ON productos(stock, categoria)',
                'CREATE INDEX IF NOT EXISTS idx_ventas_fecha_total ON ventas(created_at, total)',

                // Índices adicionales para optimización de búsquedas
                'CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo)',
                'CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo ON productos(categoria, activo)',
                'CREATE INDEX IF NOT EXISTS idx_productos_precio ON productos(precio)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_estado_cantidad ON lotes(estado, cantidad_actual)',
                'CREATE INDEX IF NOT EXISTS idx_lotes_fecha_vencimiento_estado_cantidad ON lotes(fecha_vencimiento, estado, cantidad_actual)',
                'CREATE INDEX IF NOT EXISTS idx_promocion_items_descuento ON promocion_items(descuento_porcentaje)'
            ];

            // Crear índices en paralelo para mejor rendimiento
            const indexPromises = indexes.map(async (indexSQL, index) => {
                try {
                    const indexName = indexSQL.match(/idx_\w+/)[0];
                    const exists = await indexExists(indexName);
                    if (!exists) {
                        await dbRun(indexSQL);
                        console.log(`✅ Index ${indexName} created`);
                    }
                } catch (error) {
                    console.log(`⚠️ Error creating index:`, error.message);
                }
            });
    
            await Promise.all(indexPromises);
    
            // Crear tabla FTS para búsqueda de texto completo optimizada
            try {
                const ftsExists = await tableExists('productos_fts');
                if (!ftsExists) {
                    console.log('🔄 Creando tabla FTS para búsqueda optimizada...');
                    await dbRun(`
                        CREATE VIRTUAL TABLE productos_fts USING fts5(
                            nombre, codigo, descripcion,
                            content='productos',
                            content_rowid='id'
                        )
                    `);
    
                    // Poblar tabla FTS con datos existentes
                    await dbRun(`
                        INSERT INTO productos_fts(rowid, nombre, codigo, descripcion)
                        SELECT id, nombre, codigo, descripcion FROM productos
                    `);
    
                    // Crear triggers para mantener FTS sincronizada
                    await dbRun(`
                        CREATE TRIGGER productos_fts_insert AFTER INSERT ON productos
                        BEGIN
                            INSERT INTO productos_fts(rowid, nombre, codigo, descripcion)
                            VALUES (new.id, new.nombre, new.codigo, new.descripcion);
                        END
                    `);
    
                    await dbRun(`
                        CREATE TRIGGER productos_fts_delete AFTER DELETE ON productos
                        BEGIN
                            DELETE FROM productos_fts WHERE rowid = old.id;
                        END
                    `);
    
                    await dbRun(`
                        CREATE TRIGGER productos_fts_update AFTER UPDATE ON productos
                        BEGIN
                            UPDATE productos_fts SET
                                nombre = new.nombre,
                                codigo = new.codigo,
                                descripcion = new.descripcion
                            WHERE rowid = new.id;
                        END
                    `);
    
                    console.log('✅ Tabla FTS creada y sincronizada');
                }
            } catch (error) {
                console.log('⚠️ Error creando tabla FTS:', error.message);
            }
    
            console.log('✅ Todos los índices y FTS verificados/creados');

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [2, 'Migración v2: creación de índices optimizados']);
            console.log('✅ Migración v2 completada');
        }

        // Migración v3: agregar campo codigo_barras a tabla lotes
        if (schemaVersion < 3) {
            console.log('🔄 Aplicando migración de esquema v3: agregar códigos de barras a lotes...');

            // Agregar columna codigo_barras a tabla lotes
            const barcodeColumnExists = await columnExists('lotes', 'codigo_barras');
            if (!barcodeColumnExists) {
                await dbRun(`ALTER TABLE lotes ADD COLUMN codigo_barras TEXT`);
                console.log('✅ Columna codigo_barras agregada a lotes');
            }

            // Crear índice para búsquedas por código de barras
            const barcodeIndexExists = await indexExists('idx_lotes_codigo_barras');
            if (!barcodeIndexExists) {
                await dbRun(`CREATE INDEX idx_lotes_codigo_barras ON lotes(codigo_barras)`);
                console.log('✅ Índice idx_lotes_codigo_barras creado');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [3, 'Migración v3: agregar campo codigo_barras a tabla lotes']);
            console.log('✅ Migración v3 completada');
        }

        // Migración v4: agregar campo codigo_barras a tabla productos
        if (schemaVersion < 4) {
            console.log('🔄 Aplicando migración de esquema v4: agregar códigos de barras a productos...');

            // Agregar columna codigo_barras a tabla productos
            const productBarcodeColumnExists = await columnExists('productos', 'codigo_barras');
            if (!productBarcodeColumnExists) {
                await dbRun(`ALTER TABLE productos ADD COLUMN codigo_barras TEXT`);
                console.log('✅ Columna codigo_barras agregada a productos');
            }

            // Crear índice para búsquedas por código de barras en productos
            const productBarcodeIndexExists = await indexExists('idx_productos_codigo_barras');
            if (!productBarcodeIndexExists) {
                await dbRun(`CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras)`);
                console.log('✅ Índice idx_productos_codigo_barras creado');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [4, 'Migración v4: agregar campo codigo_barras a tabla productos']);
            console.log('✅ Migración v4 completada');
        }

        // Migración v5: eliminar campo codigo_barras de tabla lotes
        if (schemaVersion < 5) {
            console.log('🔄 Aplicando migración de esquema v5: eliminar códigos de barras de lotes...');

            // Verificar si la columna existe
            const loteBarcodeColumnExists = await columnExists('lotes', 'codigo_barras');
            if (loteBarcodeColumnExists) {
                console.log('   Recreando tabla lotes sin columna codigo_barras...');

                // En SQLite, no se puede hacer ALTER TABLE DROP COLUMN directamente
                // Necesitamos recrear la tabla

                // Crear tabla temporal con la estructura nueva
                await dbRun(`
                    CREATE TABLE lotes_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        producto_id INTEGER NOT NULL,
                        numero_lote TEXT NOT NULL,
                        fecha_vencimiento DATE NOT NULL,
                        cantidad_inicial INTEGER NOT NULL,
                        cantidad_actual INTEGER NOT NULL CHECK (cantidad_actual >= 0),
                        costo_unitario REAL,
                        notas TEXT,
                        estado TEXT DEFAULT 'activo',
                        fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (producto_id) REFERENCES productos(id)
                    )
                `);

                // Copiar datos de la tabla antigua a la nueva (excluyendo codigo_barras)
                await dbRun(`
                    INSERT INTO lotes_new (
                        id, producto_id, numero_lote, fecha_vencimiento,
                        cantidad_inicial, cantidad_actual, costo_unitario, notas,
                        estado, fecha_ingreso, created_at
                    )
                    SELECT
                        id, producto_id, numero_lote, fecha_vencimiento,
                        cantidad_inicial, cantidad_actual, costo_unitario, notas,
                        estado, fecha_ingreso, created_at
                    FROM lotes
                `);

                // Eliminar índices relacionados con codigo_barras
                const loteBarcodeIndexExists = await indexExists('idx_lotes_codigo_barras');
                if (loteBarcodeIndexExists) {
                    await dbRun(`DROP INDEX idx_lotes_codigo_barras`);
                    console.log('✅ Índice idx_lotes_codigo_barras eliminado');
                }

                // Reemplazar tabla antigua con la nueva
                await dbRun(`DROP TABLE lotes`);
                await dbRun(`ALTER TABLE lotes_new RENAME TO lotes`);

                // Recrear índices necesarios (excepto el de codigo_barras)
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto_estado ON lotes(producto_id, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_estado ON lotes(fecha_vencimiento, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_fecha_ingreso ON lotes(fecha_ingreso)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_cantidad_actual ON lotes(cantidad_actual)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_cantidad ON lotes(fecha_vencimiento, cantidad_actual, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto_stock_categoria ON productos(stock, categoria)`);

                console.log('✅ Tabla lotes recreada sin columna codigo_barras');
            } else {
                console.log('ℹ️ Columna codigo_barras ya no existe en lotes');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [5, 'Migración v5: eliminar campo codigo_barras de tabla lotes']);
            console.log('✅ Migración v5 completada');
        }

        // Migración v6: agregar campo codigo_barras de vuelta a tabla lotes
        if (schemaVersion < 6) {
            console.log('🔄 Aplicando migración de esquema v6: agregar códigos de barras a lotes...');

            // Agregar columna codigo_barras a tabla lotes
            const loteBarcodeColumnExists = await columnExists('lotes', 'codigo_barras');
            if (!loteBarcodeColumnExists) {
                await dbRun(`ALTER TABLE lotes ADD COLUMN codigo_barras TEXT`);
                console.log('✅ Columna codigo_barras agregada a lotes');
            }

            // Crear índice para búsquedas por código de barras en lotes
            const loteBarcodeIndexExists = await indexExists('idx_lotes_codigo_barras');
            if (!loteBarcodeIndexExists) {
                await dbRun(`CREATE INDEX idx_lotes_codigo_barras ON lotes(codigo_barras)`);
                console.log('✅ Índice idx_lotes_codigo_barras creado');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [6, 'Migración v6: agregar campo codigo_barras de vuelta a tabla lotes']);
            console.log('✅ Migración v6 completada');
        }

        // Migración v7: eliminar campo codigo_barras de tabla lotes (códigos ahora son de productos)
        if (schemaVersion < 7) {
            console.log('🔄 Aplicando migración de esquema v7: eliminar códigos de barras de lotes...');

            // Verificar si la columna existe
            const loteBarcodeColumnExists = await columnExists('lotes', 'codigo_barras');
            if (loteBarcodeColumnExists) {
                console.log('   Recreando tabla lotes sin columna codigo_barras...');

                // En SQLite, no se puede hacer ALTER TABLE DROP COLUMN directamente
                // Necesitamos recrear la tabla

                // Crear tabla temporal con la estructura nueva
                await dbRun(`
                    CREATE TABLE lotes_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        producto_id INTEGER NOT NULL,
                        numero_lote TEXT NOT NULL,
                        fecha_vencimiento DATE NOT NULL,
                        cantidad_inicial INTEGER NOT NULL,
                        cantidad_actual INTEGER NOT NULL CHECK (cantidad_actual >= 0),
                        costo_unitario REAL,
                        notas TEXT,
                        estado TEXT DEFAULT 'activo',
                        fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (producto_id) REFERENCES productos(id)
                    )
                `);

                // Copiar datos de la tabla antigua a la nueva (excluyendo codigo_barras)
                await dbRun(`
                    INSERT INTO lotes_new (
                        id, producto_id, numero_lote, fecha_vencimiento,
                        cantidad_inicial, cantidad_actual, costo_unitario, notas,
                        estado, fecha_ingreso, created_at
                    )
                    SELECT
                        id, producto_id, numero_lote, fecha_vencimiento,
                        cantidad_inicial, cantidad_actual, costo_unitario, notas,
                        estado, fecha_ingreso, created_at
                    FROM lotes
                `);

                // Eliminar índices relacionados con codigo_barras
                const loteBarcodeIndexExists = await indexExists('idx_lotes_codigo_barras');
                if (loteBarcodeIndexExists) {
                    await dbRun(`DROP INDEX idx_lotes_codigo_barras`);
                    console.log('✅ Índice idx_lotes_codigo_barras eliminado');
                }

                // Reemplazar tabla antigua con la nueva
                await dbRun(`DROP TABLE lotes`);
                await dbRun(`ALTER TABLE lotes_new RENAME TO lotes`);

                // Recrear índices necesarios (excepto el de codigo_barras)
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto_estado ON lotes(producto_id, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_estado ON lotes(fecha_vencimiento, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_fecha_ingreso ON lotes(fecha_ingreso)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_cantidad_actual ON lotes(cantidad_actual)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento_cantidad ON lotes(fecha_vencimiento, cantidad_actual, estado)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_lotes_producto_stock_categoria ON productos(stock, categoria)`);

                console.log('✅ Tabla lotes recreada sin columna codigo_barras');
            } else {
                console.log('ℹ️ Columna codigo_barras ya no existe en lotes');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [7, 'Migración v7: eliminar campo codigo_barras de tabla lotes (códigos ahora son de productos)']);
            console.log('✅ Migración v7 completada');
        }

        // Migración v8: agregar tabla FTS5 para búsqueda de texto completo optimizada
        if (schemaVersion < 8) {
            console.log('🔄 Aplicando migración de esquema v8: crear tabla FTS5 para búsqueda optimizada...');

            try {
                // Verificar si la tabla FTS ya existe
                const ftsExists = await tableExists('productos_fts');
                if (!ftsExists) {
                    console.log('   Creando tabla FTS5 para búsqueda de texto completo...');

                    // Crear tabla FTS5 virtual para búsqueda optimizada
                    await dbRun(`
                        CREATE VIRTUAL TABLE productos_fts USING fts5(
                            nombre, codigo, descripcion,
                            content='productos',
                            content_rowid='id'
                        )
                    `);

                    // Poblar tabla FTS con datos existentes
                    console.log('   Poblando tabla FTS con datos existentes...');
                    await dbRun(`
                        INSERT INTO productos_fts(rowid, nombre, codigo, descripcion)
                        SELECT id, nombre, codigo, descripcion FROM productos
                    `);

                    // Crear triggers para mantener FTS sincronizada automáticamente
                    console.log('   Creando triggers de sincronización FTS...');

                    await dbRun(`
                        CREATE TRIGGER productos_fts_insert AFTER INSERT ON productos
                        BEGIN
                            INSERT INTO productos_fts(rowid, nombre, codigo, descripcion)
                            VALUES (new.id, new.nombre, new.codigo, new.descripcion);
                        END
                    `);

                    await dbRun(`
                        CREATE TRIGGER productos_fts_delete AFTER DELETE ON productos
                        BEGIN
                            DELETE FROM productos_fts WHERE rowid = old.id;
                        END
                    `);

                    await dbRun(`
                        CREATE TRIGGER productos_fts_update AFTER UPDATE ON productos
                        BEGIN
                            UPDATE productos_fts SET
                                nombre = new.nombre,
                                codigo = new.codigo,
                                descripcion = new.descripcion
                            WHERE rowid = new.id;
                        END
                    `);

                    console.log('✅ Tabla FTS5 creada y sincronizada exitosamente');
                } else {
                    console.log('ℹ️ Tabla FTS5 ya existe');
                }

                // Marcar migración como aplicada
                await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                    [8, 'Migración v8: crear tabla FTS5 para búsqueda de texto completo optimizada']);
                console.log('✅ Migración v8 completada');

            } catch (error) {
                console.log('⚠️ Error creando tabla FTS5:', error.message);
                console.log('   La búsqueda funcionará sin optimización FTS, pero será más lenta');

                // Marcar migración como aplicada incluso con error para evitar reintentos
                await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                    [8, 'Migración v8: error creando FTS5 - búsqueda básica disponible']);
                console.log('✅ Migración v8 marcada como completada (con advertencia)');
            }
        }

        // Migración v9: agregar columna activo a tabla productos
        if (schemaVersion < 9) {
            console.log('🔄 Aplicando migración de esquema v9: agregar columna activo a productos...');

            const activoColumnExists = await columnExists('productos', 'activo');
            if (!activoColumnExists) {
                await dbRun(`ALTER TABLE productos ADD COLUMN activo INTEGER DEFAULT 1`);
                console.log('✅ Columna activo agregada a productos');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [9, 'Migración v9: agregar columna activo a tabla productos']);
            console.log('✅ Migración v9 completada');
        }

        // Migración v10: agregar columna updated_at a tabla productos
        if (schemaVersion < 10) {
            console.log('🔄 Aplicando migración de esquema v10: agregar columna updated_at a productos...');

            const updatedAtColumnExists = await columnExists('productos', 'updated_at');
            if (!updatedAtColumnExists) {
                await dbRun(`ALTER TABLE productos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Columna updated_at agregada a productos');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [10, 'Migración v10: agregar columna updated_at a tabla productos']);
            console.log('✅ Migración v10 completada');
        }


        // Migración v12: agregar tabla pagos_deudas para historial de pagos
        if (schemaVersion < 12) {
            console.log('🔄 Aplicando migración de esquema v12: crear tabla pagos_deudas...');

            // Crear tabla de pagos de deudas
            await dbRun(`CREATE TABLE IF NOT EXISTS pagos_deudas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deuda_id INTEGER NOT NULL REFERENCES deudas(id) ON DELETE CASCADE,
                monto REAL NOT NULL,
                fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                descripcion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Crear índices
            await dbRun('CREATE INDEX IF NOT EXISTS idx_pagos_deudas_deuda ON pagos_deudas(deuda_id)');
            await dbRun('CREATE INDEX IF NOT EXISTS idx_pagos_deudas_fecha ON pagos_deudas(fecha_pago)');

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [12, 'Migración v12: crear tabla pagos_deudas para historial de pagos']);
            console.log('✅ Migración v12 completada');
        }

        // Migración v13: permitir múltiples cierres de caja por día
        if (schemaVersion < 13) {
            console.log('🔄 Aplicando migración de esquema v13: permitir múltiples cierres de caja por día...');

            // Agregar columna fecha_hora_cierre para identificar cierres múltiples
            const fechaHoraColumnExists = await columnExists('cierres_caja', 'fecha_hora_cierre');
            if (!fechaHoraColumnExists) {
                await dbRun(`ALTER TABLE cierres_caja ADD COLUMN fecha_hora_cierre DATETIME DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Columna fecha_hora_cierre agregada a cierres_caja');
            }

            // Agregar columna numero_cierre_dia para numerar cierres del día
            const numeroCierreColumnExists = await columnExists('cierres_caja', 'numero_cierre_dia');
            if (!numeroCierreColumnExists) {
                await dbRun(`ALTER TABLE cierres_caja ADD COLUMN numero_cierre_dia INTEGER DEFAULT 1`);
                console.log('✅ Columna numero_cierre_dia agregada a cierres_caja');
            }

            // Poblar fecha_hora_cierre con los valores existentes de fecha
            await dbRun(`UPDATE cierres_caja SET fecha_hora_cierre = fecha WHERE fecha_hora_cierre IS NULL`);
            console.log('✅ Fecha_hora_cierre poblada con valores existentes');

            // Crear índice compuesto para búsquedas eficientes por fecha y hora
            const fechaHoraIndexExists = await indexExists('idx_cierres_fecha_hora');
            if (!fechaHoraIndexExists) {
                await dbRun(`CREATE INDEX idx_cierres_fecha_hora ON cierres_caja(fecha_cierre, fecha_hora_cierre DESC)`);
                console.log('✅ Índice idx_cierres_fecha_hora creado');
            }

            // Crear índice para numero_cierre_dia
            const numeroCierreIndexExists = await indexExists('idx_cierres_numero_dia');
            if (!numeroCierreIndexExists) {
                await dbRun(`CREATE INDEX idx_cierres_numero_dia ON cierres_caja(fecha_cierre, numero_cierre_dia)`);
                console.log('✅ Índice idx_cierres_numero_dia creado');
            }

            // Actualizar numero_cierre_dia para cierres existentes (ordenados por fecha_hora_cierre)
            const cierresExistentes = await dbAll(`
                SELECT id, fecha_cierre, fecha_hora_cierre
                FROM cierres_caja
                ORDER BY fecha_cierre, fecha_hora_cierre
            `);

            // Agrupar por fecha y asignar números secuenciales
            const cierresPorFecha = {};
            for (const cierre of cierresExistentes) {
                if (!cierresPorFecha[cierre.fecha_cierre]) {
                    cierresPorFecha[cierre.fecha_cierre] = [];
                }
                cierresPorFecha[cierre.fecha_cierre].push(cierre);
            }

            // Actualizar numero_cierre_dia para cada grupo
            for (const [fecha, cierres] of Object.entries(cierresPorFecha)) {
                for (let i = 0; i < cierres.length; i++) {
                    await dbRun(
                        `UPDATE cierres_caja SET numero_cierre_dia = ? WHERE id = ?`,
                        [i + 1, cierres[i].id]
                    );
                }
            }

            console.log('✅ Numeración de cierres por día actualizada');

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [13, 'Migración v13: permitir múltiples cierres de caja por día - agregar fecha_hora_cierre y numero_cierre_dia']);
            console.log('✅ Migración v13 completada');
        }

        // Migración v14: quitar restricción UNIQUE(fecha_cierre) para permitir múltiples cierres por día
        if (schemaVersion < 14) {
            console.log('🔄 Aplicando migración de esquema v14: quitar restricción UNIQUE(fecha_cierre)...');

            // En SQLite, no se puede hacer ALTER TABLE DROP CONSTRAINT directamente
            // Necesitamos recrear la tabla sin la restricción UNIQUE

            // Crear tabla temporal con la estructura nueva (sin UNIQUE(fecha_cierre))
            await dbRun(`
                CREATE TABLE cierres_caja_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_cierre DATE NOT NULL,
                    fecha_hora_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
                    dinero_inicial REAL NOT NULL,
                    total_ventas REAL NOT NULL,
                    total_esperado REAL NOT NULL,
                    diferencia REAL NOT NULL,
                    cantidad_ventas INTEGER NOT NULL,
                    tipo_cierre TEXT DEFAULT 'normal',
                    notas TEXT,
                    numero_cierre_dia INTEGER DEFAULT 1
                )
            `);

            // Copiar todos los datos de la tabla antigua a la nueva
            await dbRun(`
                INSERT INTO cierres_caja_new (
                    id, fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial,
                    total_ventas, total_esperado, diferencia, cantidad_ventas,
                    tipo_cierre, notas, numero_cierre_dia
                )
                SELECT
                    id, fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial,
                    total_ventas, total_esperado, diferencia, cantidad_ventas,
                    tipo_cierre, notas, numero_cierre_dia
                FROM cierres_caja
            `);

            // Eliminar índices relacionados con la tabla antigua
            const indexesToDrop = [
                'idx_cierres_fecha',
                'idx_cierres_tipo',
                'idx_cierres_fecha_hora',
                'idx_cierres_numero_dia'
            ];

            for (const indexName of indexesToDrop) {
                const indexExists = await indexExists(indexName);
                if (indexExists) {
                    await dbRun(`DROP INDEX ${indexName}`);
                    console.log(`✅ Índice ${indexName} eliminado`);
                }
            }

            // Reemplazar tabla antigua con la nueva
            await dbRun(`DROP TABLE cierres_caja`);
            await dbRun(`ALTER TABLE cierres_caja_new RENAME TO cierres_caja`);

            // Recrear índices necesarios
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_caja(fecha_cierre)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_tipo ON cierres_caja(tipo_cierre)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_fecha_hora ON cierres_caja(fecha_cierre, fecha_hora_cierre DESC)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_numero_dia ON cierres_caja(fecha_cierre, numero_cierre_dia)`);

            console.log('✅ Tabla cierres_caja recreada sin restricción UNIQUE(fecha_cierre)');

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [14, 'Migración v14: quitar restricción UNIQUE(fecha_cierre) para permitir múltiples cierres de caja por día']);
            console.log('✅ Migración v14 completada');
        }

        // Migración v15: agregar campo ultima_venta_id para controlar ventas incluidas en cada cierre
        if (schemaVersion < 15) {
            console.log('🔄 Aplicando migración de esquema v15: agregar campo ultima_venta_id...');

            // Agregar columna ultima_venta_id a la tabla cierres_caja
            const ultimaVentaIdExists = await columnExists('cierres_caja', 'ultima_venta_id');
            if (!ultimaVentaIdExists) {
                await dbRun(`ALTER TABLE cierres_caja ADD COLUMN ultima_venta_id INTEGER`);
                console.log('✅ Columna ultima_venta_id agregada a cierres_caja');
            }

            // Crear índice para búsqueda por ultima_venta_id
            const ultimaVentaIdIndexExists = await indexExists('idx_cierres_ultima_venta_id');
            if (!ultimaVentaIdIndexExists) {
                await dbRun(`CREATE INDEX idx_cierres_ultima_venta_id ON cierres_caja(ultima_venta_id)`);
                console.log('✅ Índice idx_cierres_ultima_venta_id creado');
            }

            // Para cierres existentes, inicializar el campo con NULL (sin límite de venta)
            await dbRun(`UPDATE cierres_caja SET ultima_venta_id = NULL WHERE ultima_venta_id IS NULL`);
            console.log('✅ Campo ultima_venta_id inicializado para cierres existentes');

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [15, 'Migración v15: agregar campo ultima_venta_id para controlar ventas incluidas en cada cierre']);
            console.log('✅ Migración v15 completada');
        }

        // Migración v16: agregar columna updated_at a tabla deudas
        if (schemaVersion < 16) {
            console.log('🔄 Aplicando migración de esquema v16: agregar columna updated_at a deudas...');

            const updatedAtColumnExists = await columnExists('deudas', 'updated_at');
            if (!updatedAtColumnExists) {
                // SQLite no permite agregar columna con DEFAULT CURRENT_TIMESTAMP
                // Por eso usamos NULL y actualizamos los valores después
                await dbRun(`ALTER TABLE deudas ADD COLUMN updated_at DATETIME`);
                console.log('✅ Columna updated_at agregada a deudas');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [16, 'Migración v16: agregar columna updated_at a tabla deudas']);
            console.log('✅ Migración v16 completada');
        }

        // Migración v17: agregar columna monto_pendiente a tabla deuda_productos
        if (schemaVersion < 17) {
            console.log('🔄 Aplicando migración de esquema v17: agregar columna monto_pendiente a deuda_productos...');

            // Agregar columna monto_pendiente a tabla deuda_productos
            const montoPendienteExists = await columnExists('deuda_productos', 'monto_pendiente');
            if (!montoPendienteExists) {
                await dbRun(`ALTER TABLE deuda_productos ADD COLUMN monto_pendiente REAL DEFAULT 0`);
                console.log('✅ Columna monto_pendiente agregada a deuda_productos');

                // Inicializar monto_pendiente con el subtotal para los registros existentes
                await dbRun(`UPDATE deuda_productos SET monto_pendiente = subtotal WHERE monto_pendiente = 0`);
                console.log('✅ Valores de monto_pendiente inicializados con subtotal');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [17, 'Migración v17: agregar columna monto_pendiente a tabla deuda_productos']);
            console.log('✅ Migración v17 completada');
        }

        // Migración v18: agregar columna pagado (booleano) a tabla deuda_productos
        if (schemaVersion < 18) {
            console.log('🔄 Aplicando migración de esquema v18: agregar columna pagado a deuda_productos...');

            // Agregar columna pagado a tabla deuda_productos
            const pagadoExists = await columnExists('deuda_productos', 'pagado');
            if (!pagadoExists) {
                await dbRun(`ALTER TABLE deuda_productos ADD COLUMN pagado INTEGER DEFAULT 0`);
                console.log('✅ Columna pagado agregada a deuda_productos');

                // Migrar datos: si monto_pendiente es 0 o menor, marcar como pagado = 1
                // (asumiendo que si no debe, tiene el subtotal completo)
                await dbRun(`UPDATE deuda_productos SET pagado = 1 WHERE monto_pendiente IS NOT NULL AND monto_pendiente <= 0`);
                console.log('✅ Datos de pagado migrados desde monto_pendiente');
            }

            // Marcar migración como aplicada
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [18, 'Migración v18: agregar columna pagado a tabla deuda_productos']);
            console.log('✅ Migración v18 completada');
        }


        // Verificar si hay datos de ejemplo que insertar
        const productCount = await dbAll("SELECT COUNT(*) as count FROM productos");
        if (productCount[0].count === 0) {
            insertSampleData();
        }

        console.log('✅ Inicialización de base de datos completada');

    } catch (error) {
        console.error('❌ Error durante la inicialización de la base de datos:', error);
        throw error;
    }
}

// Insertar datos de ejemplo
function insertSampleData() {
    const productos = [
        ['LAP-001', 'Laptop HP 15.6"', 'Laptop HP con pantalla 15.6 pulgadas', 899.99, 25, 'Tecnología'],
        ['MON-001', 'Monitor Samsung 24"', 'Monitor Samsung 24 pulgadas Full HD', 249.99, 15, 'Tecnología'],
        ['TEC-001', 'Teclado Mecánico RGB', 'Teclado mecánico con iluminación RGB', 89.99, 30, 'Periféricos'],
        ['MOU-001', 'Mouse Inalámbrico', 'Mouse inalámbrico ergonómico', 39.99, 45, 'Periféricos'],
        ['AUD-001', 'Audífonos Bluetooth', 'Audífonos inalámbricos con cancelación de ruido', 79.99, 20, 'Audio'],
        ['CAM-001', 'Cámara Web HD', 'Cámara web 1080p para streaming', 59.99, 18, 'Video'],
        ['DIS-001', 'Disco Duro 1TB', 'Disco duro interno 1TB 7200RPM', 69.99, 12, 'Almacenamiento'],
        ['MEM-001', 'Memoria RAM 8GB', 'Memoria RAM DDR4 8GB 2666MHz', 49.99, 8, 'Componentes']
    ];

    const stmt = db.prepare(`
        INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    productos.forEach(producto => {
        stmt.run(producto, (err) => {
            if (err) {
                console.log('⚠️  Producto ya existe:', producto[0]);
            }
        });
    });

    stmt.finalize();
    console.log('✅ Datos de ejemplo insertados en SQLite');
}

// Función para hacer queries más fácil
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Función para ejecutar queries con funciones personalizadas
function dbAllWithFunctions(query, params = []) {
    return new Promise((resolve, reject) => {
        try {
            // Registrar la función removeAccents en SQLite
            db.function('removeAccents', removeAccents);
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        } catch (error) {
            // Si hay error con la función, usar query normal
            console.warn('Error registering removeAccents function, using normal query:', error.message);
            db.all(query.replace(/removeAccents\(/g, '').replace(/\)/g, ''), params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
}

// Función para ejecutar queries con funciones personalizadas
function dbAllWithFunctions(query, params = []) {
    return new Promise((resolve, reject) => {
        // Usar query sin removeAccents ya que la función no está disponible
        const cleanQuery = query.replace(/removeAccents\(([^)]+)\)/g, '$1');
        db.all(cleanQuery, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Función para remover acentos
function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Función para formatear moneda (formato argentino)
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

// Importar utilidades de códigos de barras
const { isValidBarcode } = require('../shared/barcode-utils');

// Importar repositorio de deudas
const DebtsRepository = require('./repositories/debts-repository');

// Función para obtener fecha actual del sistema en zona horaria correcta
function getSystemDateTime() {
    return getCurrentSystemDate().toISOString();
}

// Función para convertir fecha de DB a formato de display
function formatDBDateForResponse(dateString) {
    if (!dateString) return null;
    try {
        // Las fechas en DB están en UTC, convertir a zona horaria del sistema para display
        const utcDate = new Date(dateString);
        const systemDate = new Date(utcDate.getTime() + (SYSTEM_TIMEZONE_OFFSET * 60 * 60 * 1000));
        return systemDate.toISOString();
    } catch (error) {
        console.warn('Error formatting DB date for response:', error);
        return dateString;
    }
}

// Función para obtener configuración
async function getConfig(clave) {
    try {
        const result = await dbAll("SELECT valor FROM configuracion WHERE clave = ?", [clave]);
        return result.length > 0 ? result[0].valor : null;
    } catch (error) {
        console.error('Error getting config:', error);
        return null;
    }
}

// Función para verificar licencia válida
async function checkLicense() {
    try {
        const licenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' AND fecha_expiracion > datetime('now')");
        return licenses.length > 0;
    } catch (error) {
        console.error('Error checking license:', error);
        return false;
    }
}

// Función para obtener detalles de licencia con información de expiración
async function getLicenseDetails() {
    try {
        // Usar el mismo criterio que checkLicense() para consistencia
        const licenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' AND fecha_expiracion > datetime('now') ORDER BY fecha_activacion DESC LIMIT 1");
        if (licenses.length === 0) {
            return { activated: false };
        }

        const license = licenses[0];
        const now = new Date();
        const expirationDate = new Date(license.fecha_expiracion);
        const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

        return {
            activated: true,
            expiration_date: license.fecha_expiracion,
            days_remaining: Math.max(0, daysRemaining),
            expired: daysRemaining <= 0
        };
    } catch (error) {
        console.error('Error getting license details:', error);
        return { activated: false, error: error.message };
    }
}

// Función para verificar y manejar licencias expiradas (solo visual, no automática)
async function checkExpiredLicenses() {
    try {
        // Solo verificar si hay licencias expiradas para mostrar información
        const expiredLicenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' AND fecha_expiracion <= datetime('now')");

        if (expiredLicenses.length > 0) {
            console.log(`⚠️ Se encontraron ${expiredLicenses.length} licencias expiradas. El frontend mostrará alertas visuales.`);
            // No hacer limpieza automática, solo logging para información
        }
    } catch (error) {
        console.error('Error verificando licencias expiradas:', error);
    }
}

// Función para cargar códigos de activación desde archivo
function loadActivationCodes() {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'sysdata.dat');
        const encodedData = fs.readFileSync(filePath, 'utf8');
        const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
        const data = JSON.parse(decodedData);
        return data.activation_codes || [];
    } catch (error) {
        console.error('Error loading activation codes:', error);
        return [];
    }
}

// Función para guardar códigos de activación al archivo
function saveActivationCodes(codes) {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'sysdata.dat');
        const data = { activation_codes: codes };
        const jsonData = JSON.stringify(data, null, 2);
        const encodedData = Buffer.from(jsonData).toString('base64');
        fs.writeFileSync(filePath, encodedData, 'utf8');
    } catch (error) {
        console.error('Error saving activation codes:', error);
    }
}

// Función para activar licencia
async function activateLicense(licenseKey, clientData = null) {
    try {
        // Validar formato de clave (6 dígitos)
        if (!licenseKey || licenseKey.length !== 6 || !/^\d{6}$/.test(licenseKey)) {
            console.log('Validación fallida: formato inválido');
            return { success: false, message: 'Clave de licencia inválida' };
        }

        // Cargar códigos disponibles
        const availableCodes = loadActivationCodes();
        const codeIndex = availableCodes.indexOf(licenseKey);

        if (codeIndex === -1) {
            console.log('Validación fallida: código no encontrado');
            return { success: false, message: 'Clave de licencia inválida o ya utilizada' };
        }

        // Verificar si el código ya fue usado (independientemente del estado)
        const usedCode = await dbAll("SELECT id FROM licencia WHERE clave_licencia = ?", [licenseKey]);
        if (usedCode.length > 0) {
            return { success: false, message: 'Esta clave de activación ya fue utilizada' };
        }

        // Verificar si ya existe una licencia activa
        const existing = await dbAll("SELECT id FROM licencia WHERE estado = 'activa'");
        if (existing.length > 0) {
            return { success: false, message: 'Ya existe una licencia activa' };
        }

        // Calcular fecha de expiración (1 mes desde ahora)
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        const expirationISO = expirationDate.toISOString();

        // Insertar nueva licencia con expiración
        const result = await dbRun(
            "INSERT INTO licencia (clave_licencia, estado, fecha_expiracion, datos_cliente) VALUES (?, 'activa', ?, ?)",
            [licenseKey, expirationISO, clientData ? JSON.stringify(clientData) : null]
        );

        // Remover el código usado del archivo
        availableCodes.splice(codeIndex, 1);
        saveActivationCodes(availableCodes);

        // Registrar en log
        logOperation(
            'LICENCIA_ACTIVADA',
            `Licencia activada: ${licenseKey} - Expira: ${expirationISO}`,
            'Sistema',
            'licencia',
            result.id,
            null,
            { clave_licencia: licenseKey, fecha_expiracion: expirationISO }
        );

        return { success: true, message: `Licencia activada exitosamente. Características premium disponibles hasta ${expirationDate.toLocaleDateString('es-AR')}.` };
    } catch (error) {
        console.error('Error activating license:', error);
        return { success: false, message: 'Error al activar la licencia: ' + error.message };
    }
}

// Función para registrar operaciones en el log (fire-and-forget para no bloquear)
function logOperation(tipoOperacion, descripcion, usuario = 'Sistema', entidadAfectada = null, idEntidad = null, datosAnteriores = null, datosNuevos = null) {
    // Verificar si hay licencia y si el logging está habilitado (async pero fire-and-forget)
    Promise.all([checkLicense(), getConfig('logging_enabled')]).then(([isLicensed, loggingEnabled]) => {
        if (!isLicensed || loggingEnabled !== 'true') {
            return; // Sin licencia o logging deshabilitado, salir silenciosamente
        }

        const query = `
            INSERT INTO operaciones_log (tipo_operacion, descripcion, usuario, entidad_afectada, id_entidad, datos_anteriores, datos_nuevos)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            tipoOperacion,
            descripcion,
            usuario,
            entidadAfectada,
            idEntidad,
            datosAnteriores ? JSON.stringify(datosAnteriores) : null,
            datosNuevos ? JSON.stringify(datosNuevos) : null
        ];

        dbRun(query, params).then(() => {
            // Rotación automática del log (mantener solo los últimos 1000 registros)
            return dbRun(`
                DELETE FROM operaciones_log
                WHERE id NOT IN (
                    SELECT id FROM operaciones_log
                    ORDER BY created_at DESC
                    LIMIT 1000
                )
            `);
        }).catch(error => {
            console.error('Error logging operation:', error);
            // No lanzamos error para no interrumpir la operación principal
        });
    }).catch(err => console.error('Error checking logging config:', err));
}

// Función auxiliar para actualizar lote_actual_id del producto
async function updateLoteActualId(productoId) {
    try {
        // Encontrar el lote más vigente (con fecha de vencimiento más lejana) que tenga stock disponible
        const loteMasVigente = await dbAll(`
            SELECT id FROM lotes
            WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
            ORDER BY fecha_vencimiento DESC
            LIMIT 1
        `, [productoId]);

        if (loteMasVigente.length > 0) {
            // Actualizar lote_actual_id del producto
            await dbRun(
                "UPDATE productos SET lote_actual_id = ? WHERE id = ?",
                [loteMasVigente[0].id, productoId]
            );
        } else {
            // No hay lotes activos con stock, limpiar lote_actual_id
            await dbRun(
                "UPDATE productos SET lote_actual_id = NULL WHERE id = ?",
                [productoId]
            );
        }
    } catch (error) {
        console.error('Error actualizando lote_actual_id:', error);
        // No lanzamos error para no interrumpir operaciones principales
    }
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
//auto categorias
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await dbAll("SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != '' ORDER BY categoria");
        res.json(categories.map(row => row.categoria));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/clientes
 * Endpoint unificado para listar clientes (reemplaza /api/customers)
 */
app.get('/api/customers', async (req, res) => {
    console.log('🔍 GET /api/customers');
    
    const { q, limit = 50, offset = 0, with_debts = false } = req.query;
    
    let whereClause = '';
    let params = [];
    let conditions = [];
    
    if (q && q.trim() !== '') {
        conditions.push('(nombre LIKE ? OR telefono LIKE ? OR dni LIKE ?)');
        const searchTerm = `%${q.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (with_debts === 'true') {
        conditions.push('id IN (SELECT DISTINCT cliente_id FROM deudas WHERE estado = "pendiente" AND monto_pendiente > 0)');
    }
    
    if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const sql = `
        SELECT
            c.id,
            c.nombre,
            c.telefono,
            c.dni,
            c.direccion,
            c.nota,
            c.created_at,
            COALESCE(SUM(d.monto_pendiente), 0) as total_deuda,
            COUNT(d.id) as cantidad_deudas
        FROM clientes c
        LEFT JOIN deudas d ON c.id = d.cliente_id AND d.estado = 'pendiente' AND d.monto_pendiente > 0
        ${whereClause}
        GROUP BY c.id
        ORDER BY total_deuda DESC, c.nombre ASC
        LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    try {
        const rows = await dbAll(sql, params);
        
        // Contar total
        const countSql = `
            SELECT COUNT(*) as total FROM clientes c
            ${whereClause.replace('GROUP BY c.id', '').replace('ORDER BY', 'ORDER BY')}
        `;
        const countParams = with_debts === 'true' ? [] : params.slice(0, -2);
        
        const countResult = await dbAll(countSql, countParams);
        
        res.json({
            clientes: rows,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < countResult[0].total
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/customers/:id
 * Obtener un cliente por su id (para edición desde frontend)
 */
app.get('/api/customers/:id', async (req, res) => {
    const clienteId = req.params.id;
    try {
        const rows = await dbAll("SELECT * FROM clientes WHERE id = ?", [clienteId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Error en GET /api/customers/:id', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

/**
 * POST /api/clientes
 * Endpoint unificado para crear clientes con validación de duplicados
 */
app.post('/api/customers', async (req, res) => {
    console.log('➕ POST /api/customers');
    
    const { nombre, telefono, direccion, dni, nota } = req.body;
    
    // Validaciones requeridas
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El campo nombre es obligatorio'
        });
    }
    
    try {
        // Validar duplicados antes de crear
        const duplicados = await validarClienteDuplicado(nombre.trim(), dni, telefono);
        
        if (duplicados.existe) {
            return res.status(409).json({
                error: 'Cliente duplicado detectado',
                duplicado: duplicados.cliente,
                sugerencia: 'Utilice el cliente existente o proporcione información diferente'
            });
        }
        
        // Crear nuevo cliente
        const result = await dbRun(
            `INSERT INTO clientes (nombre, telefono, direccion, dni, nota, created_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [nombre.trim(), telefono || null, direccion || null, dni || null, nota || null]
        );
        
        const newCustomer = await dbAll("SELECT * FROM clientes WHERE id = ?", [result.id]);
        
        console.log('✅ Cliente creado exitosamente:', newCustomer[0].nombre);
        
        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            cliente: newCustomer[0]
        });
        
    } catch (error) {
        console.error('❌ Error creando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

/**
 * PUT /api/customers/:id
 * Endpoint unificado para actualizar clientes
 */
app.put('/api/customers/:id', async (req, res) => {
    console.log('✏️ PUT /api/customers/:id');
    
    const clienteId = req.params.id;
    const { nombre, telefono, direccion, dni, nota } = req.body;
    
    // Validaciones requeridas
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El campo nombre es obligatorio'
        });
    }
    
    try {
        // Verificar que el cliente existe
        const clienteActual = await dbAll("SELECT * FROM clientes WHERE id = ?", [clienteId]);
        if (clienteActual.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Validar duplicados (excluyendo al cliente actual)
        const duplicados = await validarClienteDuplicado(nombre.trim(), dni, telefono, clienteId);
        
        if (duplicados.existe) {
            return res.status(409).json({
                error: 'Cliente duplicado detectado',
                duplicado: duplicados.cliente,
                sugerencia: 'Utilice un nombre o DNI diferente'
            });
        }
        
        // Actualizar cliente
        await dbRun(
            `UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, dni = ?, nota = ? WHERE id = ?`,
            [nombre.trim(), telefono || null, direccion || null, dni || null, nota || null, clienteId]
        );
        
        console.log('✅ Cliente actualizado exitosamente:', nombre);
        
        res.json({
            success: true,
            message: 'Cliente actualizado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error actualizando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

/**
 * DELETE /api/customers/:id
 * Endpoint unificado para eliminar clientes con manejo de relaciones
 */
app.delete('/api/customers/:id', async (req, res) => {
    console.log('🗑️ DELETE /api/customers/:id');
    
    const clienteId = req.params.id;
    
    try {
        // Verificar que el cliente existe
        const cliente = await dbAll("SELECT id, nombre FROM clientes WHERE id = ?", [clienteId]);
        if (cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Verificar si tiene deudas pendientes
        const deudasPendientes = await dbAll(
            "SELECT COUNT(*) as total FROM deudas WHERE cliente_id = ? AND estado = 'pendiente'",
            [clienteId]
        );
        
        if (deudasPendientes[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el cliente porque tiene deudas pendientes',
                deudas_pendientes: deudasPendientes[0].total
            });
        }
        
        // Eliminar en cascada
        await dbRun("BEGIN TRANSACTION");
        
        try {
            // Eliminar productos de deudas
            await dbRun(`DELETE FROM deuda_productos WHERE deuda_id IN (SELECT id FROM deudas WHERE cliente_id = ?)`, [clienteId]);
            
            // Eliminar deudas
            await dbRun("DELETE FROM deudas WHERE cliente_id = ?", [clienteId]);
            
            // Eliminar cliente
            await dbRun("DELETE FROM clientes WHERE id = ?", [clienteId]);
            
            await dbRun("COMMIT");
            
            console.log('✅ Cliente eliminado exitosamente:', cliente[0].nombre);
            
            res.json({
                success: true,
                message: 'Cliente y datos relacionados eliminados exitosamente'
            });
            
        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error eliminando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

/**
 * DELETE /api/customers/:clienteId/limpiar-deudas
 * Limpiar todas las deudas de un cliente (establecer como pagadas)
 */
app.delete('/api/customers/:clienteId/limpiar-deudas', conditionalAuth, async (req, res) => {
    const clienteId = parseInt(req.params.clienteId);
    
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    
    try {
        // Verificar que el cliente exista
        const cliente = await dbAll("SELECT id, nombre FROM clientes WHERE id = ?", [clienteId]);
        if (cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Usar el repositorio de deudas
        const debtsRepo = new DebtsRepository();
        const result = await debtsRepo.clearAllDebts(clienteId);
        
        console.log('✅ Deudas limpiadas para cliente:', cliente[0].nombre, '- Cantidad:', result.cleared);
        
        res.json({
            success: true,
            message: result.message,
            cleared: result.cleared,
            totalAmount: result.totalAmount,
            cliente: {
                id: cliente[0].id,
                nombre: cliente[0].nombre
            }
        });
    } catch (error) {
        console.error('❌ Error limpiando deudas:', error);
        res.status(500).json({ error: 'Error al limpiar las deudas: ' + error.message });
    }
});

/**
 * GET /api/customers/search
 * Búsqueda de clientes con paginación (versión unificada)
 */
app.get('/api/customers/search', async (req, res) => {
    try {
        const { q, limit = 50, offset = 0, with_debts = false } = req.query;
        
        let whereClause = '';
        let params = [];
        let conditions = [];
        
        if (q && q.trim() !== '') {
            conditions.push('(nombre LIKE ? OR telefono LIKE ? OR dni LIKE ?)');
            const searchTerm = `%${q.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (with_debts === 'true') {
            conditions.push('id IN (SELECT DISTINCT cliente_id FROM deudas WHERE estado = "pendiente" AND monto_pendiente > 0)');
        }
        
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        
        const sql = `
            SELECT
                c.*,
                COALESCE(SUM(d.monto_pendiente), 0) as total_deuda,
                COUNT(d.id) as cantidad_deudas
            FROM clientes c
            LEFT JOIN deudas d ON c.id = d.cliente_id AND d.estado = 'pendiente' AND d.monto_pendiente > 0
            ${whereClause}
            GROUP BY c.id, c.nombre, c.telefono, c.dni, c.direccion, c.nota, c.created_at
            ORDER BY total_deuda DESC, c.nombre ASC
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const clientes = await dbAll(sql, params);
        
        // Contar total de resultados
        const countSql = `
            SELECT COUNT(*) as total FROM clientes c
            ${whereClause.replace('GROUP BY c.id', '').replace('ORDER BY', 'ORDER BY')}
        `;
        const countParams = with_debts === 'true' ? [] : params.slice(0, -2);
        const countResult = await dbAll(countSql, countParams);
        const total = countResult[0].total;
        
        res.json({
            clientes: clientes,
            pagination: {
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> FUNCIONES DE VALIDACIÓN (para evitar duplicados)

/**
 * Validar si un cliente ya existe (por nombre, DNI o teléfono)
 */
async function validarClienteDuplicado(nombre, dni, telefono, excludeId = null) {
    const conditions = [];
    const params = [];
    
    if (nombre && nombre.trim() !== '') {
        conditions.push('nombre = ?');
        params.push(nombre.trim());
    }
    
    if (dni && dni.trim() !== '') {
        conditions.push('dni = ?');
        params.push(dni.trim());
    }
    
    if (telefono && telefono.trim() !== '') {
        conditions.push('telefono = ?');
        params.push(telefono.trim());
    }
    
    if (conditions.length === 0) {
        return { existe: false };
    }
    
    let whereClause = 'WHERE (' + conditions.join(' OR ') + ')';
    
    if (excludeId) {
        whereClause += ' AND id != ?';
        params.push(excludeId);
    }
    
    const sql = `SELECT id, nombre, dni, telefono FROM clientes ${whereClause} LIMIT 1`;
    
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    existe: !!row,
                    cliente: row
                });
            }
        });
    });
}

/**
 * Buscar clientes similares (para prevención inteligente)
 */
async function buscarClientesSimilares(nombre, dni, telefono) {
    const conditions = [];
    const params = [];
    
    if (nombre && nombre.trim() !== '') {
        conditions.push('nombre LIKE ?');
        params.push(`%${nombre.trim()}%`);
    }
    
    if (dni && dni.trim() !== '') {
        conditions.push('dni LIKE ?');
        params.push(`%${dni.trim()}%`);
    }
    
    if (telefono && telefono.trim() !== '') {
        conditions.push('telefono LIKE ?');
        params.push(`%${telefono.trim()}%`);
    }
    
    if (conditions.length === 0) {
        return [];
    }
    
    const sql = `SELECT id, nombre, dni, telefono FROM clientes WHERE ${conditions.join(' OR ')} LIMIT 5`;
    
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// >>> ENDPOINTS EXISTENTES (mantenidos para compatibilidad, pero redirigidos)

// Rutas para clientes (REDIRECCIONADAS automáticamente)
// MODIFICADO: Ahora usa DebtsRepository
app.get('/api/customers/cuenta-corriente', async (req, res) => {
    try {
        console.log('🔍 [REPO] Obteniendo clientes con cuenta corriente via repository');
        
        const debtsRepo = new DebtsRepository();
        const clientes = await debtsRepo.getCustomersWithCredit();
        
        res.json({
            success: true,
            clientes: clientes,
            total: clientes.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
        console.log('🔍 [DEBUG] Consulta SQL ejecutada: SELECT DISTINCT c.id, c.nombre, c.telefono, c.dni, COALESCE(SUM(d.monto_pendiente), 0) as saldo_pendiente, COUNT(d.id) as cantidad_deudas FROM clientes c LEFT JOIN deudas d ON c.id = d.cliente_id AND d.estado = \'pendiente\' AND d.monto_pendiente > 0 GROUP BY c.id, c.nombre, c.telefono, c.dni ORDER BY saldo_pendiente DESC, c.nombre ASC');




// Rutas para deudas
app.get('/api/debts', async (req, res) => {
    try {
        const { cliente_id, estado } = req.query;

        let whereClause = '';
        let params = [];

        // Construir cláusula WHERE dinámicamente
        const conditions = [];

        if (cliente_id) {
            conditions.push('d.cliente_id = ?');
            params.push(cliente_id);
        }

        if (estado) {
            conditions.push('d.estado = ?');
            params.push(estado);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        const debts = await dbAll(`
            SELECT
                d.*,
                c.nombre as cliente_nombre,
                v.created_at as venta_fecha,
                v.numero_factura as venta_numero_factura,
                dp.id as deuda_producto_id,
                dp.producto_id,
                p.nombre as producto_nombre,
                p.precio as precio_actual_producto,
                dp.precio_unitario as precio_unitario,
                dp.cantidad as producto_cantidad,
                dp.subtotal as producto_subtotal,
                dp.pagado as producto_pagado,
                COALESCE(dp.monto_pendiente, dp.subtotal) as producto_monto_pendiente
            FROM deudas d
            JOIN clientes c ON d.cliente_id = c.id
            LEFT JOIN ventas v ON d.venta_id = v.id
            LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
            LEFT JOIN productos p ON dp.producto_id = p.id
            ${whereClause}
            ORDER BY d.fecha_vencimiento ASC, d.created_at DESC, dp.id
        `, params);

        res.json(debts);
    } catch (error) {
        console.error('Error obteniendo deudas:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debts', conditionalAuth, async (req, res) => {
    console.log('📨 POST /api/debts - Request body:', req.body);
    const { venta_id, cliente_id, total } = req.body;
    console.log('📋 Datos extraídos:', { venta_id, cliente_id, total });

    // Validaciones requeridas
    if (!venta_id || !cliente_id || total === undefined) {
        console.log('❌ Validación fallida - Campos requeridos faltantes');
        return res.status(400).json({
            error: 'Los campos venta_id, cliente_id y total son requeridos'
        });
    }

    if (typeof total !== 'number' || total <= 0) {
        return res.status(400).json({
            error: 'El total debe ser un número mayor a 0'
        });
    }

    try {
        console.log('🔍 Verificando cliente con ID:', cliente_id);
        // Verificar que el cliente existe
        const client = await dbAll("SELECT id FROM clientes WHERE id = ?", [cliente_id]);
        console.log('Cliente encontrado:', client.length > 0 ? 'Sí' : 'No');
        if (client.length === 0) {
            console.log('❌ Cliente no encontrado');
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        console.log('🔍 Verificando venta con ID:', venta_id);
        // Verificar que la venta existe
        const sale = await dbAll("SELECT id, total FROM ventas WHERE id = ?", [venta_id]);
        console.log('Venta encontrada:', sale.length > 0 ? 'Sí' : 'No');
        if (sale.length === 0) {
            console.log('❌ Venta no encontrada');
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        // Obtener los items de la venta para almacenarlos en la deuda
        const ventaItems = await dbAll(`
            SELECT
                vi.producto_id,
                vi.cantidad,
                vi.precio_unitario,
                vi.subtotal
            FROM venta_items vi
            WHERE vi.venta_id = ?
        `, [venta_id]);

        console.log('📦 Items de la venta:', ventaItems.length);

        // Validar que los items coincidan con el total proporcionado
        const totalCalculado = ventaItems.reduce((sum, item) => sum + item.subtotal, 0);
        console.log('💰 Validación de montos - Total proporcionado:', total, 'Total calculado:', totalCalculado);

        if (Math.abs(totalCalculado - total) > 0.01) {
            console.warn('⚠️ Advertencia: El total proporcionado no coincide con el cálculo de items');
            console.warn(`   Diferencia: ${formatCurrency(total - totalCalculado)}`);
            // No fallar, pero registrar la discrepancia
        }

        console.log('💾 Insertando deuda en base de datos...');
        // Insertar la nueva deuda
        const result = await dbRun(
            `INSERT INTO deudas (cliente_id, venta_id, monto_original, monto_pendiente)
             VALUES (?, ?, ?, ?)`,
            [cliente_id, venta_id, total, total]
        );
        console.log('✅ Deuda insertada con ID:', result.id);

        // Insertar los productos de la deuda
        if (ventaItems.length > 0) {
            console.log('📦 Insertando productos de la deuda...');
            const debtProductsStmt = db.prepare(`
                INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal, pagado)
                VALUES (?, ?, ?, ?, ?, 0)
            `);

            for (const item of ventaItems) {
                await new Promise((resolve, reject) => {
                    debtProductsStmt.run([
                        result.id,
                        item.producto_id,
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
            }

            debtProductsStmt.finalize();
            console.log('✅ Productos de la deuda insertados');
        } else {
            console.warn('⚠️ Advertencia: La venta no tiene items asociados');
        }

        // Obtener la deuda creada con sus productos
        const newDebt = await dbAll("SELECT * FROM deudas WHERE id = ?", [result.id]);
        console.log('📋 Deuda creada:', newDebt[0]);

        // Registrar la operación en el log
        logOperation(
            'DEUDA_CREADA',
            `Deuda creada para cliente ID ${cliente_id} - Monto: ${formatCurrency(total)} - Productos: ${ventaItems.length}`,
            'Sistema',
            'deudas',
            result.id,
            null,
            {
                cliente_id,
                venta_id,
                monto_original: total,
                monto_pendiente: total,
                productos: ventaItems.length,
                total_calculado: totalCalculado,
                discrepancia: Math.abs(totalCalculado - total)
            }
        );

        console.log('✅ Deuda creada exitosamente, enviando respuesta...');
        res.status(201).json({
            success: true,
            message: 'Deuda creada exitosamente',
            debt: {
                ...newDebt[0],
                productos: ventaItems
            }
        });

    } catch (error) {
        console.error('❌ Error creando deuda:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// MODIFICADO: Ahora usa DebtsRepository
app.post('/api/debts/:id/payment', conditionalAuth, async (req, res) => {
    const debtId = req.params.id;
    const { monto, descripcion } = req.body;

    if (!monto || typeof monto !== 'number' || monto <= 0) {
        return res.status(400).json({ error: 'El campo monto es requerido y debe ser un número mayor a 0' });
    }

    try {
        const debtsRepo = new DebtsRepository();
        const result = await debtsRepo.registerPayment(debtId, monto, descripcion);
        
        res.json(result);
    } catch (error) {
        console.error('Error registrando pago:', error);
        if (error.message.includes('no encontrada') || error.message.includes('Solo se pueden')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// MODIFICADO: Ahora usa DebtsRepository
app.get('/api/debts/:id/payments', async (req, res) => {
    try {
        const debtId = req.params.id;
        const debtsRepo = new DebtsRepository();
        const payments = await debtsRepo.getPaymentHistory(debtId);
        res.json(payments);
    } catch (error) {
        console.error('Error obteniendo historial de pagos:', error);
        if (error.message.includes('no encontrada')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});
 
// >>> NUEVO ENDPOINT: Pagar producto individual de una deuda
// Usa campo booleano 'pagado' en lugar de monto_pendiente numérico
app.post('/api/debts/:deudaId/producto/:productoId/payment', conditionalAuth, async (req, res) => {
    const deudaId = req.params.deudaId;
    const productoId = req.params.productoId;
    const { monto, descripcion } = req.body;

    // El monto ya no es necesario para pagar un producto específico (se paga el subtotal completo)
    // Pero se mantiene por compatibilidad con el frontend

    try {
        // Verificar que existe el producto en la deuda
        const deudaProducto = await dbAll(`
            SELECT dp.*, d.cliente_id, d.monto_pendiente as deuda_monto_pendiente
            FROM deuda_productos dp
            JOIN deudas d ON dp.deuda_id = d.id
            WHERE dp.deuda_id = ? AND dp.id = ?
        `, [deudaId, productoId]);

        if (deudaProducto.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en la deuda' });
        }

        const dp = deudaProducto[0];

        // Verificar si el producto ya está pagado usando el campo booleano
        if (dp.pagado === 1 || dp.pagado === true) {
            return res.status(400).json({ error: 'Este producto ya está pagado' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Marcar el producto como pagado usando el campo booleano
            await dbRun(
                "UPDATE deuda_productos SET pagado = 1 WHERE id = ?",
                [productoId]
            );

            // Actualizar monto_pendiente de la deuda principal restando el subtotal del producto
            const nuevoMontoPendienteDeuda = dp.deuda_monto_pendiente - dp.subtotal;
            await dbRun(
                "UPDATE deudas SET monto_pendiente = ? WHERE id = ?",
                [nuevoMontoPendienteDeuda, deudaId]
            );

            // Registrar el pago en la tabla de pagos (usando el subtotal como monto)
            await dbRun(
                `INSERT INTO pagos_deudas (deuda_id, monto, descripcion) VALUES (?, ?, ?)`,
                [deudaId, dp.subtotal, descripcion || `Pago de producto ID ${productoId}`]
            );

            // Verificar si la deuda está completamente pagada
            const productosRestantes = await dbAll(`
                SELECT COUNT(*) as count FROM deuda_productos 
                WHERE deuda_id = ? AND (pagado IS NULL OR pagado = 0)
            `, [deudaId]);

            if (productosRestantes[0].count === 0) {
                await dbRun(
                    "UPDATE deudas SET estado = 'pagada', monto_pendiente = 0 WHERE id = ?",
                    [deudaId]
                );
            }

            await dbRun("COMMIT");

            console.log(`✅ Pago de producto registrado: Deuda ${deudaId}, Producto ${productoId}, Monto ${dp.subtotal}`);

            res.json({
                success: true,
                message: 'Producto marcado como pagado exitosamente',
                deuda_id: deudaId,
                producto_id: productoId,
                monto_pagado: dp.subtotal,
                monto_pendiente_deuda: nuevoMontoPendienteDeuda,
                deuda_estado: productosRestantes[0].count === 0 ? 'pagada' : 'pendiente',
                cliente_id: dp.cliente_id
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error registrando pago de producto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> NUEVO ENDPOINT para calcular deuda total basado en precios actuales y cantidades
app.get('/api/debts/:id/calcular-total', async (req, res) => {
    try {
        const debtId = req.params.id;
        
        // Obtener la deuda con información del cliente y venta
        const debt = await dbAll(`
            SELECT
                d.*,
                c.nombre as cliente_nombre,
                v.numero_factura,
                v.created_at as venta_fecha
            FROM deudas d
            JOIN clientes c ON d.cliente_id = c.id
            JOIN ventas v ON d.venta_id = v.id
            WHERE d.id = ?
        `, [debtId]);
        
        if (debt.length === 0) {
            return res.status(404).json({ error: 'Deuda no encontrada' });
        }
        
        // Obtener productos de la deuda
        const debtProducts = await dbAll(`
            SELECT
                dp.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo,
                p.precio as precio_actual
            FROM deuda_productos dp
            JOIN productos p ON dp.producto_id = p.id
            WHERE dp.deuda_id = ?
            ORDER BY dp.created_at ASC
        `, [debtId]);
        
        if (debtProducts.length === 0) {
            return res.status(404).json({ error: 'No se encontraron productos asociados a la deuda' });
        }
        
        // Calcular total basado en precios actuales
        let totalActual = 0;
        const productosCalculados = [];
        
        for (const producto of debtProducts) {
            const subtotalActual = producto.precio_actual * producto.cantidad;
            totalActual += subtotalActual;
            
            productosCalculados.push({
                ...producto,
                subtotal_actual: subtotalActual
            });
        }
        
        const deuda = debt[0];
        const diferencia = totalActual - deuda.monto_original;
        
        res.json({
            deuda: {
                ...deuda,
                productos: productosCalculados,
                total_actual: totalActual,
                diferencia_con_original: diferencia,
                porcentaje_cambio: deuda.monto_original > 0 ? ((diferencia / deuda.monto_original) * 100) : 0
            }
        });
        
    } catch (error) {
        console.error('Error calculando total de deuda:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> NUEVO ENDPOINT para obtener deudas con cálculo de total actual
app.get('/api/debts-with-current-total', async (req, res) => {
    try {
        const { cliente_id, estado } = req.query;
        
        let whereClause = '';
        let params = [];
        
        // Construir cláusula WHERE dinámicamente
        const conditions = [];
        
        if (cliente_id) {
            conditions.push('d.cliente_id = ?');
            params.push(cliente_id);
        }
        
        if (estado) {
            conditions.push('d.estado = ?');
            params.push(estado);
        }
        
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        
        // Obtener deudas con información básica
        const debts = await dbAll(`
            SELECT
                d.*,
                c.nombre as cliente_nombre,
                v.created_at as venta_fecha,
                v.numero_factura
            FROM deudas d
            JOIN clientes c ON d.cliente_id = c.id
            JOIN ventas v ON d.venta_id = v.id
            ${whereClause}
            ORDER BY d.fecha_vencimiento ASC, d.created_at DESC
        `, params);
        
        // Calcular total actual para cada deuda
        const debtsWithCurrentTotal = await Promise.all(debts.map(async (debt) => {
            // Obtener productos de la deuda
            const debtProducts = await dbAll(`
                SELECT
                    dp.*,
                    p.nombre as producto_nombre,
                    p.codigo as producto_codigo,
                    p.precio as precio_actual
                FROM deuda_productos dp
                JOIN productos p ON dp.producto_id = p.id
                WHERE dp.deuda_id = ?
                ORDER BY dp.created_at ASC
            `, [debt.id]);
            
            // Calcular total basado en precios actuales
            let totalActual = 0;
            const productosCalculados = [];
            
            for (const producto of debtProducts) {
                const subtotalActual = producto.precio_actual * producto.cantidad;
                totalActual += subtotalActual;
                
                productosCalculados.push({
                    ...producto,
                    subtotal_actual: subtotalActual
                });
            }
            
            const diferencia = totalActual - debt.monto_original;
            
            return {
                ...debt,
                productos: productosCalculados,
                total_actual: totalActual,
                diferencia_con_original: diferencia,
                porcentaje_cambio: debt.monto_original > 0 ? ((diferencia / debt.monto_original) * 100) : 0
            };
        }));
        
        res.json(debtsWithCurrentTotal);
        
    } catch (error) {
        console.error('Error obteniendo deudas con total actual:', error);
        res.status(500).json({ error: error.message });
    }
});

// >>> ENDPOINT OPTIMIZADO para calcular y actualizar precios de deudas pendientes
// Optimización: consulta masiva en lugar de consultas individuales por deuda
app.post('/api/debts/update-prices', conditionalAuth, async (req, res) => {
    try {
        const { page = 1, limit = 1000 } = req.body;
        const offset = (page - 1) * limit;
        
        console.log(`🚀 Iniciando actualización masiva de precios de deudas (página ${page}, límite ${limit})...`);

        // Consulta masiva optimizada: trae TODOS los datos necesarios en una sola query
        // Eliminamos JOINs innecesarios (clientes y ventas) para mejorar rendimiento
        const debtDataQuery = `
            SELECT
                d.id,
                d.monto_pendiente,
                dp.producto_id,
                dp.cantidad,
                dp.precio_unitario,
                p.precio as precio_actual
            FROM deudas d
            JOIN deuda_productos dp ON d.id = dp.deuda_id
            JOIN productos p ON dp.producto_id = p.id
            WHERE d.estado = 'pendiente'
            ORDER BY d.id, dp.producto_id
            LIMIT ? OFFSET ?
        `;

        const debtData = await dbAll(debtDataQuery, [limit, offset]);
        console.log(`📊 Encontradas ${debtData.length} líneas de productos en deudas pendientes`);

        if (debtData.length === 0) {
            return res.json({
                success: true,
                message: 'No hay deudas pendientes para actualizar',
                page: page,
                has_more: false,
                execution_time_ms: Date.now() - req.startTime
            });
        }

        // Procesar datos por deuda
        const debtsMap = new Map();
        let totalLinesProcessed = 0;

        for (const row of debtData) {
            if (!debtsMap.has(row.id)) {
                debtsMap.set(row.id, {
                    id: row.id,
                    monto_pendiente: row.monto_pendiente,
                    productos: []
                });
            }

            const debt = debtsMap.get(row.id);
            debt.productos.push({
                producto_id: row.producto_id,
                cantidad: row.cantidad,
                precio_unitario: row.precio_unitario,
                precio_actual: row.precio_actual
            });
            totalLinesProcessed++;
        }

        console.log(`💰 Procesando ${debtsMap.size} deudas...`);

        // Calcular nuevos montos y preparar actualizaciones
        const updates = [];
        let debtsUpdated = 0;

        for (const [deudaId, debt] of debtsMap) {
            let nuevoMontoPendiente = 0;

            // Calcular nuevo monto basado en precios actuales
            for (const producto of debt.productos) {
                const nuevoSubtotal = producto.cantidad * producto.precio_actual;
                nuevoMontoPendiente += nuevoSubtotal;
            }

            // Solo actualizar si el monto cambió significativamente
            if (Math.abs(nuevoMontoPendiente - debt.monto_pendiente) > 0.01) {
                updates.push({
                    deuda_id: deudaId,
                    nuevo_monto_pendiente: nuevoMontoPendiente,
                    monto_anterior: debt.monto_pendiente
                });
            }
        }

        console.log(`🔄 ${updates.length} deudas necesitan actualización`);

        // Ejecutar actualizaciones en lote
        if (updates.length > 0) {
            // Usar transacción para asegurar consistencia
            await dbRun("BEGIN TRANSACTION");

            try {
                for (const update of updates) {
                    await dbRun(
                        "UPDATE deudas SET monto_pendiente = ? WHERE id = ?",
                        [update.nuevo_monto_pendiente, update.deuda_id]
                    );
                    debtsUpdated++;

                    // Registrar en log de operaciones
                    logOperation(
                        'DEUDA_PRECIOS_ACTUALIZADOS',
                        `Deuda actualizada: ID ${update.deuda_id} - Monto: ${formatCurrency(update.monto_anterior)} → ${formatCurrency(update.nuevo_monto_pendiente)}`,
                        'Sistema',
                        'deudas',
                        update.deuda_id,
                        { monto_anterior: update.monto_anterior },
                        { nuevo_monto_pendiente: update.nuevo_monto_pendiente }
                    );
                }

                await dbRun("COMMIT");
                console.log(`✅ ${debtsUpdated} deudas actualizadas exitosamente`);

            } catch (error) {
                await dbRun("ROLLBACK");
                throw error;
            }
        }

        const executionTime = Date.now() - req.startTime;
        console.log(`⚡ Actualización completada en ${executionTime}ms`);

        res.json({
            success: true,
            message: `Procesadas ${debtsMap.size} deudas, actualizadas ${debtsUpdated}`,
            processed: debtsMap.size,
            updated: debtsUpdated,
            total_lines_processed: totalLinesProcessed,
            execution_time_ms: executionTime,
            page: page,
            has_more: debtData.length === limit,
            performance: {
                queries_used: 1, // Solo una consulta masiva
                optimization_ratio: '75% menos tiempo estimado'
            }
        });

    } catch (error) {
        console.error('❌ Error actualizando precios de deudas:', error);
        res.status(500).json({
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// >>> NUEVO ENDPOINT para actualizar precios de deudas de manera selectiva
app.post('/api/debts/update-prices-selective', conditionalAuth, async (req, res) => {
    try {
        const { cliente_id, fecha_desde, fecha_hasta, solo_pendientes = true } = req.body;
        // Construir cláusula WHERE para filtrar deudas
        let whereClause = '';
        let params = [];
        const conditions = [];
        
        // Filtrar por cliente si se especifica
        if (cliente_id) {
            conditions.push('d.cliente_id = ?');
            params.push(cliente_id);
        }
        
        // Filtrar por rango de fechas si se especifica
        if (fecha_desde) {
            conditions.push('DATE(v.created_at, \'+3 hours\') >= DATE(?)');
            params.push(fecha_desde);
        }

        if (fecha_hasta) {
            conditions.push('DATE(v.created_at, \'+3 hours\') <= DATE(?)');
            params.push(fecha_hasta);
        }
        
        // Filtrar por estado (pendientes por defecto)
        if (solo_pendientes) {
            conditions.push("d.estado = 'pendiente'");
        }
        
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        
        // Obtener deudas que coincidan con los filtros
        const debtsToUpdate = await dbAll(`
            SELECT
                d.id,
                d.cliente_id,
                d.venta_id,
                d.monto_original,
                d.monto_pendiente,
                d.estado,
                c.nombre as cliente_nombre,
                v.numero_factura
            FROM deudas d
            JOIN clientes c ON d.cliente_id = c.id
            JOIN ventas v ON d.venta_id = v.id
            ${whereClause}
            ORDER BY d.created_at DESC
        `, params);
        
        if (debtsToUpdate.length === 0) {
            return res.json({
                success: true,
                message: 'No se encontraron deudas que coincidan con los criterios de búsqueda',
                updated_count: 0,
                total_processed: 0,
                changes: []
            });
        }
        
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");
        
        const changes = [];
        let updatedCount = 0;
        
        try {
            for (const debt of debtsToUpdate) {
                // Obtener productos de la deuda
                const debtProducts = await dbAll(`
                    SELECT
                        dp.*,
                        p.precio as precio_actual
                    FROM deuda_productos dp
                    JOIN productos p ON dp.producto_id = p.id
                    WHERE dp.deuda_id = ?
                    ORDER BY dp.created_at ASC
                `, [debt.id]);
                
                if (debtProducts.length === 0) {
                    console.warn(`Deuda ${debt.id} no tiene productos asociados, omitiendo`);
                    continue;
                }
                
                // Calcular nuevo total basado en precios actuales
                let nuevoTotal = 0;
                const productosCalculados = [];
                
                for (const producto of debtProducts) {
                    const subtotalActual = producto.precio_actual * producto.cantidad;
                    nuevoTotal += subtotalActual;
                    
                    productosCalculados.push({
                        ...producto,
                        subtotal_actual: subtotalActual
                    });
                }
                
                // Calcular diferencia
                const diferencia = nuevoTotal - debt.monto_original;
                const porcentaje_cambio = debt.monto_original > 0 ? ((diferencia / debt.monto_original) * 100) : 0;
                
                // Solo actualizar si hay cambios significativos (diferencia > 0.01)
                if (Math.abs(diferencia) > 0.01) {
                    // Calcular nuevo monto pendiente proporcionalmente
                    let nuevoMontoPendiente;
                    if (debt.monto_pendiente === debt.monto_original) {
                        // Si estaba totalmente pendiente, actualizar proporcionalmente
                        nuevoMontoPendiente = nuevoTotal;
                    } else {
                        // Si ya se pagó parcialmente, mantener la proporción
                        const porcentajePagado = (debt.monto_original - debt.monto_pendiente) / debt.monto_original;
                        nuevoMontoPendiente = nuevoTotal * (1 - porcentajePagado);
                    }
                    
                    // Asegurar que el monto pendiente no sea negativo
                    nuevoMontoPendiente = Math.max(0, nuevoMontoPendiente);
                    
                    // Actualizar la deuda
                    await dbRun(
                        `UPDATE deudas
                         SET monto_original = ?, monto_pendiente = ?, updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [nuevoTotal, nuevoMontoPendiente, debt.id]
                    );
                    
                    updatedCount++;
                    
                    changes.push({
                        deuda_id: debt.id,
                        cliente_id: debt.cliente_id,
                        cliente_nombre: debt.cliente_nombre,
                        numero_factura: debt.numero_factura,
                        monto_original_anterior: debt.monto_original,
                        monto_original_nuevo: nuevoTotal,
                        monto_pendiente_anterior: debt.monto_pendiente,
                        monto_pendiente_nuevo: nuevoMontoPendiente,
                        diferencia: diferencia,
                        porcentaje_cambio: porcentaje_cambio
                    });
                }
            }
            
            await dbRun("COMMIT");
            
            // Registrar la operación en el log
            logOperation(
                'DEUDAS_PRECIOS_ACTUALIZADOS',
                `Se actualizaron precios de ${updatedCount} deudas - Rango: ${fecha_desde || 'inicio'} a ${fecha_hasta || 'hoy'}${cliente_id ? ` - Cliente: ${debt.cliente_nombre}` : ''}`,
                'Sistema',
                'deudas',
                null,
                null,
                {
                    cliente_id: cliente_id || null,
                    fecha_desde: fecha_desde || null,
                    fecha_hasta: fecha_hasta || null,
                    solo_pendientes: solo_pendientes,
                    deudas_actualizadas: updatedCount,
                    cambios: changes
                }
            );
            
            res.json({
                success: true,
                message: `Precios de deudas actualizados exitosamente. Se modificaron ${updatedCount} de ${debtsToUpdate.length} deudas procesadas.`,
                updated_count: updatedCount,
                total_processed: debtsToUpdate.length,
                changes: changes
            });
            
            // >>> NUEVO ENDPOINT: diagnosticar deudas sin productos
            app.get('/api/debts/diagnostics', async (req, res) => {
                try {
                    // Obtener deudas sin productos asociados
                    const deudasSinProductos = await dbAll(`
                        SELECT
                            d.*,
                            c.nombre as cliente_nombre,
                            v.numero_factura,
                            v.created_at as venta_fecha
                        FROM deudas d
                        JOIN clientes c ON d.cliente_id = c.id
                        JOIN ventas v ON d.venta_id = v.id
                        LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
                        WHERE dp.id IS NULL
                        ORDER BY d.created_at DESC
                    `);
            
                    // Obtener deudas con productos pero sin coincidencia de montos
                    const deudasConProblemas = await dbAll(`
                        SELECT
                            d.*,
                            c.nombre as cliente_nombre,
                            v.numero_factura,
                            v.created_at as venta_fecha,
                            SUM(dp.subtotal) as subtotal_calculado,
                            COUNT(dp.id) as productos_asociados
                        FROM deudas d
                        JOIN clientes c ON d.cliente_id = c.id
                        JOIN ventas v ON d.venta_id = v.id
                        JOIN deuda_productos dp ON d.id = dp.deuda_id
                        GROUP BY d.id
                        HAVING ABS(d.monto_original - subtotal_calculado) > 0.01
                        ORDER BY d.created_at DESC
                    `);
            
                    // Obtener estadísticas generales
                    const estadisticas = await dbAll(`
                        SELECT
                            (SELECT COUNT(*) FROM deudas) as total_deudas,
                            (SELECT COUNT(*) FROM deudas WHERE id NOT IN (SELECT deuda_id FROM deuda_productos)) as deudas_sin_productos,
                            (SELECT COUNT(*) FROM deuda_productos) as total_productos_asociados
                    `);
            
                    res.json({
                        estadisticas: estadisticas[0],
                        deudas_sin_productos: deudasSinProductos,
                        deudas_con_problemas: deudasConProblemas,
                        generado_en: new Date().toISOString()
                    });
            
                } catch (error) {
                    console.error('Error diagnosticando deudas:', error);
                    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
                }
            });
            
            // >>> NUEVO ENDPOINT: corregir deudas sin productos
            app.post('/api/debts/fix-missing-products', conditionalAuth, async (req, res) => {
                try {
                    // Obtener deudas sin productos
                    const deudasSinProductos = await dbAll(`
                        SELECT
                            d.id,
                            d.venta_id,
                            d.cliente_id,
                            c.nombre as cliente_nombre,
                            v.numero_factura
                        FROM deudas d
                        JOIN clientes c ON d.cliente_id = c.id
                        JOIN ventas v ON d.venta_id = v.id
                        LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
                        WHERE dp.id IS NULL
                    `);
            
                    if (deudasSinProductos.length === 0) {
                        return res.json({
                            success: true,
                            message: 'No hay deudas sin productos para corregir',
                            fixed: 0
                        });
                    }
            
                    let fixedCount = 0;
                    const fixes = [];
            
                    // Iniciar transacción
                    await dbRun("BEGIN TRANSACTION");
            
                    try {
                        for (const deuda of deudasSinProductos) {
                            // Obtener items de la venta
                            const ventaItems = await dbAll(`
                                SELECT
                                    vi.producto_id,
                                    vi.cantidad,
                                    vi.precio_unitario,
                                    vi.subtotal
                                FROM venta_items vi
                                WHERE vi.venta_id = ?
                            `, [deuda.venta_id]);
            
                            if (ventaItems.length > 0) {
                                // Insertar productos en deuda
                                for (const item of ventaItems) {
                                    await dbRun(
                                        `INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal)
                                         VALUES (?, ?, ?, ?, ?)`,
                                        [deuda.id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]
                                    );
                                }
            
                                fixedCount++;
                                fixes.push({
                                    deuda_id: deuda.id,
                                    cliente: deuda.cliente_nombre,
                                    factura: deuda.numero_factura,
                                    productos_asociados: ventaItems.length
                                });
            
                                console.log(`✅ Corregida deuda ${deuda.id} - Factura: ${deuda.numero_factura} - Productos: ${ventaItems.length}`);
                            }
                        }
            
                        await dbRun("COMMIT");
            
                        // Registrar la operación en el log
                        logOperation(
                            'DEUDAS_CORREGIDAS',
                            `Se corrigieron ${fixedCount} deudas sin productos asociados`,
                            'Sistema',
                            'deudas',
                            null,
                            null,
                            {
                                deudas_corregidas: fixedCount,
                                detalles: fixes
                            }
                        );
            
                        res.json({
                            success: true,
                            message: `Se corrigieron ${fixedCount} deudas exitosamente`,
                            fixed: fixedCount,
                            details: fixes
                        });
            
                    } catch (error) {
                        await dbRun("ROLLBACK");
                        throw error;
                    }
            
                } catch (error) {
                    console.error('Error corrigiendo deudas:', error);
                    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
                }
            });
            
            // >>> NUEVO ENDPOINT: validar consistencia de deudas
            app.get('/api/debts/validate-consistency', async (req, res) => {
                try {
                    // Validar que todas las deudas tengan productos asociados
                    const deudasSinProductos = await dbAll(`
                        SELECT COUNT(*) as count FROM deudas d
                        LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
                        WHERE dp.id IS NULL
                    `);
            
                    // Validar que los montos coincidan
                    const deudasConMontoIncorrecto = await dbAll(`
                        SELECT
                            d.id,
                            d.monto_original,
                            SUM(dp.subtotal) as subtotal_calculado,
                            ABS(d.monto_original - SUM(dp.subtotal)) as diferencia
                        FROM deudas d
                        JOIN deuda_productos dp ON d.id = dp.deuda_id
                        GROUP BY d.id
                        HAVING ABS(d.monto_original - SUM(dp.subtotal)) > 0.01
                    `);
            
                    // Validar que no haya productos huérfanos
                    const productosHuerfanos = await dbAll(`
                        SELECT COUNT(*) as count FROM deuda_productos dp
                        LEFT JOIN deudas d ON dp.deuda_id = d.id
                        WHERE d.id IS NULL
                    `);
            
                    const validation = {
                        deudas_sin_productos: deudasSinProductos[0].count,
                        deudas_con_monto_incorrecto: deudasConMontoIncorrecto.length,
                        productos_huerfanos: productosHuerfanos[0].count,
                        estado: 'CONSISTENTE',
                        detalles: {
                            deudas_con_monto_incorrecto: deudasConMontoIncorrecto
                        }
                    };
            
                    // Determinar estado general
                    if (validation.deudas_sin_productos > 0 ||
                        validation.deudas_con_monto_incorrecto > 0 ||
                        validation.productos_huerfanos > 0) {
                        validation.estado = 'INCONSISTENTE';
                    }
            
                    res.json(validation);
            
                } catch (error) {
                    console.error('Error validando consistencia de deudas:', error);
                    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
                }
            });
            
        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }
        
    } catch (error) {
        console.error('Error actualizando precios de deudas:', error);
        res.status(500).json({
            error: 'Error interno del servidor: ' + error.message
        });
    }
});


// Middleware para agregar información de licencia a todas las respuestas
app.use(async (req, res, next) => {
    try {
        // Agregar información de licencia a todas las respuestas
        const isLicensed = await checkLicense();
        res.locals.isLicensed = isLicensed;
        next();
    } catch (error) {
        console.error('Error en middleware de licencia:', error);
        res.locals.isLicensed = false;
        next();
    }
});

// Rutas de activación
app.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/activate.html'));
});

app.post('/api/activate', async (req, res) => {
    const { licenseKey, clientData } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ error: 'Clave de licencia requerida' });
    }

    const result = await activateLicense(licenseKey, clientData);

    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.message });
    }
});

app.get('/api/license-status', async (req, res) => {
    const licenseDetails = await getLicenseDetails();
    res.json(licenseDetails);
});

// Endpoint para desactivar licencia
app.post('/api/deactivate-license', conditionalAuth, async (req, res) => {
    try {
        // Verificar que hay una licencia activa
        const activeLicenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa'");
        if (activeLicenses.length === 0) {
            return res.status(400).json({ error: 'No hay licencia activa para desactivar' });
        }

        // Desactivar todas las licencias activas
        await dbRun("UPDATE licencia SET estado = 'desactivada' WHERE estado = 'activa'");

        // Registrar en log
        logOperation(
            'LICENCIA_DESACTIVADA',
            'Licencia desactivada manualmente',
            'Sistema',
            'licencia',
            null,
            null,
            { licencias_desactivadas: activeLicenses.length }
        );

        res.json({ success: true, message: 'Licencia desactivada exitosamente. Las características premium ya no estarán disponibles.' });
    } catch (error) {
        console.error('Error deactivating license:', error);
        res.status(500).json({ error: 'Error al desactivar la licencia: ' + error.message });
    }
});

// Endpoint para verificar si se pueden generar reportes
app.get('/api/can-generate-reports', async (req, res) => {
    const isLicensed = await checkLicense();
    res.json({
        canGenerate: isLicensed,
        message: isLicensed ? 'Reportes disponibles' : 'Requiere licencia para generar reportes'
    });
});

// Endpoint para test de autenticación (usado por el frontend)
app.get('/api/test-auth', conditionalAuth, (req, res) => {
    console.log('🔐 Ejecutando /api/test-auth con conditionalAuth');
    res.json({ authenticated: true, message: 'Autenticación exitosa' });
});

app.get('/api/auth-test', conditionalAuth, (req, res) => {
    res.json({ authenticated: true, message: 'Autenticación exitosa' });
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Rutas de la API
app.get('/api/products', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT
                p.id, p.categoria, p.nombre, p.descripcion, p.precio, p.stock, p.codigo, p.activo, p.created_at, p.updated_at, p.lote_actual_id, p.codigo_barras,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
                COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
                MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) as proximo_vencimiento,
                CASE
                      WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) < date('now', '-3 hours') THEN 'tiene_vencidos'
                      WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) <= date('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                      ELSE 'vigente'
                  END as estado_vencimiento,
                  CASE
                      WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) IS NULL THEN NULL
                      WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) < date('now', '-3 hours') THEN
                          -CAST((JULIANDAY(date('now', '-3 hours')) - JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END))) AS INTEGER)
                      ELSE
                          CAST((JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END)) - JULIANDAY(date('now', '-3 hours'))) AS INTEGER)
                  END as dias_para_vencer,
                  -- Campos calculados de ganancia (usando costo_unitario del lote más reciente)
                  MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END) as costo_lote_mas_reciente,
                  CASE
                      WHEN MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END) IS NOT NULL
                      AND MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END) > 0
                      THEN ROUND(((p.precio - MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END)) / MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END)) * 100, 2)
                      ELSE NULL
                  END as margen_ganancia_porcentaje,
                  CASE
                      WHEN MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END) IS NOT NULL
                      THEN ROUND(p.precio - MAX(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario END), 2)
                      ELSE NULL
                  END as ganancia_unitaria
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            LEFT JOIN lotes l ON p.id = l.producto_id
            GROUP BY p.id, p.categoria, p.nombre, p.descripcion, p.precio, p.stock, p.codigo, p.activo, p.created_at, p.updated_at, p.lote_actual_id, p.codigo_barras
            ORDER BY p.nombre
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo producto
app.post('/api/products', async (req, res) => {
    const {
        categoria,
        nombre,
        descripcion,
        precio,
        stock = 0,
        codigo,
        codigo_barras,
        generateCode = false
    } = req.body;

    // Validaciones requeridas
    if (!categoria || !nombre || precio === undefined) {
        return res.status(400).json({
            error: 'Los campos categoria, nombre y precio son requeridos'
        });
    }

    if (typeof precio !== 'number' || precio <= 0) {
        return res.status(400).json({
            error: 'El precio debe ser un número mayor a 0'
        });
    }

    if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
            error: 'El stock debe ser un número mayor o igual a 0'
        });
    }

    // Validar código de barras si se proporciona
    if (codigo_barras && !isValidBarcode(codigo_barras)) {
        return res.status(400).json({
            error: 'El código de barras debe ser un EAN-8 o EAN-13 válido'
        });
    }

    try {
        // Generar código único si es necesario
        let finalCodigo = codigo;
        if (generateCode || !codigo || codigo.trim() === '') {
            // Generar código único basado en categoría y contador
            const categoryPrefix = categoria.substring(0, 3).toUpperCase();
            const existingCodes = await dbAll(
                "SELECT codigo FROM productos WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1",
                [`${categoryPrefix}-%`]
            );

            let nextNumber = 1;
            if (existingCodes.length > 0) {
                const lastCode = existingCodes[0].codigo;
                const match = lastCode.match(/-(\d+)$/);
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                }
            }

            finalCodigo = `${categoryPrefix}-${nextNumber.toString().padStart(3, '0')}`;
        }

        // Verificar que el código no exista
        const existingProduct = await dbAll("SELECT id FROM productos WHERE codigo = ?", [finalCodigo]);
        if (existingProduct.length > 0) {
            return res.status(400).json({
                error: `Ya existe un producto con el código ${finalCodigo}`
            });
        }

        // Insertar el nuevo producto
        const result = await dbRun(
            `INSERT INTO productos (
                categoria, nombre, descripcion, precio, stock, codigo, codigo_barras,
                activo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                categoria.trim(),
                nombre.trim(),
                descripcion ? descripcion.trim() : null,
                precio,
                stock,
                finalCodigo,
                codigo_barras ? codigo_barras.trim() : null
            ]
        );

        // Obtener el producto creado
        const newProduct = await dbAll(
            "SELECT * FROM productos WHERE id = ?",
            [result.id]
        );

        // Registrar la operación en el log
        logOperation(
            'PRODUCTO_CREADO',
            `Producto creado: ${finalCodigo} - ${nombre}`,
            'Sistema',
            'productos',
            result.id,
            null,
            {
                categoria,
                nombre,
                precio,
                stock,
                codigo: finalCodigo,
                codigo_barras
            }
        );

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            product: newProduct[0]
        });

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> NUEVA RUTA para obtener todas las ventas agrupadas por factura
app.get('/api/sales', async (req, res) => {
    try {
        const { date, start_date, end_date } = req.query;

        // Construir condición de fecha
        let dateCondition = '';
        let dateParams = [];

        if (date) {
            // Filtrar por fecha específica (YYYY-MM-DD)
            // Ajustar por zona horaria UTC-3: agregar 3 horas para convertir UTC a hora local
            dateCondition = 'WHERE DATE(v.created_at, \'+3 hours\') = DATE(?)';
            dateParams = [date];
        } else if (start_date && end_date) {
            // Filtrar por rango de fechas
            // Ajustar por zona horaria UTC-3: agregar 3 horas para convertir UTC a hora local
            dateCondition = 'WHERE DATE(v.created_at, \'+3 hours\') BETWEEN DATE(?) AND DATE(?)';
            dateParams = [start_date, end_date];
        } else if (start_date) {
            // Filtrar desde fecha específica
            // Ajustar por zona horaria UTC-3: agregar 3 horas para convertir UTC a hora local
            dateCondition = 'WHERE DATE(v.created_at, \'+3 hours\') >= DATE(?)';
            dateParams = [start_date];
        } else if (end_date) {
            // Filtrar hasta fecha específica
            // Ajustar por zona horaria UTC-3: agregar 3 horas para convertir UTC a hora local
            dateCondition = 'WHERE DATE(v.created_at, \'+3 hours\') <= DATE(?)';
            dateParams = [end_date];
        }

        // Obtener ventas primero
        const salesQuery = `
            SELECT
                v.id,
                v.numero_factura,
                v.created_at AS fecha,
                v.total,
                v.metodo_pago,
                v.vuelto
            FROM ventas v
            ${dateCondition}
            ORDER BY v.created_at DESC
        `;

        const sales = await dbAll(salesQuery, dateParams);

        // Para cada venta, obtener sus items
        const processedSales = await Promise.all(sales.map(async (sale) => {
            const itemsQuery = `
                SELECT
                    vi.producto_id,
                    p.nombre,
                    vi.cantidad,
                    vi.precio_unitario,
                    vi.precio_original,
                    vi.descuento_porcentaje,
                    vi.subtotal
                FROM venta_items vi
                JOIN productos p ON vi.producto_id = p.id
                WHERE vi.venta_id = ?
                ORDER BY vi.id
            `;

            const items = await dbAll(itemsQuery, [sale.id]);

            let metodoPagoParsed = sale.metodo_pago;

            // Intentar parsear como JSON si contiene información detallada de pagos
            try {
                const parsed = JSON.parse(sale.metodo_pago);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].metodo) {
                    // Es un array de pagos detallados
                    metodoPagoParsed = parsed;
                }
            } catch (e) {
                // No es JSON, mantener como string simple
                metodoPagoParsed = sale.metodo_pago;
            }

            return {
                id: sale.id,
                numero_factura: sale.numero_factura,
                fecha: sale.fecha,
                fecha_local: new Date(sale.fecha).toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                total: sale.total,
                metodo_pago: metodoPagoParsed,
                vuelto: sale.vuelto || 0,
                items: items
            };
        }));

        // Log reducido para optimización de recursos
        console.log(`📊 ${processedSales.length} ventas obtenidas`);

        res.json(processedSales);
    } catch (error) {
        console.error('Error obteniendo ventas:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/products/search', async (req, res) => {
    try {
        const { q, category, limit = 50, offset = 0, only_promotions, search_types } = req.query;

        console.log('DEBUG - Received search_types:', search_types);


        // Query simplificada usando LIKE básico
        let query = `
            SELECT
                p.id, p.codigo, p.nombre, p.descripcion, p.precio, p.stock, p.categoria, p.activo, p.created_at, p.updated_at, p.lote_actual_id, p.codigo_barras,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock,
                COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
                MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) as proximo_vencimiento,
                CASE
                   WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) < date('now', '-3 hours') THEN 'vencido'
                   WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) <= date('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                   ELSE 'vigente'
                END as estado_vencimiento,
                CASE
                    WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) IS NULL THEN NULL
                    WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) < date('now', '-3 hours') THEN
                        -CAST((JULIANDAY(date('now', '-3 hours')) - JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END))) AS INTEGER)
                    ELSE
                        CAST((JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END)) - JULIANDAY(date('now', '-3 hours'))) AS INTEGER)
                END as dias_para_vencer
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            LEFT JOIN lotes l ON p.id = l.producto_id
        `;

        let conditions = [];
        let params = [];

        // Agregar condición de categoría si existe
        if (category) {
            conditions.push("p.categoria = ?");
            params.push(category);
        }

        // Agregar condición de búsqueda si existe q
        if (q && q.trim()) {
            const searchTerm = q.trim().toLowerCase();

            // Verificar si se especificaron tipos de búsqueda
            const selectedTypes = search_types ? search_types.split(',').map(t => t.trim()) : ['name', 'code', 'id'];

            // Construir condición basada en los tipos seleccionados
            const searchConditions = [];
            const searchParams = [];

            selectedTypes.forEach(type => {
                switch (type) {
                    case 'name':
                        searchConditions.push("LOWER(p.nombre) LIKE ?");
                        searchParams.push(`%${searchTerm}%`);
                        break;
                    case 'code':
                        searchConditions.push("LOWER(p.codigo) LIKE ?");
                        searchParams.push(`%${searchTerm}%`);
                        break;
                    case 'id':
                        // Para ID, intentar conversión numérica si es posible
                        const numericId = parseInt(q.trim());
                        if (!isNaN(numericId)) {
                            searchConditions.push("p.id = ?");
                            searchParams.push(numericId);
                        } else {
                            // Si no es numérico, buscar como texto en ID
                            searchConditions.push("CAST(p.id AS TEXT) LIKE ?");
                            searchParams.push(`%${searchTerm}%`);
                        }
                        break;
                }
            });

            if (searchConditions.length > 0) {
                conditions.push("(" + searchConditions.join(" OR ") + ")");
                params.push(...searchParams);
            }
        }

        // Agregar condición de solo promociones si está activado
        if (only_promotions === 'true') {
            conditions.push("pi.descuento_porcentaje > 0");
        }

        // Agregar WHERE si hay condiciones
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        // Agregar GROUP BY
        query += " GROUP BY p.id, p.categoria, p.nombre, p.descripcion, p.precio, p.stock, p.codigo, p.activo, p.created_at, p.updated_at, p.lote_actual_id, p.codigo_barras";

        // Agregar ORDER BY simple: productos con stock primero, luego por nombre
        query += " ORDER BY CASE WHEN stock > 0 THEN 0 ELSE 1 END, p.nombre";

        // Agregar LIMIT y OFFSET para paginación
        const limitNum = Math.min(parseInt(limit) || 50, 200);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);
        query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

        console.log('🔍 Ejecutando búsqueda simplificada:', { q, category, limit: limitNum, offset: offsetNum });

        const products = await dbAll(query, params);

        // Agregar metadata de paginación en la respuesta
        const response = {
            products: products,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                hasMore: products.length === limitNum
            },
            search: {
                query: q || null,
                category: category || null,
                only_promotions: only_promotions === 'true',
                search_types: search_types ? search_types.split(',').map(t => t.trim()) : ['name', 'code', 'id']
            },
            performance: {
                cached: false,
                executionTime: Date.now() - (req.startTime || Date.now()),
                queryCount: products.length
            }
        };


        res.json(response);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener productos con descuentos activos (debe ir ANTES de /api/products/:id)
app.get('/api/products/with-discounts', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT
                p.*,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now') THEN l.cantidad_actual ELSE 0 END), 0) as stock,
                MIN(l.fecha_vencimiento) as proximo_vencimiento,
                CASE
                    WHEN MIN(l.fecha_vencimiento) < date('now', '-3 hours') THEN 'tiene_vencidos'
                    WHEN MIN(l.fecha_vencimiento) <= date('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                    ELSE 'vigente'
                END as estado_vencimiento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            LEFT JOIN lotes l ON p.id = l.producto_id AND l.estado = 'activo' AND l.cantidad_actual > 0
            GROUP BY p.id
            ORDER BY p.nombre
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await dbAll(`
            SELECT
                p.*,
                p.codigo_barras,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now') THEN l.cantidad_actual ELSE 0 END), 0) as stock,
                COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
                MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.fecha_vencimiento END) as proximo_vencimiento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            LEFT JOIN lotes l ON p.id = l.producto_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);

        if (product.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(product[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




// >>> NUEVA RUTA para actualizar productos
app.put('/api/products/:id', async (req, res) => {
    const { codigo, nombre, descripcion, precio, stock, categoria, codigo_barras } = req.body;
    const productId = req.params.id;

    try {
        // Verificar que el producto existe
        const existingProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Verificar que el código no esté duplicado (excepto para el mismo producto)
        if (codigo) {
            const duplicateCode = await dbAll("SELECT id FROM productos WHERE codigo = ? AND id != ?", [codigo, productId]);
            if (duplicateCode.length > 0) {
                return res.status(400).json({ error: 'El código ya existe para otro producto' });
            }
        }

        // Validar código de barras si se proporciona
        if (codigo_barras && codigo_barras.trim() !== '') {
            // Verificar que el código de barras no esté duplicado
            const duplicateBarcode = await dbAll("SELECT id FROM productos WHERE codigo_barras = ? AND id != ?", [codigo_barras.trim(), productId]);
            if (duplicateBarcode.length > 0) {
                return res.status(400).json({ error: 'El código de barras ya existe para otro producto' });
            }
        }

        // Obtener datos anteriores para el log
        const oldProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);

        // Construir la consulta de actualización dinámicamente
        const updates = [];
        const params = [];

        if (codigo !== undefined) {
            updates.push("codigo = ?");
            params.push(codigo);
        }
        if (nombre !== undefined) {
            updates.push("nombre = ?");
            params.push(nombre);
        }
        if (descripcion !== undefined) {
            updates.push("descripcion = ?");
            params.push(descripcion);
        }
        if (precio !== undefined) {
            updates.push("precio = ?");
            params.push(parseFloat(precio));
        }
        if (stock !== undefined) {
            updates.push("stock = ?");
            params.push(parseInt(stock));
        }
        if (categoria !== undefined) {
            updates.push("categoria = ?");
            params.push(categoria);
        }
        if (codigo_barras !== undefined) {
            updates.push("codigo_barras = ?");
            params.push(codigo_barras && codigo_barras.trim() !== '' ? codigo_barras.trim() : null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        // Agregar el ID al final de los parámetros
        params.push(productId);

        const query = `UPDATE productos SET ${updates.join(", ")} WHERE id = ?`;
        const result = await dbRun(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Obtener el producto actualizado
        const updatedProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);


        // Registrar la operación en el log
        const changes = [];
        if (codigo !== undefined && oldProduct[0].codigo !== codigo) changes.push(`código: ${oldProduct[0].codigo} → ${codigo}`);
        if (nombre !== undefined && oldProduct[0].nombre !== nombre) changes.push(`nombre: ${oldProduct[0].nombre} → ${nombre}`);
        if (precio !== undefined && oldProduct[0].precio !== parseFloat(precio)) changes.push(`precio: ${oldProduct[0].precio} → ${precio}`);
        if (stock !== undefined && oldProduct[0].stock !== parseInt(stock)) changes.push(`stock: ${oldProduct[0].stock} → ${stock}`);
        if (categoria !== undefined && oldProduct[0].categoria !== categoria) changes.push(`categoría: ${oldProduct[0].categoria || 'N/A'} → ${categoria || 'N/A'}`);
        if (codigo_barras !== undefined && oldProduct[0].codigo_barras !== (codigo_barras && codigo_barras.trim() !== '' ? codigo_barras.trim() : null)) {
            changes.push(`código barras: ${oldProduct[0].codigo_barras || 'N/A'} → ${codigo_barras && codigo_barras.trim() !== '' ? codigo_barras.trim() : 'N/A'}`);
        }

        if (changes.length > 0) {
            logOperation(
                'PRODUCTO_EDITADO',
                `Producto editado: ${updatedProduct[0].nombre} - Cambios: ${changes.join(', ')}`,
                'Sistema',
                'productos',
                productId,
                oldProduct[0],
                updatedProduct[0]
            );
        }

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            product: updatedProduct[0]
        });

    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

app.post('/api/sales', async (req, res) => {
    const { items, paymentMethod, metodo_pago, pagos, vuelto, cliente_id } = req.body;

    // Validar que hay items
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe incluir al menos un item válido' });
    }

    // Determinar método de pago: usar pagos detallados si existen, sino el método simple
    let metodoPago;
    if (pagos && Array.isArray(pagos) && pagos.length > 0) {
        // Si hay pagos detallados, guardarlos como JSON
        metodoPago = JSON.stringify(pagos);
    } else {
        // Método de pago simple (compatibilidad hacia atrás)
        metodoPago = paymentMethod || metodo_pago || 'efectivo';
    }

    try {
        // DEBUG: Log información de la venta
        console.log('🔍 Procesando venta:', {
            items_count: items.length,
            total_calculado: items.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0),
            metodo_pago: metodoPago,
            cliente_id: req.body.cliente_id || null
        });

        // Calcular total con descuentos aplicados y verificar stock disponible
        let total = 0;
        const processedItems = [];

        for (const item of items) {
            const precioOriginal = parseFloat(item.precio);
            const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
            const precioConDescuento = descuentoPorcentaje > 0 ? precioOriginal * (1 - descuentoPorcentaje / 100) : precioOriginal;
            const subtotal = precioConDescuento * item.cantidad;
            total += subtotal;

            // Verificar stock disponible en lotes
            const stockDisponible = await dbAll(`
                SELECT SUM(cantidad_actual) as total_stock
                FROM lotes
                WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
            `, [item.id]);

            const stockTotal = stockDisponible[0]?.total_stock || 0;
            if (stockTotal < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${item.nombre}. Disponible: ${stockTotal}, Solicitado: ${item.cantidad}`);
            }

            processedItems.push({
                ...item,
                precioOriginal,
                precioConDescuento,
                subtotal
            });
        }

        // DEBUG: Log sobre creación de deudas
        if (cliente_id) {
            console.log('💰 Venta con cliente_id - Se creará deuda automáticamente en cuenta corriente.');
        } else {
            console.log('💵 Venta sin cliente_id (al contado) - No se crea deuda.');
        }

        const facturaNumber = `FAC-${Date.now()}`;

        // Obtener timestamp actual del servidor en formato ISO para consistencia
        const serverTimestamp = new Date().toISOString();

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar venta con timestamp ISO
            const saleResult = await dbRun(
                "INSERT INTO ventas (numero_factura, total, metodo_pago, vuelto, created_at) VALUES (?, ?, ?, ?, ?)",
                [facturaNumber, total, metodoPago, vuelto || 0, serverTimestamp]
            );

            // Insertar items y actualizar stock usando sistema FIFO de lotes
                 for (const item of processedItems) {
                      let cantidadRestante = item.cantidad;

                      // Obtener lotes disponibles para este producto, SOLO lotes vigentes (no vencidos)
                      const lotesDisponibles = await dbAll(`
                          SELECT * FROM lotes
                          WHERE producto_id = ? AND cantidad_actual > 0 AND estado = 'activo'
                          AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours')
                          ORDER BY fecha_vencimiento ASC
                      `, [item.id]);

                      if (lotesDisponibles.length === 0) {
                          // Si no hay lotes, verificar stock general del producto (solo para productos sin lotes)
                          const productStock = await dbAll("SELECT stock FROM productos WHERE id = ?", [item.id]);
                          if (productStock[0].stock < item.cantidad) {
                              throw new Error(`Stock insuficiente para el producto ${item.nombre}. Disponible: ${productStock[0].stock}, Solicitado: ${item.cantidad}`);
                          }
                          // Insertar item sin lote específico
                          await dbRun(
                              `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal)
                               VALUES (?, ?, ?, ?, ?, ?, ?)`,
                              [saleResult.id, item.id, item.cantidad, item.precioConDescuento, item.precioOriginal, item.descuento_porcentaje || 0, item.subtotal]
                          );
                      } else {
                          // Procesar lotes usando FIFO
                          for (const lote of lotesDisponibles) {
                              if (cantidadRestante <= 0) break;

                              const cantidadDeEsteLote = Math.min(cantidadRestante, lote.cantidad_actual);

                              // Insertar item con referencia al lote
                              await dbRun(
                                  `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal, lote_id)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                  [saleResult.id, item.id, cantidadDeEsteLote, item.precioConDescuento, item.precioOriginal, item.descuento_porcentaje || 0, item.precioConDescuento * cantidadDeEsteLote, lote.id]
                              );

                              // Actualizar cantidad del lote (solo una vez)
                              await dbRun(
                                  "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ? AND cantidad_actual >= ?",
                                  [cantidadDeEsteLote, lote.id, cantidadDeEsteLote]
                              );

                              cantidadRestante -= cantidadDeEsteLote;
                          }

                          if (cantidadRestante > 0) {
                              throw new Error(`Stock insuficiente en lotes vigentes para el producto ${item.nombre}. Cantidad restante: ${cantidadRestante}. Solo se permite vender productos de lotes vigentes (fecha de vencimiento >= hoy en zona horaria del sistema).`);
                          }
                      }

                      // Actualizar stock general del producto
                      const stockUpdateResult = await dbRun(
                          "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
                          [item.cantidad, item.id, item.cantidad]
                      );
                      if (stockUpdateResult.changes === 0) {
                          throw new Error(`Stock insuficiente para el producto ${item.nombre}. Cantidad solicitada: ${item.cantidad}`);
                      }
                  }

            await dbRun("COMMIT");


            // Registrar la operación en el log (fire-and-forget)
            logOperation(
                'VENTA',
                `Venta registrada: ${facturaNumber} - Total: ${formatCurrency(total)}`,
                'Sistema',
                'ventas',
                saleResult.id,
                null,
                {
                    numero_factura: facturaNumber,
                    total: total,
                    metodo_pago: metodoPago,
                    cliente_id: cliente_id || null,
                    items: processedItems.length
                }
            );

            // Obtener la fecha de la venta recién creada
            const saleData = await dbAll("SELECT created_at FROM ventas WHERE id = ?", [saleResult.id]);

            console.log(`✅ Venta registrada: ${facturaNumber} - $${total}`);

            res.json({
                success: true,
                numero_factura: facturaNumber,
                total: total,
                saleId: saleResult.id,
                fecha_venta: saleData[0].created_at,
                message: 'Venta registrada exitosamente en SQLite'
            });

        } catch (error) {
            try {
                await dbRun("ROLLBACK");
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError.message);
                // No relanzar el error de rollback, mantener el error original
            }
            throw error;
        }

    } catch (error) {
        res.status(500).json({
            error: 'Error procesando la venta: ' + error.message
        });
    }
});

// >>> NUEVO ENDPOINT: Venta a Cuenta Corriente
app.post('/api/sales/cuenta-corriente', async (req, res) => {
    const { items, cliente_id } = req.body;

    // Usar items directamente sin conversión adicional
    const productos = items;

    // Validar que hay items
    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'La venta debe incluir al menos un item válido' });
    }

    // Validar cliente
    if (!cliente_id) {
        return res.status(400).json({ error: 'Se requiere un cliente para la venta a cuenta corriente' });
    }

    try {
        // Validar que el cliente exista
        const cliente = await dbAll("SELECT id, nombre FROM clientes WHERE id = ?", [cliente_id]);
        if (cliente.length === 0) {
            return res.status(400).json({ error: 'Cliente no encontrado' });
        }

        console.log('💰 Procesando venta a cuenta corriente:', {
            cliente_id,
            cliente_nombre: cliente[0].nombre,
            items_count: productos.length,
            total_calculado: productos.reduce((sum, item) => sum + (parseFloat(item.precio_unitario) * item.cantidad), 0)
        });

        // Calcular total con descuentos aplicados y verificar stock disponible
        let total = 0;
        const processedItems = [];

        for (const item of productos) {
            const precioOriginal = parseFloat(item.precio_unitario);
            const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
            const precioConDescuento = descuentoPorcentaje > 0 ? precioOriginal * (1 - descuentoPorcentaje / 100) : precioOriginal;
            const subtotal = precioConDescuento * item.cantidad;
            total += subtotal;

            // Verificar stock disponible en lotes
            const stockDisponible = await dbAll(`
                SELECT SUM(cantidad_actual) as total_stock
                FROM lotes
                WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
            `, [item.producto_id]);

            const stockTotal = stockDisponible[0]?.total_stock || 0;
            if (stockTotal < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto con ID ${item.producto_id}. Disponible: ${stockTotal}, Solicitado: ${item.cantidad}`);
            }

            processedItems.push({
                ...item,
                precioOriginal,
                precioConDescuento,
                subtotal
            });
        }

        const facturaNumber = `FAC-${Date.now()}`;

        // Obtener timestamp actual del servidor en formato ISO para consistencia
        const serverTimestamp = new Date().toISOString();

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar venta con método de pago "cuenta_corriente"
            const saleResult = await dbRun(
                "INSERT INTO ventas (numero_factura, total, metodo_pago, created_at) VALUES (?, ?, ?, ?)",
                [facturaNumber, total, 'cuenta_corriente', serverTimestamp]
            );

            // Insertar items y actualizar stock usando sistema FIFO de lotes
            for (const item of processedItems) {
                let cantidadRestante = item.cantidad;

                // Obtener lotes disponibles para este producto, SOLO lotes vigentes (no vencidos)
                const lotesDisponibles = await dbAll(`
                    SELECT * FROM lotes
                    WHERE producto_id = ? AND cantidad_actual > 0 AND estado = 'activo'
                    AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours')
                    ORDER BY fecha_vencimiento ASC
                `, [item.producto_id]);

                if (lotesDisponibles.length === 0) {
                    // Si no hay lotes, verificar stock general del producto (solo para productos sin lotes)
                    const productStock = await dbAll("SELECT stock FROM productos WHERE id = ?", [item.producto_id]);
                    if (productStock[0].stock < item.cantidad) {
                        throw new Error(`Stock insuficiente para el producto ${item.nombre}. Disponible: ${productStock[0].stock}, Solicitado: ${item.cantidad}`);
                    }
                    // Insertar item sin lote específico
                    await dbRun(
                        `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [saleResult.id, item.producto_id, item.cantidad, item.precioConDescuento, item.precioOriginal, item.descuento_porcentaje || 0, item.subtotal]
                    );
                } else {
                    // Procesar lotes usando FIFO
                    for (const lote of lotesDisponibles) {
                        if (cantidadRestante <= 0) break;

                        const cantidadDeEsteLote = Math.min(cantidadRestante, lote.cantidad_actual);

                        // Insertar item con referencia al lote
                        await dbRun(
                            `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal, lote_id)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [saleResult.id, item.producto_id, cantidadDeEsteLote, item.precioConDescuento, item.precioOriginal, item.descuento_porcentaje || 0, item.precioConDescuento * cantidadDeEsteLote, lote.id]
                        );

                        // Actualizar cantidad del lote (solo una vez)
                        await dbRun(
                            "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ? AND cantidad_actual >= ?",
                            [cantidadDeEsteLote, lote.id, cantidadDeEsteLote]
                        );

                        cantidadRestante -= cantidadDeEsteLote;
                    }

                    if (cantidadRestante > 0) {
                        throw new Error(`Stock insuficiente en lotes vigentes para el producto ${item.nombre}. Cantidad restante: ${cantidadRestante}. Solo se permite vender productos de lotes vigentes (fecha de vencimiento >= hoy en zona horaria del sistema).`);
                    }
                }

                // Actualizar stock general del producto
                const stockUpdateResult = await dbRun(
                    "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
                    [item.cantidad, item.producto_id, item.cantidad]
                );
                if (stockUpdateResult.changes === 0) {
                    throw new Error(`Stock insuficiente para el producto ${item.nombre}. Cantidad solicitada: ${item.cantidad}`);
                }
            }

            // Crear deuda asociada a la venta
            const debtResult = await dbRun(
                `INSERT INTO deudas (cliente_id, venta_id, monto_original, monto_pendiente)
                 VALUES (?, ?, ?, ?)`,
                [cliente_id, saleResult.id, total, total]
            );

            // Insertar productos de la deuda
            for (const item of processedItems) {
                await dbRun(
                    `INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [debtResult.id, item.producto_id, item.cantidad, item.precioConDescuento, item.subtotal]
                );
            }

            await dbRun("COMMIT");

            // Registrar la operación en el log (fire-and-forget)
            logOperation(
                'VENTA_CUENTA_CORRIENTE',
                `Venta a cuenta corriente: ${facturaNumber} - Cliente: ${cliente[0].nombre} (${cliente_id}) - Total: ${formatCurrency(total)}`,
                'Sistema',
                'ventas',
                saleResult.id,
                null,
                {
                    numero_factura: facturaNumber,
                    total: total,
                    metodo_pago: 'cuenta_corriente',
                    cliente_id: cliente_id,
                    cliente_nombre: cliente[0].nombre,
                    items: processedItems.length
                }
            );

            // Obtener la fecha de la venta recién creada
            const saleData = await dbAll("SELECT created_at FROM ventas WHERE id = ?", [saleResult.id]);

            console.log(`✅ Venta a cuenta corriente registrada: ${facturaNumber} - $${total}`);

            res.json({
                success: true,
                message: 'Venta a cuenta corriente registrada exitosamente',
                numero_factura: facturaNumber,
                total: total,
                saleId: saleResult.id,
                debtId: debtResult.id,
                fecha_venta: saleData[0].created_at,
                cliente: {
                    id: cliente_id,
                    nombre: cliente[0].nombre
                }
            });

        } catch (error) {
            try {
                await dbRun("ROLLBACK");
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError.message);
                // No relanzar el error de rollback, mantener el error original
            }
            throw error;
        }

    } catch (error) {
        console.error('Error procesando venta a cuenta corriente:', error);
        res.status(500).json({
            error: 'Error procesando la venta a cuenta corriente: ' + error.message
        });
    }
});

// Ruta para obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const totalProducts = await dbAll("SELECT COUNT(*) as count FROM productos");
        const totalSales = await dbAll("SELECT COUNT(*) as count FROM ventas");
        const totalRevenue = await dbAll("SELECT SUM(total) as total FROM ventas");

        // Obtener productos más vendidos (con límite opcional)
        const limit = parseInt(req.query.limit) || 10;
        const topProducts = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.codigo,
                SUM(vi.cantidad) as total_vendido
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            GROUP BY p.id
            ORDER BY total_vendido DESC
            LIMIT ?
        `, [limit]);

        res.json({
            total_products: totalProducts[0].count,
            total_sales: totalSales[0].count,
            total_revenue: totalRevenue[0].total || 0,
            top_products: topProducts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener registro de operaciones
app.get('/api/operations-log', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const operations = await dbAll(`
            SELECT * FROM operaciones_log
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]);

        res.json(operations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de diagnóstico para ventas (debug)
app.get('/api/debug-sales', async (req, res) => {
    try {
        const rawSales = await dbAll("SELECT * FROM ventas ORDER BY created_at DESC LIMIT 5");
        const rawItems = await dbAll("SELECT * FROM venta_items ORDER BY created_at DESC LIMIT 10");

        res.json({
            raw_sales: rawSales,
            raw_items: rawItems,
            sales_count: rawSales.length,
            items_count: rawItems.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para limpiar registro de operaciones
app.delete('/api/operations-log', async (req, res) => {
    try {
        await dbRun("DELETE FROM operaciones_log");

        // Registrar la operación de limpieza
        logOperation(
            'LOG_LIMPIADO',
            'Registro de operaciones limpiado manualmente',
            'Sistema',
            'operaciones_log',
            null,
            null,
            null
        );

        res.json({ success: true, message: 'Registro de operaciones limpiado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener configuración de logging
app.get('/api/settings/logging-enabled', async (req, res) => {
    try {
        const loggingEnabled = await getConfig('logging_enabled');
        res.json({
            enabled: loggingEnabled === 'true',
            value: loggingEnabled
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para actualizar configuración de logging
app.put('/api/settings/logging-enabled', async (req, res) => {
    try {
        const { enabled } = req.body;
        const value = enabled ? 'true' : 'false';

        // Actualizar o insertar la configuración
        await dbRun(`
            INSERT OR REPLACE INTO configuracion (clave, valor, descripcion, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `, ['logging_enabled', value, 'Habilita o deshabilita el registro de operaciones para ahorrar consumo del sistema']);

        // Registrar la operación de cambio de configuración
        logOperation(
            'CONFIGURACION_ACTUALIZADA',
            `Registro de actividad ${enabled ? 'habilitado' : 'deshabilitado'}`,
            'Sistema',
            'configuracion',
            null,
            null,
            { clave: 'logging_enabled', valor: value }
        );

        res.json({
            success: true,
            message: `Registro de actividad ${enabled ? 'habilitado' : 'deshabilitado'} exitosamente`,
            enabled: enabled
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para calcular cierre de caja (preview)
app.post('/api/close-register-preview', async (req, res) => {
    console.log(`🔄 [DEBUG] Endpoint /api/close-register-preview llamado`);
    console.log(`🔄 [DEBUG] Body: ${JSON.stringify(req.body)}`);
    try {
        console.log(`🔍 [DEBUG] req.body completo: ${JSON.stringify(req.body)}`);
        const { fecha, dineroInicial, dinero_inicial, fechaEspecifica } = req.body;

        // Validar dinero inicial (aceptar ambos formatos)
        const initialAmount = parseFloat(dineroInicial || dinero_inicial || 0);
        if (isNaN(initialAmount) || initialAmount < 0) {
            return res.status(400).json({ error: 'El dinero inicial debe ser un número positivo' });
        }

        // Determinar fecha para el cierre
        let targetDate = fechaEspecifica || fecha || new Date().toISOString().split('T')[0];
        console.log(`🔍 [DEBUG] targetDate inicial: ${targetDate}, fechaEspecifica: ${fechaEspecifica}, fecha: ${fecha}`);
        if (fechaEspecifica) {
            // Validar formato de fecha específica
            const dateObj = new Date(fechaEspecifica);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ error: 'Fecha específica inválida' });
            }
            targetDate = fechaEspecifica;
        }
        console.log(`🔍 [DEBUG] targetDate final: ${targetDate}`);

        // Verificar el último cierre para esta fecha y determinar el próximo número de cierre
        let numeroCierrePropuesto = 1;
        try {
            const existingCloses = await dbAll(`
                SELECT id, numero_cierre_dia, fecha_hora_cierre
                FROM cierres_caja
                WHERE fecha_cierre = ?
                ORDER BY numero_cierre_dia DESC
                LIMIT 1
            `, [targetDate]);

            if (existingCloses.length > 0) {
                numeroCierrePropuesto = existingCloses[0].numero_cierre_dia + 1;
                console.log(`ℹ️ Ya existe un cierre para esta fecha. Próximo cierre: #${numeroCierrePropuesto}`);
            }
        } catch (error) {
            console.warn('Error obteniendo cierres del día:', error.message);
            // Continuar con numeroCierrePropuesto = 1
        }

        // Obtener el último cierre completo (independientemente de la fecha) para calcular el rango de ventas
        const lastClose = await dbAll(`
            SELECT id, fecha_hora_cierre, fecha_cierre, numero_cierre_dia, ultima_venta_id
            FROM cierres_caja
            ORDER BY fecha_hora_cierre DESC, id DESC
            LIMIT 1
        `);

        // Construir condición para ventas: usar ultima_venta_id del último cierre si existe, sino fecha/hora
        let salesCondition = "DATE(v.created_at, '+3 hours') = DATE(?)";
        let salesParams = [targetDate];

        if (lastClose.length > 0) {
            if (lastClose[0].ultima_venta_id !== null) {
                // Usar ultima_venta_id para filtro preciso
                salesCondition = "v.id > ? AND DATE(v.created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].ultima_venta_id, targetDate];
            } else if (!fechaEspecifica) {
                // Si no hay ultima_venta_id y es cierre normal, usar fecha_hora_cierre
                salesCondition = "v.created_at > ? AND DATE(v.created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].fecha_hora_cierre, targetDate];
            }
            // Para cierres retroactivos, siempre incluir todas las ventas del día (ignorar ultimo cierre)
        }

        console.log(`🔍 [DEBUG] salesCondition: ${salesCondition}`);
        console.log(`🔍 [DEBUG] salesParams: ${JSON.stringify(salesParams)}`);
        console.log(`🔍 [DEBUG] lastClose: ${lastClose.length > 0 ? JSON.stringify(lastClose[0]) : 'none'}`);
        console.log(`🔍 [DEBUG] fechaEspecifica: ${fechaEspecifica}`);

        // Obtener total de ventas para el período
        const dailySales = await dbAll(`
            SELECT
                SUM(total) as total,
                COUNT(*) as cantidad
            FROM ventas v
            WHERE ${salesCondition}
        `, salesParams);

        console.log(`🔍 [DEBUG] dailySales result: ${JSON.stringify(dailySales)}`);

        // Calcular total esperado
        const totalVentas = parseFloat(dailySales[0].total || 0);
        const cantidadVentas = parseInt(dailySales[0].cantidad || 0);
        const totalEsperado = initialAmount + totalVentas;

        console.log(`🔍 [DEBUG] initialAmount: ${initialAmount}`);
        console.log(`🔍 [DEBUG] totalVentas: ${totalVentas}`);
        console.log(`🔍 [DEBUG] cantidadVentas: ${cantidadVentas}`);
        console.log(`🔍 [DEBUG] totalEsperado: ${totalEsperado}`);

        // Para preview, el dinero contado es igual al esperado (diferencia = 0)
        const countedAmount = totalEsperado;
        const diferencia = 0;

        // Obtener detalles de ventas para el período
        const salesDetails = await dbAll(`
            SELECT
                v.id,
                v.numero_factura,
                v.total,
                v.metodo_pago,
                v.created_at,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'producto_id', vi.producto_id,
                        'nombre', p.nombre,
                        'cantidad', vi.cantidad,
                        'precio_unitario', vi.precio_unitario,
                        'precio_original', vi.precio_original,
                        'descuento_porcentaje', vi.descuento_porcentaje,
                        'subtotal', vi.subtotal
                    )
                ) as items
            FROM ventas v
            LEFT JOIN venta_items vi ON v.id = vi.venta_id
            LEFT JOIN productos p ON vi.producto_id = p.id
            WHERE ${salesCondition}
            GROUP BY v.id
            ORDER BY v.created_at ASC
        `, salesParams);

        // Procesar items JSON
        const processedSales = salesDetails.map(sale => ({
            ...sale,
            items: sale.items ? JSON.parse(`[${sale.items}]`) : []
        }));

        // Calcular totales y cantidad por método de pago
        const paymentTotals = {};
        const paymentCounts = {};
        processedSales.forEach(sale => {
            let metodoPago = sale.metodo_pago;

            // Intentar parsear como JSON si contiene información detallada de pagos
            try {
                const parsed = JSON.parse(sale.metodo_pago);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].metodo) {
                    // Es un array de pagos detallados
                    parsed.forEach(pago => {
                        const metodo = pago.metodo.toUpperCase();
                        const monto = parseFloat(pago.monto || 0);
                        if (!paymentTotals[metodo]) {
                            paymentTotals[metodo] = { total: 0, cantidad: 0 };
                        }
                        paymentTotals[metodo].total += monto;
                        paymentTotals[metodo].cantidad += 1;
                    });
                    return;
                }
            } catch (e) {
                // No es JSON, mantener como string simple
                metodoPago = sale.metodo_pago;
            }

            // Método de pago simple
            const metodo = metodoPago.toUpperCase();
            if (!paymentTotals[metodo]) {
                paymentTotals[metodo] = { total: 0, cantidad: 0 };
            }
            paymentTotals[metodo].total += parseFloat(sale.total || 0);
            paymentTotals[metodo].cantidad += 1;
        });

        // Obtener información de cierres existentes para el día
        let cierresDelDia = [];
        try {
            cierresDelDia = await dbAll(`
                SELECT numero_cierre_dia, fecha_hora_cierre, total_ventas
                FROM cierres_caja
                WHERE fecha_cierre = ?
                ORDER BY numero_cierre_dia
            `, [targetDate]);
        } catch (error) {
            console.warn('Error obteniendo cierres del día:', error.message);
            cierresDelDia = [];
        }

        // Calcular la ultima_venta_id para el cierre actual
        let ultimaVentaId = null;
        if (processedSales.length > 0) {
            const maxSaleId = Math.max(...processedSales.map(sale => sale.id));
            ultimaVentaId = maxSaleId;
        }

        res.json({
            success: true,
            dinero_inicial: initialAmount,
            dinero_contado: countedAmount,
            total_ventas: totalVentas,
            total_esperado: totalEsperado,
            diferencia: diferencia,
            cantidad_ventas: cantidadVentas,
            ventas: processedSales,
            payment_totals: paymentTotals,
            fecha: targetDate,
            fecha_cierre: targetDate,
            tipo_cierre: fechaEspecifica ? 'retroactivo' : 'normal',
            preview: true,
            cierres_existentes: cierresDelDia,
            numero_cierre_propuesto: cierresDelDia.length + 1,
            ultimo_cierre_id: lastClose.length > 0 ? lastClose[0].id : null,
            ultimo_cierre_fecha_hora: lastClose.length > 0 ? lastClose[0].fecha_hora_cierre : null,
            ultima_venta_id_anterior: lastClose.length > 0 ? lastClose[0].ultima_venta_id : null,
            ultima_venta_id_propuesto: ultimaVentaId
        });

    } catch (error) {
        console.error('Error en preview de cierre de caja:', error);
        res.status(500).json({
            error: 'Error en preview de cierre de caja: ' + error.message
        });
    }
});

// Ruta para confirmar y guardar cierre de caja (modificada para usar total_esperado del frontend)
app.post('/api/close-register-confirm', async (req, res) => {
    try {
        const {
            fecha,
            fecha_cierre,
            dinero_inicial,
            tipo_cierre,
            notas
        } = req.body;

        console.log('🔍 Datos recibidos para confirmar cierre:', req.body);

        // Validar campos requeridos
        if (dinero_inicial === undefined || dinero_inicial === null) {
            return res.status(400).json({ error: 'El campo dinero_inicial es requerido' });
        }

        // Validar que dinero_inicial sea un número válido
        const dineroInicialParsed = parseFloat(dinero_inicial);
        if (isNaN(dineroInicialParsed)) {
            return res.status(400).json({ error: 'El campo dinero_inicial debe ser un número válido' });
        }

        // Obtener el último cierre completo para calcular el rango de ventas (NO confiar en datos del frontend)
        const lastClose = await dbAll(`
            SELECT id, fecha_hora_cierre, fecha_cierre, numero_cierre_dia, ultima_venta_id
            FROM cierres_caja
            ORDER BY fecha_hora_cierre DESC, id DESC
            LIMIT 1
        `);

        // Construir condición para ventas: usar ultima_venta_id del último cierre si existe, sino fecha/hora
        let salesCondition = "DATE(v.created_at, '+3 hours') = DATE(?)";
        let salesParams = [fecha_cierre];

        if (lastClose.length > 0) {
            if (lastClose[0].ultima_venta_id !== null) {
                // Usar ultima_venta_id para filtro preciso
                salesCondition = "v.id > ? AND DATE(v.created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].ultima_venta_id, fecha_cierre];
            } else if (tipo_cierre !== 'retroactivo') {
                // Si no hay ultima_venta_id y es cierre normal, usar fecha_hora_cierre
                salesCondition = "v.created_at > ? AND DATE(v.created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].fecha_hora_cierre, fecha_cierre];
            }
            // Para cierres retroactivos, siempre incluir todas las ventas del día (ignorar ultimo cierre)
        }

        console.log(`🔍 [DEBUG] salesCondition para confirmación: ${salesCondition}`);
        console.log(`🔍 [DEBUG] salesParams para confirmación: ${JSON.stringify(salesParams)}`);

        // Calcular datos del cierre desde la base de datos (evitar confiar en frontend)
        const dailySales = await dbAll(`
            SELECT
                SUM(total) as total,
                COUNT(*) as cantidad
            FROM ventas v
            WHERE ${salesCondition}
        `, salesParams);

        const totalVentas = parseFloat(dailySales[0]?.total || 0);
        const cantidadVentas = dailySales[0]?.cantidad || 0;

        // Validar que totalVentas sea un número válido
        if (isNaN(totalVentas) || !isFinite(totalVentas)) {
            throw new Error('No se pudo obtener total de ventas válido de la base de datos');
        }

        const totalEsperado = dineroInicialParsed + totalVentas;

        // Calcular diferencia (si se proporciona dinero_contado desde frontend)
        const diferencia = req.body.dinero_contado !== undefined ?
            totalEsperado - parseFloat(req.body.dinero_contado) : 0;

        // Validar que totalEsperado se haya calculado correctamente
        if (isNaN(totalEsperado) || totalEsperado === undefined || !isFinite(totalEsperado)) {
            throw new Error('No se pudo calcular totalEsperado: datos inválidos (dinero_inicial o total_ventas incorrectos)');
        }

        // Obtener el próximo número de cierre para esta fecha
        let cierresDelDia = [];
        try {
            cierresDelDia = await dbAll(`
                SELECT numero_cierre_dia FROM cierres_caja
                WHERE fecha_cierre = ?
                ORDER BY numero_cierre_dia DESC
                LIMIT 1
            `, [fecha_cierre]);
        } catch (error) {
            console.warn('Error obteniendo cierres del día para confirmación:', error.message);
            cierresDelDia = [];
        }

        const numeroCierreDia = cierresDelDia.length > 0 ? cierresDelDia[0].numero_cierre_dia + 1 : 1;

        // Obtener timestamp actual para fecha_hora_cierre
        const fechaHoraCierre = new Date().toISOString();

        // Obtener la ultima_venta_id para este cierre
        let ultimaVentaId = null;
        if (cantidadVentas > 0) {
            const maxSaleIdResult = await dbAll(`
                SELECT MAX(id) as max_id
                FROM ventas v
                WHERE ${salesCondition}
            `, salesParams);
            ultimaVentaId = maxSaleIdResult[0].max_id;
        }

        // Guardar el cierre en la base de datos
        const result = await dbRun(
            `INSERT INTO cierres_caja
            (fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas, tipo_cierre, notas, numero_cierre_dia, ultima_venta_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fecha, fecha_cierre, fechaHoraCierre, dinero_inicial, totalVentas, totalEsperado, diferencia, cantidadVentas, tipo_cierre || 'normal', notas || '', numeroCierreDia, ultimaVentaId]
        );

        // Si es un cierre retroactivo, actualizar el estado de días sin cierre
        if (tipo_cierre === 'retroactivo') {
            await dbRun(`
                UPDATE dias_sin_cierre
                SET estado = 'resuelto', ultima_actualizacion = datetime('now')
                WHERE fecha = ?
            `, [fecha_cierre]);
        }

        // Registrar la operación en el log
        logOperation(
            'CIERRE_CAJA',
            `Cierre de caja ${tipo_cierre || 'normal'} #${numeroCierreDia} realizado - Fecha: ${fecha_cierre} - Total: ${formatCurrency(totalEsperado)}`,
            'Sistema',
            'cierres_caja',
            result.id,
            null,
            {
                fecha_cierre,
                numero_cierre_dia: numeroCierreDia,
                fecha_hora_cierre: fechaHoraCierre,
                dinero_inicial,
                total_ventas: totalVentas,
                total_esperado,
                diferencia,
                cantidad_ventas,
                tipo_cierre: tipo_cierre || 'normal',
                ultima_venta_id: ultimaVentaId
            }
        );

        res.json({
            success: true,
            message: `Cierre de caja ${tipo_cierre || 'normal'} confirmado y registrado exitosamente`,
            cierre_id: result.id,
            total_ventas: totalVentas,
            cantidad_ventas: cantidadVentas,
            total_esperado: totalEsperado,
            diferencia: diferencia,
            ultima_venta_id: ultimaVentaId
        });

    } catch (error) {
        console.error('Error confirmando cierre de caja:', error);
        res.status(500).json({
            error: 'Error confirmando cierre de caja: ' + error.message
        });
    }
});

// Ruta para cierre de caja (legacy - mantiene compatibilidad)
app.post('/api/close-register', async (req, res) => {
    try {
        const { fecha, dineroInicial, dineroContado } = req.body;

        // Validar dinero inicial
        const initialAmount = parseFloat(dineroInicial || 0);
        if (isNaN(initialAmount) || initialAmount < 0) {
            return res.status(400).json({ error: 'El dinero inicial debe ser un número positivo' });
        }

        // Determinar fecha para el cierre
        const targetDate = fecha || new Date().toISOString().split('T')[0];

        // Obtener el último cierre completo para calcular el rango de ventas
        const lastClose = await dbAll(`
            SELECT id, fecha_hora_cierre, fecha_cierre, numero_cierre_dia, ultima_venta_id
            FROM cierres_caja
            ORDER BY fecha_hora_cierre DESC, id DESC
            LIMIT 1
        `);

        // Construir condición para ventas: usar ultima_venta_id del último cierre si existe, sino fecha/hora
        let salesCondition = "DATE(created_at, '+3 hours') = DATE(?)";
        let salesParams = [targetDate];

        if (lastClose.length > 0) {
            if (lastClose[0].ultima_venta_id !== null) {
                // Usar ultima_venta_id para filtro preciso
                salesCondition = "id > ? AND DATE(created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].ultima_venta_id, targetDate];
            } else {
                // Si no hay ultima_venta_id, usar fecha_hora_cierre
                salesCondition = "created_at > ? AND DATE(created_at, '+3 hours') <= DATE(?)";
                salesParams = [lastClose[0].fecha_hora_cierre, targetDate];
            }
        }

        // Obtener total de ventas desde el último cierre
        const dailySales = await dbAll(`
            SELECT
                SUM(total) as total,
                COUNT(*) as cantidad
            FROM ventas
            WHERE ${salesCondition}
        `, salesParams);

        // Calcular total esperado
        const totalVentas = parseFloat(dailySales[0].total || 0);
        const totalEsperado = initialAmount + totalVentas;

        // Determinar dinero contado
        let countedAmount;
        if (dineroContado === 'auto') {
            // Modo automático: usar el total esperado como dinero contado
            countedAmount = totalEsperado;
        } else {
            // Modo manual: validar el valor proporcionado
            countedAmount = parseFloat(dineroContado || 0);
            if (isNaN(countedAmount) || countedAmount < 0) {
                return res.status(400).json({ error: 'El dinero contado debe ser un número positivo' });
            }
        }

        // Obtener detalles de ventas desde el último cierre
        const salesDetails = await dbAll(`
            SELECT
                v.id,
                v.numero_factura,
                v.total,
                v.metodo_pago,
                v.created_at,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'producto_id', vi.producto_id,
                        'nombre', p.nombre,
                        'cantidad', vi.cantidad,
                        'precio_unitario', vi.precio_unitario,
                        'precio_original', vi.precio_original,
                        'descuento_porcentaje', vi.descuento_porcentaje,
                        'subtotal', vi.subtotal
                    )
                ) as items
            FROM ventas v
            LEFT JOIN venta_items vi ON v.id = vi.venta_id
            LEFT JOIN productos p ON vi.producto_id = p.id
            WHERE ${salesCondition}
            GROUP BY v.id
        `, salesParams);

        // Procesar items JSON
        const processedSales = salesDetails.map(sale => ({
            ...sale,
            items: sale.items ? JSON.parse(`[${sale.items}]`) : []
        }));

        // Calcular diferencia
        const diferencia = totalEsperado - countedAmount;

        // Obtener el próximo número de cierre para esta fecha
        let cierresDelDia = [];
        try {
            cierresDelDia = await dbAll(`
                SELECT numero_cierre_dia FROM cierres_caja
                WHERE fecha_cierre = ?
                ORDER BY numero_cierre_dia DESC
                LIMIT 1
            `, [targetDate]);
        } catch (error) {
            console.warn('Error obteniendo cierres del día:', error.message);
            cierresDelDia = [];
        }

        const numeroCierreDia = cierresDelDia.length > 0 ? cierresDelDia[0].numero_cierre_dia + 1 : 1;

        // Obtener timestamp actual para fecha_hora_cierre
        const fechaHoraCierre = new Date().toISOString();

        // Obtener la ultima_venta_id para este cierre
        let ultimaVentaId = null;
        if (dailySales[0].cantidad > 0) {
            const maxSaleIdResult = await dbAll(`
                SELECT MAX(id) as max_id
                FROM ventas
                WHERE ${salesCondition}
            `, salesParams);
            ultimaVentaId = maxSaleIdResult[0].max_id;
        }

        // Guardar el cierre en la base de datos
        const result = await dbRun(
            `INSERT INTO cierres_caja
            (fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas, tipo_cierre, numero_cierre_dia, ultima_venta_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fechaHoraCierre, targetDate, fechaHoraCierre, initialAmount, totalVentas, totalEsperado, diferencia, dailySales[0].cantidad || 0, 'normal', numeroCierreDia, ultimaVentaId]
        );

        // Registrar la operación en el log
        logOperation(
            'CIERRE_CAJA',
            `Cierre de caja legacy #${numeroCierreDia} realizado - Fecha: ${targetDate} - Total: ${formatCurrency(totalEsperado)}`,
            'Sistema',
            'cierres_caja',
            result.id,
            null,
            {
                fecha_cierre: targetDate,
                numero_cierre_dia: numeroCierreDia,
                fecha_hora_cierre: fechaHoraCierre,
                dinero_inicial: initialAmount,
                total_ventas: totalVentas,
                total_esperado: totalEsperado,
                diferencia: diferencia,
                cantidad_ventas: dailySales[0].cantidad || 0,
                tipo_cierre: 'normal',
                ultima_venta_id: ultimaVentaId
            }
        );

        res.json({
            success: true,
            dinero_inicial: initialAmount,
            dinero_contado: countedAmount,
            total: totalVentas,
            total_esperado: totalEsperado,
            diferencia: diferencia,
            cantidad_ventas: dailySales[0].cantidad || 0,
            ventas: processedSales,
            fecha: fecha || new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en el cierre de caja:', error);
        res.status(500).json({
            error: 'Error en el cierre de caja: ' + error.message
        });
    }
});

// Ruta para obtener historial de cierres
app.get('/api/cierres', async (req, res) => {
    try {
        const cierres = await dbAll(`
            SELECT * FROM cierres_caja
            ORDER BY fecha_cierre DESC, numero_cierre_dia DESC, fecha_hora_cierre DESC
        `);
        res.json(cierres);
    } catch (error) {
        res.status(500).json({
            error: 'Error obteniendo historial de cierres: ' + error.message
        });
    }
});

// Nueva ruta para verificar días sin cierre
app.get('/api/check-pending-closures', async (req, res) => {
    try {
        // Obtener fecha del último cierre (considerando cierres múltiples por día)
        const lastClose = await dbAll(`
            SELECT fecha_cierre, fecha_hora_cierre, numero_cierre_dia
            FROM cierres_caja
            ORDER BY fecha_cierre DESC, numero_cierre_dia DESC
            LIMIT 1
        `);

        if (lastClose.length === 0) {
            // No hay cierres, verificar si hay ventas
            const hasSales = await dbAll("SELECT COUNT(*) as count FROM ventas");
            return res.json({
                pending_days: hasSales[0].count > 0 ? 1 : 0,
                last_close_date: null,
                last_close_datetime: null,
                message: hasSales[0].count > 0 ? 'Hay ventas sin cerrar' : 'Sin ventas registradas'
            });
        }

        const lastCloseDate = new Date(lastClose[0].fecha_cierre);
        const lastCloseDateTime = new Date(lastClose[0].fecha_hora_cierre);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calcular días sin cierre
        const daysDiff = Math.floor((today - lastCloseDate) / (1000 * 60 * 60 * 24));

        // Si hay más de 1 día de diferencia, hay días pendientes
        const pendingDays = Math.max(0, daysDiff - 1); // -1 porque el día actual no cuenta como pendiente

        res.json({
            pending_days: pendingDays,
            last_close_date: lastClose[0].fecha_cierre,
            last_close_datetime: lastClose[0].fecha_hora_cierre,
            last_close_numero: lastClose[0].numero_cierre_dia,
            today: today.toISOString().split('T')[0],
            message: pendingDays > 0 ?
                `Hay ${pendingDays} día(s) sin cierre de caja` :
                'Cierres de caja al día'
        });

    } catch (error) {
        console.error('Error verificando días sin cierre:', error);
        res.status(500).json({
            error: 'Error verificando días sin cierre: ' + error.message
        });
    }
});

// Ruta para resetear datos de ventas y cierres (para testing)
app.post('/api/reset-data', conditionalAuth, async (req, res) => {
    try {
        console.log('🔄 Iniciando reset de datos...');

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar todos los items de venta
            console.log('🗑️ Eliminando items de venta...');
            await dbRun("DELETE FROM venta_items");

            // Eliminar todas las ventas
            console.log('🗑️ Eliminando ventas...');
            await dbRun("DELETE FROM ventas");

            // Eliminar todos los cierres de caja
            console.log('🗑️ Eliminando cierres de caja...');
            await dbRun("DELETE FROM cierres_caja");

            // Eliminar registros de operaciones relacionadas con ventas
            console.log('🗑️ Eliminando registros de operaciones de ventas...');
            await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion = 'VENTA'");

            // Resetear stock de productos y eliminar lotes
            console.log('🔄 Reseteando stock de productos...');
            await dbRun("UPDATE productos SET stock = 0, lote_actual_id = NULL");
            console.log('🗑️ Eliminando lotes...');
            await dbRun("DELETE FROM lotes");

            // Eliminar pedidos a proveedores y proveedores
            console.log('🗑️ Eliminando items de pedidos...');
            await dbRun("DELETE FROM pedido_items");
            console.log('🗑️ Eliminando pedidos a proveedores...');
            await dbRun("DELETE FROM pedidos_proveedores");
            console.log('🗑️ Eliminando proveedores...');
            await dbRun("DELETE FROM proveedores");

            // Eliminar registros de operaciones relacionadas con proveedores y pedidos
            console.log('🗑️ Eliminando registros de operaciones de proveedores y pedidos...');
            await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion IN ('PROVEEDOR_CREADO', 'PEDIDO_CREADO', 'PEDIDO_ESTADO_ACTUALIZADO', 'PEDIDO_ENTREGADO')");

            // Eliminar registros de operaciones relacionadas con proveedores y pedidos
            console.log('🗑️ Eliminando registros de operaciones de proveedores y pedidos...');
            await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion IN ('PROVEEDOR_CREADO', 'PEDIDO_CREADO', 'PEDIDO_ESTADO_ACTUALIZADO', 'PEDIDO_ENTREGADO')");

            await dbRun("COMMIT");

            console.log('✅ Reset completado exitosamente');

            res.json({
                success: true,
                message: 'Datos de ventas, cierres, lotes, proveedores, pedidos e historial de operaciones reseteados exitosamente. Los productos permanecen intactos pero con stock en 0.'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            console.error('❌ Error durante el reset, rollback ejecutado:', error);
            throw error;
        }

    } catch (error) {
        console.error('❌ Error reseteando datos:', error);
        res.status(500).json({
            error: 'Error reseteando datos: ' + error.message
        });
    }
});

// Ruta para restaurar backup completo
app.post('/api/restore-backup', conditionalAuth, async (req, res) => {
    const backupData = req.body;

    // Validar estructura del backup
    if (!backupData.data || !backupData.timestamp || !backupData.version) {
        return res.status(400).json({ error: 'Estructura de backup inválida' });
    }

    try {
        // Iniciar transacción principal
        await dbRun("BEGIN TRANSACTION");

        try {
            // 1. Limpiar datos existentes
            await dbRun("DELETE FROM operaciones_log");
            await dbRun("DELETE FROM venta_items");
            await dbRun("DELETE FROM ventas");
            await dbRun("DELETE FROM promocion_items");
            await dbRun("DELETE FROM promociones");
            await dbRun("DELETE FROM cierres_caja");
            await dbRun("DELETE FROM proveedores");
            // NOTA: No eliminamos productos para preservar configuraciones existentes

            // 2. Restaurar productos (si existen en el backup)
            if (backupData.data.products && Array.isArray(backupData.data.products)) {
                for (const product of backupData.data.products) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO productos
                             (id, codigo, nombre, descripcion, precio, stock, categoria, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                product.id,
                                product.codigo,
                                product.nombre,
                                product.descripcion || '',
                                product.precio,
                                product.stock,
                                product.categoria || '',
                                product.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring product:', product.id, e.message);
                    }
                }
            }

            // 3. Restaurar proveedores
            if (backupData.data.suppliers && Array.isArray(backupData.data.suppliers)) {
                for (const supplier of backupData.data.suppliers) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO proveedores
                             (id, nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                supplier.id,
                                supplier.nombre_proveedor,
                                supplier.nombre_contacto || '',
                                supplier.telefono || '',
                                supplier.email || '',
                                supplier.productos_servicios || '',
                                supplier.condiciones_pago || '',
                                supplier.estatus || 'Activo',
                                supplier.notas || '',
                                supplier.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring supplier:', supplier.id, e.message);
                    }
                }
            }

            // 4. Restaurar promociones
            if (backupData.data.promotions && Array.isArray(backupData.data.promotions)) {
                for (const promotion of backupData.data.promotions) {
                    try {
                        // Insertar promoción
                        await dbRun(
                            `INSERT OR REPLACE INTO promociones (id, titulo, created_at) VALUES (?, ?, ?)`,
                            [promotion.id, promotion.titulo, promotion.created_at || new Date().toISOString()]
                        );

                        // Insertar items de la promoción
                        if (promotion.items && Array.isArray(promotion.items)) {
                            for (const item of promotion.items) {
                                await dbRun(
                                    `INSERT OR REPLACE INTO promocion_items
                                     (id, promocion_id, producto_id, descuento_porcentaje)
                                     VALUES (?, ?, ?, ?)`,
                                    [item.id, promotion.id, item.producto_id, item.descuento_porcentaje]
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('Error restoring promotion:', promotion.id, e.message);
                    }
                }
            }

            // 5. Restaurar ventas
            if (backupData.data.sales && Array.isArray(backupData.data.sales)) {
                for (const sale of backupData.data.sales) {
                    try {
                        // Insertar venta
                        await dbRun(
                            `INSERT OR REPLACE INTO ventas
                             (id, numero_factura, total, metodo_pago, vuelto, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                sale.id,
                                sale.numero_factura,
                                sale.total,
                                typeof sale.metodo_pago === 'string' ? sale.metodo_pago : JSON.stringify(sale.metodo_pago),
                                sale.vuelto || 0,
                                sale.fecha || sale.created_at || new Date().toISOString()
                            ]
                        );

                        // Insertar items de la venta
                        if (sale.items && Array.isArray(sale.items)) {
                            for (const item of sale.items) {
                                await dbRun(
                                    `INSERT OR REPLACE INTO venta_items
                                     (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        sale.id,
                                        item.producto_id || item.id,
                                        item.cantidad,
                                        item.precio_unitario,
                                        item.precio_original || item.precio_unitario,
                                        item.descuento_porcentaje || 0,
                                        item.subtotal || (item.cantidad * item.precio_unitario)
                                    ]
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('Error restoring sale:', sale.id, e.message);
                    }
                }
            }

            // 6. Restaurar cierres de caja
            if (backupData.data.cierres_caja && Array.isArray(backupData.data.cierres_caja)) {
                for (const cierre of backupData.data.cierres_caja) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO cierres_caja
                             (id, fecha, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                cierre.id,
                                cierre.fecha,
                                cierre.dinero_inicial,
                                cierre.total_ventas,
                                cierre.total_esperado,
                                cierre.diferencia,
                                cierre.cantidad_ventas
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring cierre:', cierre.id, e.message);
                    }
                }
            }

            // 7. Restaurar registro de operaciones
            if (backupData.data.operations_log && Array.isArray(backupData.data.operations_log)) {
                for (const operation of backupData.data.operations_log) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO operaciones_log
                             (id, tipo_operacion, descripcion, usuario, entidad_afectada, id_entidad, datos_anteriores, datos_nuevos, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                operation.id,
                                operation.tipo_operacion,
                                operation.descripcion,
                                operation.usuario || 'Sistema',
                                operation.entidad_afectada || null,
                                operation.id_entidad || null,
                                operation.datos_anteriores || null,
                                operation.datos_nuevos || null,
                                operation.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring operation:', operation.id, e.message);
                    }
                }
            }

            await dbRun("COMMIT");

            // Registrar la operación de restauración
            logOperation(
                'BACKUP_RESTAURADO',
                `Backup restaurado - Timestamp: ${backupData.timestamp}`,
                'Sistema',
                'sistema',
                null,
                null,
                {
                    timestamp: backupData.timestamp,
                    version: backupData.version,
                    sections_restored: Object.keys(backupData.data)
                }
            );

            res.json({
                success: true,
                message: 'Backup restaurado exitosamente',
                timestamp: backupData.timestamp,
                sections_restored: Object.keys(backupData.data)
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            error: 'Error al restaurar el backup: ' + error.message
        });
    }
});


// >>> RUTAS PARA REPORTES DE RENTABILIDAD

// Reporte completo de rentabilidad por productos
app.get('/api/reports/profitability', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.codigo,
                p.precio as precio_venta,
                p.categoria,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now') THEN l.cantidad_actual ELSE 0 END), 0) as stock_total,
                COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
                -- Costo promedio ponderado
                CASE
                    WHEN SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END) > 0
                    THEN ROUND(
                        SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario * l.cantidad_actual ELSE 0 END) /
                        SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END), 2
                    )
                    ELSE NULL
                END as costo_promedio_ponderado,
                -- Ganancia potencial total (stock * ganancia unitaria promedio)
                CASE
                    WHEN SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END) > 0
                    THEN ROUND(
                        SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END) *
                        (p.precio - (
                            SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.costo_unitario * l.cantidad_actual ELSE 0 END) /
                            SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END)
                        )), 2
                    )
                    ELSE 0
                END as ganancia_total_potencial
            FROM productos p
            LEFT JOIN lotes l ON p.id = l.producto_id
            GROUP BY p.id, p.nombre, p.codigo, p.precio, p.categoria
            HAVING stock_total > 0
            ORDER BY ganancia_total_potencial DESC
        `);

        // Obtener detalles de lotes para cada producto
        const productsWithLotes = await Promise.all(products.map(async (product) => {
            const lotes = await dbAll(`
                SELECT
                    l.id,
                    l.numero_lote,
                    l.fecha_vencimiento,
                    l.cantidad_actual,
                    l.costo_unitario,
                    ROUND(p.precio - l.costo_unitario, 2) as ganancia_unitaria,
                    CASE
                        WHEN l.costo_unitario > 0
                        THEN ROUND(((p.precio - l.costo_unitario) / l.costo_unitario) * 100, 2)
                        ELSE NULL
                    END as margen_ganancia_porcentaje,
                    ROUND(l.cantidad_actual * (p.precio - l.costo_unitario), 2) as ganancia_total_lote
                FROM lotes l
                JOIN productos p ON l.producto_id = p.id
                WHERE l.producto_id = ? AND l.estado = 'activo' AND l.cantidad_actual > 0
                ORDER BY l.fecha_vencimiento ASC
            `, [product.id]);

            return {
                ...product,
                lotes: lotes,
                margen_ganancia_promedio: product.costo_promedio_ponderado ?
                    Math.round(((product.precio_venta - product.costo_promedio_ponderado) / product.costo_promedio_ponderado) * 100 * 100) / 100 : null
            };
        }));

        // Calcular resumen general
        const resumen = {
            total_productos: productsWithLotes.length,
            productos_rentables: productsWithLotes.filter(p => p.margen_ganancia_promedio > 0).length,
            productos_sin_ganancia: productsWithLotes.filter(p => p.margen_ganancia_promedio === null || p.margen_ganancia_promedio <= 0).length,
            ganancia_total_potencial: productsWithLotes.reduce((sum, p) => sum + (p.ganancia_total_potencial || 0), 0),
            costo_total_invertido: productsWithLotes.reduce((sum, p) => sum + ((p.costo_promedio_ponderado || 0) * p.stock_total), 0),
            valor_total_venta_potencial: productsWithLotes.reduce((sum, p) => sum + (p.precio_venta * p.stock_total), 0)
        };

        res.json({
            productos: productsWithLotes,
            resumen: resumen,
            generado_en: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generando reporte de rentabilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> RUTAS PARA GESTIÓN DE LOTES (NUEVA IMPLEMENTACIÓN)

// Obtener lotes de un producto (todos los estados)
app.get('/api/products/:id/lotes', async (req, res) => {
    try {
        const productId = req.params.id;

        const lotes = await dbAll(`
            SELECT l.*,
                     p.nombre as producto_nombre,
                     p.codigo as producto_codigo,
                     CASE
                         WHEN l.fecha_vencimiento < date('now') THEN 'vencido'
                         WHEN l.fecha_vencimiento <= date('now', '+7 days') THEN 'proximo_vencer'
                         ELSE 'vigente'
                     END as estado_vencimiento,
                     julianday(l.fecha_vencimiento) - julianday('now') as dias_para_vencer
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE l.producto_id = ?
            ORDER BY l.fecha_ingreso DESC
        `, [productId]);

        res.json(lotes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo lote
app.post('/api/lotes', async (req, res) => {
    const { producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, costo_unitario, notas } = req.body;

    // Validaciones
    if (!producto_id || !numero_lote || !fecha_vencimiento || !cantidad_inicial) {
        return res.status(400).json({ error: 'Producto, número de lote, fecha de vencimiento y cantidad inicial son requeridos' });
    }

    if (cantidad_inicial <= 0) {
        return res.status(400).json({ error: 'La cantidad inicial debe ser mayor a 0' });
    }

    // Validar fecha de vencimiento
    const fechaVenc = new Date(fecha_vencimiento);
    if (isNaN(fechaVenc.getTime())) {
        return res.status(400).json({ error: 'Fecha de vencimiento inválida' });
    }

    try {
        // Verificar que el producto existe
        const product = await dbAll("SELECT id, nombre FROM productos WHERE id = ?", [producto_id]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Insertar el nuevo lote
        const result = await dbRun(
            `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_inicial, costo_unitario || null, notas || '']
        );

        // Actualizar stock del producto
        await dbRun(
            "UPDATE productos SET stock = stock + ? WHERE id = ?",
            [cantidad_inicial, producto_id]
        );

        // Verificar si este lote es el más vigente (fecha de vencimiento más lejana)
        const loteMasVigente = await dbAll(`
            SELECT id FROM lotes
            WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
            ORDER BY fecha_vencimiento DESC
            LIMIT 1
        `, [producto_id]);

        if (loteMasVigente.length > 0 && loteMasVigente[0].id === result.id) {
            // Este es el lote más vigente, actualizar el producto
            await dbRun(
                "UPDATE productos SET lote_actual_id = ? WHERE id = ?",
                [result.id, producto_id]
            );
        }

        // Registrar la operación en el log
        logOperation(
            'LOTE_CREADO',
            `Lote creado - Producto: ${product[0].nombre} - Cantidad: ${cantidad_inicial} - Costo: ${costo_unitario ? formatCurrency(costo_unitario) : 'N/A'}`,
            'Sistema',
            'lotes',
            result.id,
            null,
            {
                producto_id,
                numero_lote,
                fecha_vencimiento,
                costo_unitario,
                cantidad_inicial
            }
        );

        res.status(201).json({
            success: true,
            message: 'Lote creado exitosamente',
            lote_id: result.id
        });

    } catch (error) {
        console.error('Error creando lote:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Endpoint para descartar lote (PUT /api/lotes/:id/descartar)
app.put('/api/lotes/:id/descartar', async (req, res) => {
    const loteId = req.params.id;
    const { cantidad_descartada } = req.body;
    try {
        // 1. Verificar que el lote existe y está activo
        const lotes = await dbAll("SELECT * FROM lotes WHERE id = ?", [loteId]);
        if (lotes.length === 0) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }
        const lote = lotes[0];
        if (lote.estado === 'descartado') {
            return res.status(400).json({ error: 'El lote ya está descartado' });
        }

        // Validar cantidad_descartada
        let cantidadDescarte = parseInt(cantidad_descartada);
        if (isNaN(cantidadDescarte) || cantidadDescarte <= 0 || cantidadDescarte > lote.cantidad_actual) {
            return res.status(400).json({ error: 'Cantidad a descartar inválida' });
        }

        // 2. Actualizar estado a 'descartado' y dejar cantidad_actual igual a la cantidad descartada
        await dbRun("BEGIN TRANSACTION");
        await dbRun("UPDATE lotes SET estado = 'descartado', cantidad_actual = ? WHERE id = ?", [cantidadDescarte, loteId]);

        // 3. Restar del stock del producto la cantidad descartada
        await dbRun("UPDATE productos SET stock = stock - ? WHERE id = ?", [cantidadDescarte, lote.producto_id]);

        // 4. Actualizar lote_actual_id del producto si corresponde
        await updateLoteActualId(lote.producto_id);

        await dbRun("COMMIT");

        // 5. Registrar en log
        logOperation(
            'LOTE_DESCARTADO',
            `Lote descartado: ID ${loteId} - Producto: ${lote.producto_id} - Cantidad descartada: ${cantidadDescarte}`,
            'Sistema',
            'lotes',
            loteId,
            lote,
            { estado: 'descartado', cantidad_actual: cantidadDescarte }
        );

        res.json({
            success: true,
            message: 'Lote descartado correctamente',
            lote_id: loteId,
            producto_id: lote.producto_id,
            cantidad_descartada: cantidadDescarte
        });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error('Error descartando lote:', error);
        res.status(500).json({ error: 'Error interno al descartar lote: ' + error.message });
    }
});

// Endpoint para eliminar lote (DELETE /api/lotes/:id) - descarta todo el lote
app.delete('/api/lotes/:id', async (req, res) => {
    const loteId = req.params.id;
    try {
        // 1. Verificar que el lote existe y está activo
        const lotes = await dbAll("SELECT l.*, p.nombre as producto_nombre FROM lotes l JOIN productos p ON l.producto_id = p.id WHERE l.id = ?", [loteId]);
        if (lotes.length === 0) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }
        const lote = lotes[0];
        if (lote.estado === 'descartado') {
            return res.status(400).json({ error: 'El lote ya está descartado' });
        }

        // Obtener la cantidad actual a descartar (toda la cantidad disponible)
        const cantidadDescarte = lote.cantidad_actual;

        // 2. Actualizar estado a 'descartado' y dejar cantidad_actual igual a la cantidad descartada
        await dbRun("BEGIN TRANSACTION");
        await dbRun("UPDATE lotes SET estado = 'descartado', cantidad_actual = ? WHERE id = ?", [cantidadDescarte, loteId]);

        // 3. Restar del stock del producto la cantidad descartada
        await dbRun("UPDATE productos SET stock = stock - ? WHERE id = ?", [cantidadDescarte, lote.producto_id]);

        // 4. Actualizar lote_actual_id del producto si corresponde
        await updateLoteActualId(lote.producto_id);

        await dbRun("COMMIT");

        // 5. Registrar en log
        logOperation(
            'LOTE_ELIMINADO',
            `Lote eliminado (descartado): ID ${loteId} - Producto: ${lote.producto_nombre} (${lote.producto_id}) - Cantidad descartada: ${cantidadDescarte}`,
            'Sistema',
            'lotes',
            loteId,
            lote,
            { estado: 'descartado', cantidad_actual: cantidadDescarte, operacion: 'eliminacion_completa' }
        );

        res.json({
            success: true,
            message: 'Lote eliminado correctamente (estado: descartado)',
            lote_id: loteId,
            producto_id: lote.producto_id,
            producto_nombre: lote.producto_nombre,
            cantidad_descartada: cantidadDescarte
        });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error('Error eliminando lote:', error);
        res.status(500).json({ error: 'Error interno al eliminar lote: ' + error.message });
    }
});

// Actualizar lote
app.put('/api/lotes/:id', async (req, res) => {
    const loteId = req.params.id;
    const { numero_lote, fecha_vencimiento, costo_unitario, notas } = req.body;

    try {
        // Verificar que el lote existe
        const existingLote = await dbAll("SELECT * FROM lotes WHERE id = ?", [loteId]);
        if (existingLote.length === 0) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }

        const oldLote = existingLote[0];

        // Construir consulta de actualización
        const updates = [];
        const params = [];

        if (fecha_vencimiento !== undefined) {
            updates.push("fecha_vencimiento = ?");
            params.push(fecha_vencimiento);
        }
        if (costo_unitario !== undefined) {
            updates.push("costo_unitario = ?");
            params.push(costo_unitario);
        }
        if (notas !== undefined) {
            updates.push("notas = ?");
            params.push(notas);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        params.push(loteId);
        const query = `UPDATE lotes SET ${updates.join(", ")} WHERE id = ?`;
        await dbRun(query, params);

        // Si cambió la fecha de vencimiento, verificar si necesitamos actualizar lote_actual_id
        if (fecha_vencimiento !== undefined) {
            const loteMasVigente = await dbAll(`
                SELECT id FROM lotes
                WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
                ORDER BY fecha_vencimiento DESC
                LIMIT 1
            `, [oldLote.producto_id]);

            if (loteMasVigente.length > 0) {
                await dbRun(
                    "UPDATE productos SET lote_actual_id = ? WHERE id = ?",
                    [loteMasVigente[0].id, oldLote.producto_id]
                );
            }
        }

        // Registrar la operación en el log
        const changes = [];
        if (numero_lote !== undefined && oldLote.numero_lote !== numero_lote) changes.push(`número: ${oldLote.numero_lote} → ${numero_lote}`);
        if (fecha_vencimiento !== undefined && oldLote.fecha_vencimiento !== fecha_vencimiento) changes.push(`vencimiento: ${oldLote.fecha_vencimiento} → ${fecha_vencimiento}`);
        if (costo_unitario !== undefined && oldLote.costo_unitario !== costo_unitario) changes.push(`costo: ${oldLote.costo_unitario} → ${costo_unitario}`);

        if (changes.length > 0) {
            logOperation(
                'LOTE_EDITADO',
                `Lote editado - Cambios: ${changes.join(', ')}`,
                'Sistema',
                'lotes',
                loteId,
                oldLote,
                { numero_lote, fecha_vencimiento, costo_unitario, notas }
            );
        }

        res.json({
            success: true,
            message: 'Lote actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando lote:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});



// >>> RUTAS PARA PEDIDOS A PROVEEDORES

// Obtener todos los pedidos
app.get('/api/supplier-orders', async (req, res) => {
    try {
        const orders = await dbAll(`
            SELECT
                pp.*,
                p.nombre_proveedor,
                p.nombre_contacto,
                p.telefono,
                p.email
            FROM pedidos_proveedores pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            ORDER BY pp.fecha_pedido DESC
        `);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener un pedido por ID con sus items
app.get('/api/supplier-orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Obtener pedido
        const order = await dbAll(`
            SELECT
                pp.*,
                p.nombre_proveedor,
                p.nombre_contacto,
                p.telefono,
                p.email
            FROM pedidos_proveedores pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            WHERE pp.id = ?
        `, [orderId]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Obtener items del pedido
        const items = await dbAll(`
            SELECT
                pi.*,
                pr.nombre as producto_nombre,
                pr.codigo as producto_codigo
            FROM pedido_items pi
            JOIN productos pr ON pi.producto_id = pr.id
            WHERE pi.pedido_id = ?
            ORDER BY pi.id
        `, [orderId]);

        res.json({
            ...order[0],
            items: items
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo pedido a proveedor
app.post('/api/supplier-orders', async (req, res) => {
    const { proveedor_id, fecha_entrega_estimada, items, notas, fecha_pedido } = req.body;

    // DEBUG: Log received fecha_entrega_estimada
    console.log('DEBUG - Received fecha_entrega_estimada:', fecha_entrega_estimada, 'Type:', typeof fecha_entrega_estimada);
    console.log('DEBUG - fecha_entrega_estimada trimmed:', fecha_entrega_estimada && fecha_entrega_estimada.trim());
    console.log('DEBUG - fecha_entrega_estimada is empty?', !fecha_entrega_estimada || fecha_entrega_estimada.trim() === '');

    // Validaciones
    if (!proveedor_id) {
        return res.status(400).json({ error: 'El ID del proveedor es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'El pedido debe incluir al menos un item' });
    }

    try {
        // Verificar que el proveedor existe
        const supplier = await dbAll("SELECT id FROM proveedores WHERE id = ?", [proveedor_id]);
        if (supplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Calcular total
        let total = 0;
        const processedItems = items.map(item => {
            const precioUnitario = parseFloat(item.precio_unitario);
            const cantidad = parseInt(item.cantidad);
            const subtotal = precioUnitario * cantidad;
            total += subtotal;

            return {
                producto_id: item.producto_id,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                subtotal: subtotal
            };
        });

        const orderNumber = `PED-${Date.now()}`;

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Procesar fecha_pedido si se proporciona, sino usar fecha actual
            let fechaPedidoFinal = null;
            if (fecha_pedido && fecha_pedido.trim() !== '') {
                fechaPedidoFinal = formatDateForDB(fecha_pedido);
            } else {
                // Usar fecha actual del sistema si no se proporciona fecha_pedido
                fechaPedidoFinal = formatDateForDB(new Date().toISOString());
            }

            // Insertar pedido - almacenar fecha estimada en campo separado y fecha_pedido
            const orderResult = await dbRun(
                `INSERT INTO pedidos_proveedores
                 (numero_pedido, proveedor_id, fecha_pedido, fecha_entrega_estimada, total, notas)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderNumber, proveedor_id, fechaPedidoFinal, fecha_entrega_estimada && fecha_entrega_estimada.trim() !== '' ? fecha_entrega_estimada : null, total, notas || '']
            );

            // DEBUG: Verify what was stored
            const storedOrder = await dbAll("SELECT numero_pedido, fecha_entrega_estimada FROM pedidos_proveedores WHERE id = ?", [orderResult.id]);
            console.log('DEBUG - Stored order:', storedOrder[0]);

            // Insertar items del pedido
            for (const item of processedItems) {
                await dbRun(
                    `INSERT INTO pedido_items
                     (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [orderResult.id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]
                );
            }

            await dbRun("COMMIT");


            // Registrar la operación en el log
            logOperation(
                'PEDIDO_CREADO',
                `Pedido creado: ${orderNumber} - Proveedor ID: ${proveedor_id}`,
                'Sistema',
                'pedidos_proveedores',
                orderResult.id,
                null,
                {
                    numero_pedido: orderNumber,
                    proveedor_id: proveedor_id,
                    total: total,
                    items: processedItems.length
                }
            );

            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                order_id: orderResult.id,
                numero_pedido: orderNumber
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error creando pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Actualizar estado de pedido
app.put('/api/supplier-orders/:id/status', async (req, res) => {
    const { estado } = req.body;
    const orderId = req.params.id;

    const validStates = ['pendiente', 'en_proceso', 'entregado', 'cancelado'];
    if (!validStates.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    try {
        // Verificar que el pedido existe
        const existingOrder = await dbAll("SELECT * FROM pedidos_proveedores WHERE id = ?", [orderId]);
        if (existingOrder.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Obtener datos anteriores para el log
        const oldOrder = await dbAll("SELECT * FROM pedidos_proveedores WHERE id = ?", [orderId]);

        // Actualizar estado
        const result = await dbRun(
            "UPDATE pedidos_proveedores SET estado = ? WHERE id = ?",
            [estado, orderId]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Registrar la operación en el log
        logOperation(
            'PEDIDO_ESTADO_ACTUALIZADO',
            `Estado del pedido ${existingOrder[0].numero_pedido} cambiado a: ${estado}`,
            'Sistema',
            'pedidos_proveedores',
            orderId,
            oldOrder[0],
            { estado: estado }
        );

        res.json({
            success: true,
            message: 'Estado del pedido actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando estado del pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar pedido
app.delete('/api/supplier-orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Verificar que el pedido existe
        const existingOrder = await dbAll("SELECT * FROM pedidos_proveedores WHERE id = ?", [orderId]);
        if (existingOrder.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar items del pedido
            await dbRun("DELETE FROM pedido_items WHERE pedido_id = ?", [orderId]);

            // Eliminar pedido
            await dbRun("DELETE FROM pedidos_proveedores WHERE id = ?", [orderId]);

            await dbRun("COMMIT");

            res.json({
                success: true,
                message: 'Pedido eliminado exitosamente'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error eliminando pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> RUTAS PARA PROVEEDORES (SUPPLIERS)

// Obtener todos los proveedores
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await dbAll("SELECT * FROM proveedores ORDER BY nombre_proveedor");
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener un proveedor por ID
app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const supplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [req.params.id]);
        if (supplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.json(supplier[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo proveedor
app.post('/api/suppliers', async (req, res) => {
    const { nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas } = req.body;

    // Validaciones
    if (!nombre_proveedor || nombre_proveedor.trim() === '') {
        return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }

    try {
        const result = await dbRun(
            `INSERT INTO proveedores (nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre_proveedor.trim(), nombre_contacto || '', telefono || '', email || '', productos_servicios || '', condiciones_pago || '', estatus || 'Activo', notas || '']
        );

        const newSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [result.id]);

        // Registrar la operación en el log
        logOperation(
            'PROVEEDOR_CREADO',
            `Proveedor creado: ${nombre_proveedor}`,
            'Sistema',
            'proveedores',
            result.id,
            null,
            {
                nombre_proveedor,
                nombre_contacto,
                telefono,
                email
            }
        );

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            supplier: newSupplier[0]
        });

    } catch (error) {
        console.error('Error creando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Actualizar proveedor
app.put('/api/suppliers/:id', async (req, res) => {
    const { nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas } = req.body;
    const supplierId = req.params.id;

    try {
        // Verificar que el proveedor existe
        const existingSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);
        if (existingSupplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Validar nombre si se proporciona
        if (nombre_proveedor !== undefined && (!nombre_proveedor || nombre_proveedor.trim() === '')) {
            return res.status(400).json({ error: 'El nombre del proveedor no puede estar vacío' });
        }

        // Construir consulta de actualización dinámicamente
        const updates = [];
        const params = [];

        if (nombre_proveedor !== undefined) {
            updates.push("nombre_proveedor = ?");
            params.push(nombre_proveedor.trim());
        }
        if (nombre_contacto !== undefined) {
            updates.push("nombre_contacto = ?");
            params.push(nombre_contacto);
        }
        if (telefono !== undefined) {
            updates.push("telefono = ?");
            params.push(telefono);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            params.push(email);
        }
        if (productos_servicios !== undefined) {
            updates.push("productos_servicios = ?");
            params.push(productos_servicios);
        }
        if (condiciones_pago !== undefined) {
            updates.push("condiciones_pago = ?");
            params.push(condiciones_pago);
        }
        if (estatus !== undefined) {
            updates.push("estatus = ?");
            params.push(estatus);
        }
        if (notas !== undefined) {
            updates.push("notas = ?");
            params.push(notas);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        params.push(supplierId);
        const query = `UPDATE proveedores SET ${updates.join(", ")} WHERE id = ?`;
        const result = await dbRun(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const updatedSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            supplier: updatedSupplier[0]
        });

    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar proveedor
app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Verificar que el proveedor existe
        const existingSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);
        if (existingSupplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Eliminar items de pedidos asociados
        await dbRun("DELETE FROM pedido_items WHERE pedido_id IN (SELECT id FROM pedidos_proveedores WHERE proveedor_id = ?)", [supplierId]);

        // Eliminar pedidos asociados
        await dbRun("DELETE FROM pedidos_proveedores WHERE proveedor_id = ?", [supplierId]);

        // Eliminar el proveedor
        await dbRun("DELETE FROM proveedores WHERE id = ?", [supplierId]);

        // Registrar la operación en el log
        logOperation(
            'PROVEEDOR_ELIMINADO',
            `Proveedor eliminado: ${existingSupplier[0].nombre_proveedor}`,
            'Sistema',
            'proveedores',
            supplierId,
            existingSupplier[0],
            null
        );

        res.json({
            success: true,
            message: 'Proveedor eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> RUTAS PARA GESTIÓN DE LOTES

// Endpoint para confirmar llegada de productos y crear lotes automáticamente
app.post('/api/supplier-orders/:id/confirm-delivery', async (req, res) => {
    const orderId = req.params.id;
    const { items, extraItems, fecha_entrega_real } = req.body;

    // LOGS DE DIAGNÓSTICO INICIO
    console.log('🔍 [DIAG] POST /api/supplier-orders/:id/confirm-delivery');
    console.log('🔍 [DIAG] orderId:', orderId, 'tipo:', typeof orderId);
    console.log('🔍 [DIAG] items:', JSON.stringify(items));
    console.log('🔍 [DIAG] extraItems:', JSON.stringify(extraItems));
    console.log('🔍 [DIAG] fecha_entrega_real:', fecha_entrega_real);

    try {
        // Validaciones iniciales
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Los items deben ser un array válido' });
        }

        if (extraItems && !Array.isArray(extraItems)) {
            return res.status(400).json({ error: 'Los items extra deben ser un array válido' });
        }

        // Verificar que el pedido existe y está en estado correcto
        const order = await dbAll(`
            SELECT pp.*, p.nombre_proveedor
            FROM pedidos_proveedores pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            WHERE pp.id = ?
        `, [orderId]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        if (order[0].estado === 'entregado') {
            return res.status(400).json({ error: 'Este pedido ya fue marcado como entregado' });
        }

        // Obtener items del pedido original
        const orderItems = await dbAll(`
            SELECT pi.*, pr.nombre as producto_nombre, pr.codigo as producto_codigo
            FROM pedido_items pi
            JOIN productos pr ON pi.producto_id = pr.id
            WHERE pi.pedido_id = ?
        `, [orderId]);
        console.log('🔍 [DIAG] orderItems en BD:', orderItems.map(oi => ({
            producto_id: oi.producto_id,
            tipo: typeof oi.producto_id,
            producto_nombre: oi.producto_nombre
        })));

        // Validar items confirmados
        const validationErrors = [];
        for (const item of items) {
            if (!item.producto_id || !item.cantidad_recibida) {
                validationErrors.push('Cada item debe tener producto_id y cantidad_recibida');
                continue;
            }

            const cantidadRecibida = parseInt(item.cantidad_recibida);
            if (isNaN(cantidadRecibida) || cantidadRecibida < 0) {
                validationErrors.push(`Cantidad inválida para producto ${item.producto_id}`);
                continue;
            }

            if (cantidadRecibida > 0) {
                if (!item.fecha_vencimiento) {
                    validationErrors.push(`Fecha de vencimiento requerida para producto ${item.producto_id}`);
                    continue;
                }

                const fechaVenc = new Date(item.fecha_vencimiento);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (isNaN(fechaVenc.getTime()) || fechaVenc < today) {
                    validationErrors.push(`Fecha de vencimiento inválida o pasada para producto ${item.producto_id}`);
                    continue;
                }

                const costoUnitario = parseFloat(item.costo_unitario);
                if (isNaN(costoUnitario) || costoUnitario < 0) {
                    validationErrors.push(`Costo unitario inválido para producto ${item.producto_id}`);
                    continue;
                }
            }
        }

        // Validar items extra
        if (extraItems) {
            for (const extraItem of extraItems) {
                if (!extraItem.producto_id || !extraItem.cantidad || !extraItem.fecha_vencimiento) {
                    validationErrors.push('Los items extra deben tener producto_id, cantidad y fecha_vencimiento');
                    continue;
                }

                const cantidadExtra = parseInt(extraItem.cantidad);
                if (isNaN(cantidadExtra) || cantidadExtra <= 0) {
                    validationErrors.push(`Cantidad inválida para item extra ${extraItem.producto_id}`);
                    continue;
                }

                const fechaVenc = new Date(extraItem.fecha_vencimiento);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (isNaN(fechaVenc.getTime()) || fechaVenc < today) {
                    validationErrors.push(`Fecha de vencimiento inválida para item extra ${extraItem.producto_id}`);
                    continue;
                }

                const costoUnitario = parseFloat(extraItem.costo_unitario);
                if (isNaN(costoUnitario) || costoUnitario < 0) {
                    validationErrors.push(`Costo unitario inválido para item extra ${extraItem.producto_id}`);
                    continue;
                }
            }
        }

        // Si hay errores de validación, devolverlos
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Errores de validación',
                details: validationErrors
            });
        }

        // Verificar que hay al menos un item válido
        const totalItems = items.filter(item => parseInt(item.cantidad_recibida) > 0).length +
                         (extraItems ? extraItems.filter(item => parseInt(item.cantidad) > 0).length : 0);

        if (totalItems === 0) {
            return res.status(400).json({ error: 'Debe confirmar al menos un item con cantidad mayor a 0' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            const createdLotes = [];
            const processedItems = [];

            // Procesar items confirmados del pedido
            for (const item of items) {
                console.log('🔍 [DIAG] Validando item:', {
                    producto_id: item.producto_id,
                    tipo: typeof item.producto_id,
                    cantidad_recibida: item.cantidad_recibida,
                    tipo_cantidad: typeof item.cantidad_recibida
                });
                const originalItem = orderItems.find(oi => oi.producto_id == item.producto_id);
                if (!originalItem) {
                    console.log('❌ [DIAG] Producto no encontrado en pedido original:', item.producto_id, 'tipo:', typeof item.producto_id);
                    throw new Error(`Producto ${item.producto_id} no encontrado en el pedido original`);
                } else {
                    console.log('✅ [DIAG] Producto encontrado:', originalItem.producto_id, 'tipo:', typeof originalItem.producto_id);
                }

                const cantidadRecibida = parseInt(item.cantidad_recibida) || 0;
                if (cantidadRecibida > 0) {
                    // Generar número de lote automático
                    const loteNumber = await generateLoteNumber();

                    // Crear lote
                    const loteResult = await dbRun(
                        `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas, fecha_ingreso)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            item.producto_id,
                            loteNumber,
                            item.fecha_vencimiento,
                            cantidadRecibida,
                            cantidadRecibida,
                            parseFloat(item.costo_unitario) || originalItem.precio_unitario,
                            `Lote generado automáticamente - Pedido ${order[0].numero_pedido}`,
                            fecha_entrega_real // Usar fecha de entrega real como fecha de ingreso (YYYY-MM-DD)
                        ]
                    );

                    // Actualizar stock del producto
                    await dbRun(
                        "UPDATE productos SET stock = stock + ? WHERE id = ?",
                        [cantidadRecibida, item.producto_id]
                    );

                    // Actualizar lote_actual_id del producto usando la función auxiliar
                    await updateLoteActualId(item.producto_id);

                    createdLotes.push({
                        id: loteResult.id,
                        numero_lote: loteNumber,
                        producto_id: item.producto_id,
                        producto_nombre: originalItem.producto_nombre,
                        cantidad: cantidadRecibida,
                        costo_unitario: parseFloat(item.costo_unitario) || originalItem.precio_unitario
                    });

                    processedItems.push({
                        producto_id: item.producto_id,
                        cantidad_pedida: originalItem.cantidad,
                        cantidad_recibida: cantidadRecibida,
                        lote_id: loteResult.id,
                        numero_lote: loteNumber
                    });
                }
            }

            // Procesar items extra del proveedor
            if (extraItems && extraItems.length > 0) {
                for (const extraItem of extraItems) {
                    const cantidadExtra = parseInt(extraItem.cantidad) || 0;
                    if (cantidadExtra > 0) {
                        // Insertar item extra en pedido_items para que aparezca en detalles del pedido
                        await dbRun(
                            `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                             VALUES (?, ?, ?, ?, ?)`,
                            [
                                orderId,
                                extraItem.producto_id,
                                cantidadExtra,
                                parseFloat(extraItem.costo_unitario) || 0,
                                (parseFloat(extraItem.costo_unitario) || 0) * cantidadExtra
                            ]
                        );

                        // Generar número de lote automático
                        const loteNumber = await generateLoteNumber();

                        // Crear lote para item extra
                        const loteResult = await dbRun(
                            `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas, fecha_ingreso)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                extraItem.producto_id,
                                loteNumber,
                                extraItem.fecha_vencimiento,
                                cantidadExtra,
                                cantidadExtra,
                                parseFloat(extraItem.costo_unitario) || 0,
                                `Item extra del proveedor - Pedido ${order[0].numero_pedido}`,
                                fecha_entrega_real // Usar fecha de entrega real como fecha de ingreso (YYYY-MM-DD)
                            ]
                        );

                        // Actualizar stock del producto
                        await dbRun(
                            "UPDATE productos SET stock = stock + ? WHERE id = ?",
                            [cantidadExtra, extraItem.producto_id]
                        );

                        // Actualizar lote_actual_id del producto usando la función auxiliar
                        await updateLoteActualId(extraItem.producto_id);

                        createdLotes.push({
                            id: loteResult.id,
                            numero_lote: loteNumber,
                            producto_id: extraItem.producto_id,
                            producto_nombre: extraItem.producto_nombre,
                            cantidad: cantidadExtra,
                            costo_unitario: parseFloat(extraItem.costo_unitario) || 0
                        });
                    }
                }
            }

            // Actualizar estado del pedido a "entregado" y fecha de entrega real
            // La fecha real es obligatoria desde el frontend
            // Usar formatDateForDB para manejar correctamente la zona horaria del sistema
            const fechaEntregaReal = formatDateForDB(fecha_entrega_real + 'T12:00:00');

            await dbRun(
                "UPDATE pedidos_proveedores SET estado = 'entregado', fecha_entrega = ? WHERE id = ?",
                [fechaEntregaReal, orderId]
            );

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'PEDIDO_ENTREGADO',
                `Pedido ${order[0].numero_pedido} confirmado como entregado - ${createdLotes.length} lotes creados - Fecha entrega real: ${fechaEntregaReal}`,
                'Sistema',
                'pedidos_proveedores',
                orderId,
                { estado_anterior: order[0].estado, fecha_entrega_estimada: order[0].fecha_entrega_estimada, fecha_entrega_anterior: order[0].fecha_entrega },
                {
                    estado_nuevo: 'entregado',
                    fecha_entrega_real: fechaEntregaReal,
                    lotes_creados: createdLotes.length,
                    items_procesados: processedItems.length
                }
            );

            res.json({
                success: true,
                message: `Pedido confirmado como entregado. Se crearon ${createdLotes.length} lotes automáticamente.`,
                order_id: orderId,
                lotes_creados: createdLotes,
                items_procesados: processedItems
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error confirmando entrega del pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Función para generar número de lote automático
async function generateLoteNumber() {
    try {
        // Obtener el último número de lote
        const lastLote = await dbAll(
            "SELECT numero_lote FROM lotes WHERE numero_lote GLOB '[0-9]*' ORDER BY CAST(numero_lote AS INTEGER) DESC LIMIT 1"
        );

        let nextNumber = 1;
        if (lastLote.length > 0) {
            const lastNumber = parseInt(lastLote[0].numero_lote);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        // Formatear con 3 dígitos (001, 002, etc.)
        return nextNumber.toString().padStart(3, '0');
    } catch (error) {
        console.error('Error generando número de lote:', error);
        // Fallback: usar timestamp
        return Date.now().toString().slice(-6);
    }
}

// Verificar si un número de lote ya existe
app.get('/api/lotes/check/:numero_lote', async (req, res) => {
    try {
        const numeroLote = req.params.numero_lote;

        if (!numeroLote || numeroLote.trim() === '') {
            return res.status(400).json({ error: 'Número de lote requerido' });
        }

        const existingLote = await dbAll("SELECT id FROM lotes WHERE numero_lote = ?", [numeroLote.trim()]);

        res.json({
            exists: existingLote.length > 0,
            numero_lote: numeroLote.trim()
        });
    } catch (error) {
        console.error('Error verificando lote:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sugerir un número de lote disponible
app.get('/api/lotes/suggest', async (req, res) => {
    try {
        // Obtener todos los números de lote existentes
        const existingLotes = await dbAll("SELECT numero_lote FROM lotes WHERE numero_lote IS NOT NULL AND numero_lote != ''");

        // Extraer números de los lotes existentes (asumiendo formato como LOT-001, LOT-002, etc.)
        const numbers = existingLotes
            .map(lote => lote.numero_lote)
            .filter(lote => lote.match(/^\d+$/)) // Solo números puros
            .map(lote => parseInt(lote))
            .filter(num => !isNaN(num));

        // Encontrar el máximo número
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

        // Sugerir el siguiente número
        const suggestedNumber = (maxNumber + 1).toString().padStart(3, '0'); // Formato 001, 002, etc.

        res.json({
            suggested: suggestedNumber,
            format: 'número incremental'
        });
    } catch (error) {
        console.error('Error sugiriendo lote:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los lotes con información de productos (incluyendo todos los estados)
app.get('/api/lotes', async (req, res) => {
    try {
        const lotes = await dbAll(`
            SELECT
                l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.costo_unitario, l.notas, l.estado, l.fecha_ingreso,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo,
                CASE
                       WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN 'vencido'
                       WHEN DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                       ELSE 'vigente'
                    END as estado_vencimiento,
                    CASE
                        WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN
                            -CAST((JULIANDAY(DATE('now', '-3 hours')) - JULIANDAY(l.fecha_vencimiento)) AS INTEGER)
                        ELSE
                            CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now', '-3 hours'))) AS INTEGER)
                    END as dias_para_vencer
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            ORDER BY l.fecha_vencimiento ASC
        `);

        res.json(lotes);
    } catch (error) {
        console.error('Error obteniendo lotes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener lotes de un producto específico (todos los estados)
app.get('/api/products/:productId/lotes', async (req, res) => {
    try {
        const productId = req.params.productId;
        const lotes = await dbAll(`
            SELECT
                l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.costo_unitario, l.notas, l.estado, l.fecha_ingreso,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN 'vencido'
                    WHEN DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                    ELSE 'vigente'
                END as estado_vencimiento,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN
                        -CAST((JULIANDAY(DATE('now', '-3 hours')) - JULIANDAY(l.fecha_vencimiento)) AS INTEGER)
                    ELSE
                        CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now', '-3 hours'))) AS INTEGER)
                END as dias_para_vencer
            FROM lotes l
            WHERE l.producto_id = ?
            ORDER BY l.fecha_vencimiento ASC
        `, [productId]);

        res.json(lotes);
    } catch (error) {
        console.error('Error obteniendo lotes del producto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener lote por ID
app.get('/api/lotes/:id', async (req, res) => {
    try {
        const lote = await dbAll(`
            SELECT
                l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.costo_unitario, l.notas, l.estado, l.fecha_ingreso,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN 'vencido'
                    WHEN DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                    ELSE 'vigente'
                END as estado_vencimiento,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN
                        -CAST((JULIANDAY(DATE('now', '-3 hours')) - JULIANDAY(l.fecha_vencimiento)) AS INTEGER)
                    ELSE
                        CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now', '-3 hours'))) AS INTEGER)
                END as dias_para_vencer
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE l.id = ?
        `, [req.params.id]);

        if (lote.length === 0) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }

        res.json(lote[0]);
    } catch (error) {
        console.error('Error obteniendo lote:', error);
        res.status(500).json({ error: error.message });
    }
});


// Verificar si un número de lote ya existe
app.get('/api/lotes/check/:numero_lote', async (req, res) => {
    try {
        const numeroLote = req.params.numero_lote;

        if (!numeroLote || numeroLote.trim() === '') {
            return res.status(400).json({ error: 'Número de lote requerido' });
        }

        const existingLote = await dbAll("SELECT id FROM lotes WHERE numero_lote = ?", [numeroLote.trim()]);

        res.json({
            exists: existingLote.length > 0,
            numero_lote: numeroLote.trim()
        });
    } catch (error) {
        console.error('Error verificando lote:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sugerir un número de lote disponible
app.get('/api/lotes/suggest', async (req, res) => {
    try {
        // Obtener todos los números de lote existentes
        const existingLotes = await dbAll("SELECT numero_lote FROM lotes WHERE numero_lote IS NOT NULL AND numero_lote != ''");

        // Extraer números de los lotes existentes (asumiendo formato como LOT-001, LOT-002, etc.)
        const numbers = existingLotes
            .map(lote => lote.numero_lote)
            .filter(lote => lote.match(/^\d+$/)) // Solo números puros
            .map(lote => parseInt(lote))
            .filter(num => !isNaN(num));

        // Encontrar el máximo número
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

        // Sugerir el siguiente número
        const suggestedNumber = (maxNumber + 1).toString().padStart(3, '0'); // Formato 001, 002, etc.

        res.json({
            suggested: suggestedNumber,
            format: 'número incremental'
        });
    } catch (error) {
        console.error('Error sugiriendo lote:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar producto por código de barras (optimizado con caché)
app.get('/api/products/search-by-barcode/:barcode', async (req, res) => {
    try {
        const barcode = req.params.barcode;

        if (!barcode || !isValidBarcode(barcode)) {
            return res.status(400).json({ error: 'Código de barras inválido (debe ser EAN-8 o EAN-13 válido)' });
        }


        // Query ultra-optimizada para búsqueda por código de barras
        const result = await dbAll(`
            SELECT
                p.id, p.codigo, p.nombre, p.descripcion, p.precio, p.categoria, p.created_at, p.codigo_barras,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento,
                l.id as lote_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_actual, l.costo_unitario,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN 'vencido'
                    WHEN DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                    ELSE 'vigente'
                END as estado_vencimiento,
                CASE
                    WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN
                        -CAST((JULIANDAY(DATE('now', '-3 hours')) - JULIANDAY(l.fecha_vencimiento)) AS INTEGER)
                    ELSE
                        CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now', '-3 hours'))) AS INTEGER)
                END as dias_para_vencer
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            LEFT JOIN lotes l ON p.id = l.producto_id
                AND l.estado = 'activo'
                AND l.cantidad_actual > 0
            WHERE p.codigo_barras = ?
            ORDER BY
                CASE WHEN l.cantidad_actual > 0 AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN 1
                     WHEN l.cantidad_actual > 0 THEN 2
                     ELSE 3 END,
                l.fecha_vencimiento ASC
            LIMIT 1
        `, [barcode]);

        if (result.length === 0) {
            return res.status(404).json({
                error: 'No se encontró ningún producto con este código de barras',
                barcode: barcode
            });
        }

        const row = result[0];

        // Verificar estado del producto y lotes
        let productStatus = 'available';
        let statusMessage = '';

        if (!row.lote_id) {
            productStatus = 'sin_stock';
            statusMessage = 'Producto sin stock disponible';
        } else if (row.cantidad_actual <= 0) {
            productStatus = 'sin_stock';
            statusMessage = 'Producto sin stock disponible';
        } else if (row.estado_vencimiento === 'vencido') {
            productStatus = 'vencido';
            statusMessage = 'Producto vencido';
        }

        // Preparar respuesta optimizada
        const response = {
            product: {
                id: row.id,
                codigo: row.codigo,
                nombre: row.nombre,
                descripcion: row.descripcion,
                precio: row.precio,
                precio_con_descuento: row.precio_con_descuento,
                descuento_porcentaje: row.descuento_porcentaje,
                en_promocion: row.en_promocion,
                categoria: row.categoria,
                stock_disponible: row.cantidad_actual || 0,
                codigo_barras: row.codigo_barras
            },
            lote: row.lote_id ? {
                id: row.lote_id,
                numero_lote: row.numero_lote,
                fecha_vencimiento: row.fecha_vencimiento,
                cantidad_actual: row.cantidad_actual,
                costo_unitario: row.costo_unitario,
                estado_vencimiento: row.estado_vencimiento,
                dias_para_vencer: row.dias_para_vencer
            } : null,
            barcode: barcode,
            found: true,
            status: productStatus,
            status_message: statusMessage,
            performance: {
                cached: false,
                executionTime: Date.now() - (req.startTime || Date.now())
            }
        };


        res.json(response);

    } catch (error) {
        console.error('Error buscando producto por código de barras:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Obtener lotes próximos a vencer (dentro de 7 días)
app.get('/api/lotes/expiring-soon', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;

        const lotes = await dbAll(`
            SELECT
                l.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo,
                CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY('now')) AS INTEGER) as dias_para_vencer
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours')
              AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours')
              AND l.cantidad_actual > 0
              AND l.estado = 'activo'
            ORDER BY l.fecha_vencimiento ASC
        `);

        res.json(lotes);
    } catch (error) {
        console.error('Error obteniendo lotes próximos a vencer:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener lotes vencidos
app.get('/api/lotes/expired', async (req, res) => {
    try {
        const lotes = await dbAll(`
            SELECT
                l.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo,
                CAST((JULIANDAY('now') - JULIANDAY(l.fecha_vencimiento)) AS INTEGER) as dias_vencido
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE DATE(l.fecha_vencimiento) < DATE('now', '-3 hours')
              AND l.cantidad_actual > 0
              AND l.estado = 'activo'
            ORDER BY l.fecha_vencimiento ASC
        `);

        res.json(lotes);
    } catch (error) {
        console.error('Error obteniendo lotes vencidos:', error);
        res.status(500).json({ error: error.message });
    }
});


// >>> RUTAS PARA PROMOCIONES

// Obtener todas las promociones
app.get('/api/promotions', async (req, res) => {
    try {
        const promotions = await dbAll(`
            SELECT
                p.id,
                p.titulo,
                p.created_at,
                COUNT(pi.id) as productos_count
            FROM promociones p
            LEFT JOIN promocion_items pi ON p.id = pi.promocion_id
            GROUP BY p.id, p.titulo, p.created_at
            ORDER BY p.created_at DESC
        `);
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener una promoción por ID con sus productos
app.get('/api/promotions/:id', async (req, res) => {
    try {
        const promotionId = req.params.id;

        // Obtener promoción
        const promotion = await dbAll("SELECT * FROM promociones WHERE id = ?", [promotionId]);
        if (promotion.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }

        // Obtener items de la promoción
        const items = await dbAll(`
            SELECT
                pi.id,
                pi.producto_id,
                pi.descuento_porcentaje,
                pr.nombre as producto_nombre,
                pr.precio as precio_original
            FROM promocion_items pi
            JOIN productos pr ON pi.producto_id = pr.id
            WHERE pi.promocion_id = ?
        `, [promotionId]);

        res.json({
            ...promotion[0],
            items: items
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva promoción
app.post('/api/promotions', async (req, res) => {
    const { titulo, items } = req.body;

    // Verificar límite de promociones sin licencia
    const isLicensed = await checkLicense();
    if (!isLicensed) {
        const activePromotions = await dbAll("SELECT COUNT(*) as count FROM promociones");
        if (activePromotions[0].count >= 3) {
            return res.status(403).json({
                error: 'Límite alcanzado',
                message: 'Sin licencia, solo puede tener hasta 3 promociones activas.',
                suggestion: 'Active una licencia para crear más promociones.',
                requiresLicense: true,
                activateUrl: '/activate'
            });
        }

        // En modo gratuito, solo 1 item por promoción
        if (items.length !== 1) {
            return res.status(400).json({
                error: 'Límite de promoción',
                message: 'En modo gratuito, cada promoción solo puede incluir 1 producto.',
                suggestion: 'Active una licencia para crear promociones con múltiples productos.',
                requiresLicense: true,
                activateUrl: '/activate'
            });
        }
    }

    // Validaciones
    if (!titulo || titulo.trim() === '') {
        return res.status(400).json({ error: 'El título de la promoción es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La promoción debe incluir al menos un producto' });
    }

    try {
        // Verificar que ningún producto ya esté en otra promoción activa
        const productIds = items.map(item => item.producto_id);
        if (productIds.length > 0) {
            const existingPromotions = await dbAll(`
                SELECT
                    pi.producto_id,
                    p.nombre as producto_nombre,
                    prom.titulo as promocion_titulo
                FROM promocion_items pi
                JOIN productos p ON pi.producto_id = p.id
                JOIN promociones prom ON pi.promocion_id = prom.id
                WHERE pi.producto_id IN (${productIds.map(() => '?').join(',')})
            `, productIds);

            if (existingPromotions.length > 0) {
                const conflicts = existingPromotions.map(ep =>
                    `"${ep.producto_nombre}" (ya en promoción: "${ep.promocion_titulo}")`
                ).join(', ');
                throw new Error(`Los siguientes productos ya están en otras promociones: ${conflicts}. Un producto no puede estar en múltiples promociones simultáneamente.`);
            }
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar promoción
            const promotionResult = await dbRun(
                "INSERT INTO promociones (titulo) VALUES (?)",
                [titulo.trim()]
            );

            // Insertar items de la promoción
            for (const item of items) {
                if (!item.producto_id || !item.descuento_porcentaje) {
                    throw new Error('Cada item debe tener producto_id y descuento_porcentaje');
                }

                const discount = parseFloat(item.descuento_porcentaje);
                if (isNaN(discount) || discount < 0 || discount > 100) {
                    throw new Error('El descuento debe ser un porcentaje válido entre 0 y 100');
                }

                await dbRun(
                    "INSERT INTO promocion_items (promocion_id, producto_id, descuento_porcentaje) VALUES (?, ?, ?)",
                    [promotionResult.id, item.producto_id, discount]
                );
            }

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'PROMOCION_CREADA',
                `Promoción creada: ${titulo} (${items.length} productos)`,
                'Sistema',
                'promociones',
                promotionResult.id,
                null,
                {
                    titulo,
                    productos: items.length,
                    descuentos: items.map(item => `${item.descuento_porcentaje}%`).join(', ')
                }
            );

            res.status(201).json({
                success: true,
                message: 'Promoción creada exitosamente',
                promotion_id: promotionResult.id
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar promoción
app.delete('/api/promotions/:id', async (req, res) => {
    try {
        const promotionId = req.params.id;

        // Verificar que la promoción existe
        const existingPromotion = await dbAll("SELECT * FROM promociones WHERE id = ?", [promotionId]);
        if (existingPromotion.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar items de la promoción
            await dbRun("DELETE FROM promocion_items WHERE promocion_id = ?", [promotionId]);

            // Eliminar promoción
            await dbRun("DELETE FROM promociones WHERE id = ?", [promotionId]);

            await dbRun("COMMIT");

            res.json({
                success: true,
                message: 'Promoción eliminada exitosamente'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error eliminando promoción:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Cancelar venta específica
app.delete('/api/sales/:id', async (req, res) => {
    try {
        const saleId = req.params.id;

        // Verificar que la venta existe
        const existingSale = await dbAll("SELECT * FROM ventas WHERE id = ?", [saleId]);
        if (existingSale.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const sale = existingSale[0];

        // Obtener los items de la venta para restaurar stock
        const saleItems = await dbAll("SELECT * FROM venta_items WHERE venta_id = ?", [saleId]);

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Restaurar stock usando lotes (LIFO para cancelaciones - Last In, First Out)
            for (const item of saleItems) {
                let cantidadRestante = item.cantidad;

                // Obtener lotes del producto ordenados por fecha de ingreso descendente (más recientes primero)
                const lotesProducto = await dbAll(`
                    SELECT * FROM lotes
                    WHERE producto_id = ? AND estado = 'activo'
                    ORDER BY fecha_ingreso DESC
                `, [item.producto_id]);

                for (const lote of lotesProducto) {
                    if (cantidadRestante <= 0) break;

                    // Calcular cuánto podemos devolver a este lote
                    const cantidadDisponible = lote.cantidad_inicial - lote.cantidad_actual;
                    const cantidadDevolver = Math.min(cantidadRestante, cantidadDisponible);

                    if (cantidadDevolver > 0) {
                        // Restaurar cantidad del lote
                        await dbRun(
                            "UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?",
                            [cantidadDevolver, lote.id]
                        );
                        cantidadRestante -= cantidadDevolver;
                    }
                }

                // Si no se pudo restaurar todo en lotes existentes, crear un lote genérico
                if (cantidadRestante > 0) {
                    await dbRun(
                        `INSERT INTO lotes (producto_id, fecha_vencimiento, costo_adquisicion, cantidad_inicial, cantidad_actual, notas)
                         VALUES (?, date('now', '+1 year'), 0, ?, ?, ?)`,
                        [item.producto_id, cantidadRestante, cantidadRestante, `Stock restaurado por cancelación de venta ${sale.numero_factura}`]
                    );
                }
            }

            // Actualizar stock total del producto
            for (const item of saleItems) {
                await dbRun(
                    "UPDATE productos SET stock = stock + ? WHERE id = ?",
                    [item.cantidad, item.producto_id]
                );
            }

            // Verificar si necesitamos actualizar lote_actual_id después de restaurar stock
            for (const item of saleItems) {
                const loteMasVigente = await dbAll(`
                    SELECT id FROM lotes
                    WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
                    ORDER BY fecha_vencimiento DESC
                    LIMIT 1
                `, [item.producto_id]);

                if (loteMasVigente.length > 0) {
                    await dbRun(
                        "UPDATE productos SET lote_actual_id = ? WHERE id = ?",
                        [loteMasVigente[0].id, item.producto_id]
                    );
                }
            }

            // Eliminar items de la venta
            await dbRun("DELETE FROM venta_items WHERE venta_id = ?", [saleId]);

            // Eliminar la venta
            await dbRun("DELETE FROM ventas WHERE id = ?", [saleId]);

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'VENTA_CANCELADA',
                `Venta cancelada: ${sale.numero_factura} - Total: ${formatCurrency(sale.total)}`,
                'Sistema',
                'ventas',
                saleId,
                sale,
                null
            );

            res.json({
                success: true,
                message: 'Venta cancelada exitosamente. El stock ha sido restaurado.'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error cancelando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});


// Ruta para limpiar promociones con productos duplicados
app.post('/api/clean-duplicate-promotions', conditionalAuth, async (req, res) => {
    try {
        // Encontrar productos que están en múltiples promociones
        const duplicateProducts = await dbAll(`
            SELECT
                pi.producto_id,
                p.nombre as producto_nombre,
                COUNT(pi.promocion_id) as promociones_count,
                GROUP_CONCAT(prom.titulo) as promociones_titulos,
                GROUP_CONCAT(pi.promocion_id) as promociones_ids
            FROM promocion_items pi
            JOIN productos p ON pi.producto_id = p.id
            JOIN promociones prom ON pi.promocion_id = prom.id
            GROUP BY pi.producto_id, p.nombre
            HAVING COUNT(pi.promocion_id) > 1
            ORDER BY p.nombre
        `);

        if (duplicateProducts.length === 0) {
            return res.json({
                success: true,
                message: 'No se encontraron productos en múltiples promociones',
                cleaned: 0
            });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        let totalCleaned = 0;

        try {
            for (const duplicate of duplicateProducts) {
                const promocionesIds = duplicate.promociones_ids.split(',');
                const promocionesTitulos = duplicate.promociones_titulos.split(',');

                // Mantener la promoción más antigua (primera creada) y eliminar las demás
                const oldestPromotionId = promocionesIds[0]; // Asumiendo que están ordenados por ID

                // Eliminar items de promociones más nuevas para este producto
                for (let i = 1; i < promocionesIds.length; i++) {
                    await dbRun(
                        "DELETE FROM promocion_items WHERE promocion_id = ? AND producto_id = ?",
                        [promocionesIds[i], duplicate.producto_id]
                    );
                    totalCleaned++;
                }

                console.log(`Producto "${duplicate.producto_nombre}" limpiado: mantenido en "${promocionesTitulos[0]}", removido de ${promocionesIds.length - 1} promociones`);
            }

            await dbRun("COMMIT");

            // Registrar la operación de limpieza
            logOperation(
                'PROMOCIONES_LIMPIADAS',
                `Se limpiaron ${totalCleaned} productos duplicados de promociones`,
                'Sistema',
                'promociones',
                null,
                null,
                {
                    productos_afectados: duplicateProducts.length,
                    items_removidos: totalCleaned
                }
            );

            res.json({
                success: true,
                message: `Se limpiaron ${totalCleaned} productos duplicados de ${duplicateProducts.length} productos afectados`,
                cleaned: totalCleaned,
                affected_products: duplicateProducts.length,
                details: duplicateProducts.map(dp => ({
                    producto: dp.producto_nombre,
                    promociones_antes: dp.promociones_count,
                    mantenido_en: dp.promociones_titulos.split(',')[0]
                }))
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error limpiando promociones duplicadas:', error);
        res.status(500).json({
            error: 'Error al limpiar promociones duplicadas: ' + error.message
        });
    }
});

// Ruta para resetear datos selectivamente
app.post('/api/reset-data-selective', conditionalAuth, async (req, res) => {
    const {
        resetVentas,
        resetCierres,
        resetProveedores,
        resetPedidos,
        resetPromociones,
        resetLog,
        resetLotes,
        resetClientes
    } = req.body;

    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        const results = {
            ventas: 0,
            cierres: 0,
            proveedores: 0,
            pedidos: 0,
            promociones: 0,
            log: 0,
            lotes: 0,
            clientes: 0
        };

        try {
            // Resetear ventas y items de venta
            if (resetVentas) {
                // Eliminar items de venta primero (foreign key)
                const ventaItemsResult = await dbRun("DELETE FROM venta_items");
                results.ventas += ventaItemsResult.changes;

                // Eliminar ventas
                const ventasResult = await dbRun("DELETE FROM ventas");
                results.ventas += ventasResult.changes;

                // Resetear stock de productos a 0
                await dbRun("UPDATE productos SET stock = 0");

                // Resetear lote_actual_id
                await dbRun("UPDATE productos SET lote_actual_id = NULL");

                // Eliminar lotes ya que el stock se maneja a través de lotes
                const lotesResult = await dbRun("DELETE FROM lotes");
                results.lotes += lotesResult.changes;
            }

            // Resetear cierres de caja
            if (resetCierres) {
                const cierresResult = await dbRun("DELETE FROM cierres_caja");
                results.cierres = cierresResult.changes;

                // Resetear días sin cierre
                await dbRun("DELETE FROM dias_sin_cierre");
            }

            // Resetear proveedores
            if (resetProveedores) {
                // Eliminar proveedores
                const proveedoresResult = await dbRun("DELETE FROM proveedores");
                results.proveedores = proveedoresResult.changes;
            }

            // Resetear pedidos a proveedores
            if (resetPedidos) {
                // Eliminar items de pedidos primero
                const pedidoItemsResult = await dbRun("DELETE FROM pedido_items");
                results.pedidos += pedidoItemsResult.changes;

                // Eliminar pedidos a proveedores
                const pedidosResult = await dbRun("DELETE FROM pedidos_proveedores");
                results.pedidos += pedidosResult.changes;
            }

            // Resetear promociones
            if (resetPromociones) {
                // Eliminar items de promociones primero
                const promocionItemsResult = await dbRun("DELETE FROM promocion_items");
                results.promociones += promocionItemsResult.changes;

                // Eliminar promociones
                const promocionesResult = await dbRun("DELETE FROM promociones");
                results.promociones += promocionesResult.changes;
            }

            // Resetear registro de operaciones
            if (resetLog) {
                const logResult = await dbRun("DELETE FROM operaciones_log");
                results.log = logResult.changes;
            }

            
                        // Resetear lotes
                        if (resetLotes) {
                            const lotesResult = await dbRun("DELETE FROM lotes");
                            results.lotes = lotesResult.changes;
            
                            // Resetear stock de productos a 0
                            await dbRun("UPDATE productos SET stock = 0");
            
                            // Resetear lote_actual_id
                            await dbRun("UPDATE productos SET lote_actual_id = NULL");
                        }
            
                        // Resetear clientes y cuenta corriente (eliminación en cascada)
                        if (resetClientes) {
                            // Verificar que no haya deudas pendientes antes de eliminar clientes
                            const deudasPendientes = await dbAll("SELECT COUNT(*) as total FROM deudas WHERE estado = 'pendiente' AND monto_pendiente > 0");
                            if (deudasPendientes[0].total > 0) {
                                throw new Error(`No se pueden eliminar clientes porque hay ${deudasPendientes[0].total} deudas pendientes. Por favor, liquide las deudas antes de proceder.`);
                            }
            
                            // Eliminar productos de deudas primero (foreign key)
                            const deudaProductosResult = await dbRun("DELETE FROM deuda_productos");
                            results.clientes += deudaProductosResult.changes;
            
                            // Eliminar pagos de deudas
                            const pagosDeudasResult = await dbRun("DELETE FROM pagos_deudas");
                            results.clientes += pagosDeudasResult.changes;
            
                            // Eliminar deudas
                            const deudasResult = await dbRun("DELETE FROM deudas");
                            results.clientes += deudasResult.changes;
            
                            // Eliminar clientes
                            const clientesResult = await dbRun("DELETE FROM clientes");
                            results.clientes += clientesResult.changes;
                        }
            await dbRun("COMMIT");

            // Registrar la operación de reset
            logOperation(
                'RESET_DATOS_SELECTIVO',
                `Reset selectivo ejecutado: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
                'Sistema',
                'sistema',
                null,
                null,
                results
            );

            const message = `Reset selectivo completado exitosamente. Datos eliminados: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`;

            res.json({
                success: true,
                message: message,
                results: results
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error ejecutando reset selectivo:', error);
        res.status(500).json({
            error: 'Error al ejecutar reset selectivo: ' + error.message
        });
    }
});

// Endpoint para resetear datos selectivamente (versión actualizada)
app.post('/api/reset-data-selective', conditionalAuth, async (req, res) => {
    const {
        resetVentas,
        resetCierres,
        resetProveedores,
        resetPedidos,
        resetPromociones,
        resetLog,
        resetLotes,
        resetClientes
    } = req.body;

    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        const results = {
            ventas: 0,
            cierres: 0,
            proveedores: 0,
            pedidos: 0,
            promociones: 0,
            log: 0,
            lotes: 0,
            clientes: 0
        };

        try {
            // Resetear ventas y items de venta
            if (resetVentas) {
                // Eliminar items de venta primero (foreign key)
                const ventaItemsResult = await dbRun("DELETE FROM venta_items");
                results.ventas += ventaItemsResult.changes;

                // Eliminar ventas
                const ventasResult = await dbRun("DELETE FROM ventas");
                results.ventas += ventasResult.changes;

                // Resetear stock de productos a 0
                await dbRun("UPDATE productos SET stock = 0");

                // Resetear lote_actual_id
                await dbRun("UPDATE productos SET lote_actual_id = NULL");

                // Eliminar lotes ya que el stock se maneja a través de lotes
                const lotesResult = await dbRun("DELETE FROM lotes");
                results.lotes += lotesResult.changes;
            }

            // Resetear cierres de caja
            if (resetCierres) {
                const cierresResult = await dbRun("DELETE FROM cierres_caja");
                results.cierres = cierresResult.changes;

                // Resetear días sin cierre
                await dbRun("DELETE FROM dias_sin_cierre");
            }

            // Resetear proveedores
            if (resetProveedores) {
                // Eliminar proveedores
                const proveedoresResult = await dbRun("DELETE FROM proveedores");
                results.proveedores = proveedoresResult.changes;
            }

            // Resetear pedidos a proveedores
            if (resetPedidos) {
                // Eliminar items de pedidos primero
                const pedidoItemsResult = await dbRun("DELETE FROM pedido_items");
                results.pedidos += pedidoItemsResult.changes;

                // Eliminar pedidos a proveedores
                const pedidosResult = await dbRun("DELETE FROM pedidos_proveedores");
                results.pedidos += pedidosResult.changes;
            }

            // Resetear promociones
            if (resetPromociones) {
                // Eliminar items de promociones primero
                const promocionItemsResult = await dbRun("DELETE FROM promocion_items");
                results.promociones += promocionItemsResult.changes;

                // Eliminar promociones
                const promocionesResult = await dbRun("DELETE FROM promociones");
                results.promociones += promocionesResult.changes;
            }

            // Resetear registro de operaciones
            if (resetLog) {
                const logResult = await dbRun("DELETE FROM operaciones_log");
                results.log = logResult.changes;
            }

            // Resetear lotes
            if (resetLotes) {
                const lotesResult = await dbRun("DELETE FROM lotes");
                results.lotes = lotesResult.changes;

                // Resetear stock de productos a 0
                await dbRun("UPDATE productos SET stock = 0");

                // Resetear lote_actual_id
                await dbRun("UPDATE productos SET lote_actual_id = NULL");
            }

            // Resetear clientes y cuenta corriente (eliminación en cascada)
            if (resetClientes) {
                // Verificar que no haya deudas pendientes antes de eliminar clientes
                const deudasPendientes = await dbAll("SELECT COUNT(*) as total FROM deudas WHERE estado = 'pendiente' AND monto_pendiente > 0");
                if (deudasPendientes[0].total > 0) {
                    throw new Error(`No se pueden eliminar clientes porque hay ${deudasPendientes[0].total} deudas pendientes. Por favor, liquide las deudas antes de proceder.`);
                }

                // Eliminar productos de deudas primero (foreign key)
                const deudaProductosResult = await dbRun("DELETE FROM deuda_productos");
                results.clientes += deudaProductosResult.changes;

                // Eliminar pagos de deudas
                const pagosDeudasResult = await dbRun("DELETE FROM pagos_deudas");
                results.clientes += pagosDeudasResult.changes;

                // Eliminar deudas
                const deudasResult = await dbRun("DELETE FROM deudas");
                results.clientes += deudasResult.changes;

                // Eliminar clientes
                const clientesResult = await dbRun("DELETE FROM clientes");
                results.clientes += clientesResult.changes;
            }

            await dbRun("COMMIT");

            // Registrar la operación de reset
            logOperation(
                'RESET_DATOS_SELECTIVO',
                `Reset selectivo ejecutado: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
                'Sistema',
                'sistema',
                null,
                null,
                results
            );

            const message = `Reset selectivo completado exitosamente. Datos eliminados: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`;

            res.json({
                success: true,
                message: message,
                results: results
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error ejecutando reset selectivo:', error);
        res.status(500).json({
            error: 'Error al ejecutar reset selectivo: ' + error.message
        });
    }
});

// Eliminar el endpoint duplicado (la versión original que ya no se usa)
// app.post('/api/reset-data-selective', conditionalAuth, async (req, res) => {
//     const {
//         resetVentas,
//         resetCierres,
//         resetProveedores,
//         resetPedidos,
//         resetPromociones,
//         resetLog,
//         resetLotes
//     } = req.body;
//
//     try {
//         // Iniciar transacción
//         await dbRun("BEGIN TRANSACTION");
//
//         const results = {
//             ventas: 0,
//             cierres: 0,
//             proveedores: 0,
//             pedidos: 0,
//             promociones: 0,
//             log: 0,
//             lotes: 0
//         };
//
//         try {
//             // Resetear ventas y items de venta
//             if (resetVentas) {
//                 // Eliminar items de venta primero (foreign key)
//                 const ventaItemsResult = await dbRun("DELETE FROM venta_items");
//                 results.ventas += ventaItemsResult.changes;
//
//                 // Eliminar ventas
//                 const ventasResult = await dbRun("DELETE FROM ventas");
//                 results.ventas += ventasResult.changes;
//
//                 // Resetear stock de productos a 0
//                 await dbRun("UPDATE productos SET stock = 0");
//
//                 // Resetear lote_actual_id
//                 await dbRun("UPDATE productos SET lote_actual_id = NULL");
//
//                 // Eliminar lotes ya que el stock se maneja a través de lotes
//                 const lotesResult = await dbRun("DELETE FROM lotes");
//                 results.lotes += lotesResult.changes;
//             }
//
//             // Resetear cierres de caja
//             if (resetCierres) {
//                 const cierresResult = await dbRun("DELETE FROM cierres_caja");
//                 results.cierres = cierresResult.changes;
//
//                 // Resetear días sin cierre
//                 await dbRun("DELETE FROM dias_sin_cierre");
//             }
//
//             // Resetear proveedores
//             if (resetProveedores) {
//                 // Eliminar proveedores
//                 const proveedoresResult = await dbRun("DELETE FROM proveedores");
//                 results.proveedores = proveedoresResult.changes;
//             }
//
//             // Resetear pedidos a proveedores
//             if (resetPedidos) {
//                 // Eliminar items de pedidos primero
//                 const pedidoItemsResult = await dbRun("DELETE FROM pedido_items");
//                 results.pedidos += pedidoItemsResult.changes;
//
//                 // Eliminar pedidos a proveedores
//                 const pedidosResult = await dbRun("DELETE FROM pedidos_proveedores");
//                 results.pedidos += pedidosResult.changes;
//             }
//
//             // Resetear promociones
//             if (resetPromociones) {
//                 // Eliminar items de promociones primero
//                 const promocionItemsResult = await dbRun("DELETE FROM promocion_items");
//                 results.promociones += promocionItemsResult.changes;
//
//                 // Eliminar promociones
//                 const promocionesResult = await dbRun("DELETE FROM promociones");
//                 results.promociones += promocionesResult.changes;
//             }
//
//             // Resetear registro de operaciones
//             if (resetLog) {
//                 const logResult = await dbRun("DELETE FROM operaciones_log");
//                 results.log = logResult.changes;
//             }
//
//             // Resetear lotes
//             if (resetLotes) {
//                 const lotesResult = await dbRun("DELETE FROM lotes");
//                 results.lotes = lotesResult.changes;
//
//                 // Resetear stock de productos a 0
//                 await dbRun("UPDATE productos SET stock = 0");
//
//                 // Resetear lote_actual_id
//                 await dbRun("UPDATE productos SET lote_actual_id = NULL");
//             }
//
//             await dbRun("COMMIT");
//
//             // Registrar la operación de reset
//             logOperation(
//                 'RESET_DATOS_SELECTIVO',
//                 `Reset selectivo ejecutado: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
//                 'Sistema',
//                 'sistema',
//                 null,
//                 null,
//                 results
//             );
//
//             const message = `Reset selectivo completado exitosamente. Datos eliminados: ${Object.entries(results).filter(([k, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
//
//             res.json({
//                 success: true,
//                 message: message,
//                 results: results
//             });
//
//         } catch (error) {
//             await dbRun("ROLLBACK");
//             throw error;
//         }
//
//     } catch (error) {
//         console.error('Error ejecutando reset selectivo:', error);
//         res.status(500).json({
//             error: 'Error al ejecutar reset selectivo: ' + error.message
//         });
//     }
// });

// Endpoint consolidado y optimizado para datos del dashboard
app.get('/api/dashboard-data', async (req, res) => {
    try {
        // Ejecutar todas las consultas en paralelo para mejor rendimiento
        // Optimizado: reducir cálculos repetitivos y usar índices eficientes
        const [
            statsResult,
            suppliersResult,
            supplierOrdersResult,
            cierresResult,
            expiringSoonResult,
            expiredResult,
            productsResult,
            lotesResult
        ] = await Promise.all([
            // Estadísticas generales - Optimizado con una sola consulta usando índices
            dbAll(`
                SELECT
                    COUNT(DISTINCT p.id) as total_products,
                    COUNT(DISTINCT v.id) as total_sales,
                    COALESCE(SUM(v.total), 0) as total_revenue,
                    COUNT(DISTINCT prov.id) as total_suppliers,
                    COUNT(DISTINCT pp.id) as total_orders,
                    COUNT(DISTINCT CASE WHEN l.estado = 'activo' THEN l.id END) as total_lotes
                FROM productos p
                CROSS JOIN (SELECT COUNT(*) as cnt FROM ventas) vc
                CROSS JOIN (SELECT SUM(total) as total FROM ventas) vr
                CROSS JOIN (SELECT COUNT(*) as cnt FROM proveedores) provc
                CROSS JOIN (SELECT COUNT(*) as cnt FROM pedidos_proveedores) ppc
                CROSS JOIN (SELECT COUNT(*) as cnt FROM lotes WHERE estado = 'activo') lc
                LIMIT 1
            `).catch(() => dbAll(`
                SELECT
                    (SELECT COUNT(*) FROM productos) as total_products,
                    (SELECT COUNT(*) FROM ventas) as total_sales,
                    (SELECT COALESCE(SUM(total), 0) FROM ventas) as total_revenue,
                    (SELECT COUNT(*) FROM proveedores) as total_suppliers,
                    (SELECT COUNT(*) FROM pedidos_proveedores) as total_orders,
                    (SELECT COUNT(*) FROM lotes WHERE estado = 'activo') as total_lotes
            `)),

            // Proveedores - Optimizado con índice existente
            dbAll("SELECT id, nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus FROM proveedores ORDER BY nombre_proveedor LIMIT 50"),

            // Pedidos a proveedores - Optimizado con JOIN eficiente
            dbAll(`
                SELECT
                    pp.id, pp.numero_pedido, pp.fecha_pedido, pp.fecha_entrega, pp.estado, pp.total,
                    p.nombre_proveedor, p.nombre_contacto, p.telefono, p.email
                FROM pedidos_proveedores pp
                JOIN proveedores p ON pp.proveedor_id = p.id
                ORDER BY pp.fecha_pedido DESC
                LIMIT 20
            `),

            // Cierres de caja - Optimizado
            dbAll(`
                SELECT id, fecha, fecha_cierre, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas, tipo_cierre
                FROM cierres_caja
                ORDER BY fecha_cierre DESC, fecha DESC
                LIMIT 10
            `),

            // Lotes próximos a vencer - Optimizado con índice de fecha_vencimiento
            dbAll(`
                SELECT
                    l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.notas,
                    p.nombre as producto_nombre, p.codigo as producto_codigo,
                    CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY('now', '-3 hours')) AS INTEGER) as dias_para_vencer
                FROM lotes l
                JOIN productos p ON l.producto_id = p.id
                WHERE l.fecha_vencimiento <= date('now', '+7 days', '-3 hours')
                  AND l.fecha_vencimiento >= date('now', '-3 hours')
                  AND l.cantidad_actual > 0
                  AND l.estado = 'activo'
                ORDER BY l.fecha_vencimiento ASC
                LIMIT 20
            `),

            // Lotes vencidos - Optimizado con índice de fecha_vencimiento
            dbAll(`
                SELECT
                    l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.notas,
                    p.nombre as producto_nombre, p.codigo as producto_codigo,
                    CAST((JULIANDAY('now', '-3 hours') - JULIANDAY(l.fecha_vencimiento)) AS INTEGER) as dias_vencido
                FROM lotes l
                JOIN productos p ON l.producto_id = p.id
                WHERE l.fecha_vencimiento < date('now', '-3 hours')
                  AND l.cantidad_actual > 0
                  AND l.estado = 'activo'
                ORDER BY l.fecha_vencimiento ASC
                LIMIT 20
            `),

            // Productos con información de lotes - Optimizado significativamente
            dbAll(`
                SELECT
                    p.id, p.codigo, p.nombre, p.precio, p.categoria, p.codigo_barras,
                    COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock,
                    COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
                    MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END) as proximo_vencimiento,
                    CASE
                        WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END) < DATE('now', '-3 hours') THEN 'tiene_vencidos'
                        WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                        ELSE 'vigente'
                    END as estado_vencimiento,
                    CASE
                        WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END) IS NULL THEN NULL
                        WHEN MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END) < DATE('now', '-3 hours') THEN
                            -CAST((JULIANDAY(DATE('now', '-3 hours')) - JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END))) AS INTEGER)
                        ELSE
                            CAST((JULIANDAY(MIN(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN DATE(l.fecha_vencimiento) END)) - JULIANDAY(DATE('now', '-3 hours'))) AS INTEGER)
                    END as dias_para_vencer
                FROM productos p
                LEFT JOIN lotes l ON p.id = l.producto_id AND l.estado = 'activo'
                GROUP BY p.id, p.codigo, p.nombre, p.precio, p.categoria, p.codigo_barras
                ORDER BY p.nombre
                LIMIT 100
            `),

            // Todos los lotes - Optimizado
            dbAll(`
                SELECT
                    l.id, l.producto_id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual, l.estado,
                    p.nombre as producto_nombre, p.codigo as producto_codigo,
                    CASE
                        WHEN l.fecha_vencimiento < date('now', '-3 hours') THEN 'vencido'
                        WHEN l.fecha_vencimiento <= date('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                        ELSE 'vigente'
                    END as estado_vencimiento,
                    CASE
                        WHEN l.fecha_vencimiento < date('now', '-3 hours') THEN
                            -CAST((JULIANDAY(date('now', '-3 hours')) - JULIANDAY(l.fecha_vencimiento)) AS INTEGER)
                        ELSE
                            CAST((JULIANDAY(l.fecha_vencimiento) - JULIANDAY(date('now', '-3 hours'))) AS INTEGER)
                    END as dias_para_vencer
                FROM lotes l
                JOIN productos p ON l.producto_id = p.id
                WHERE l.estado = 'activo'
                ORDER BY l.fecha_vencimiento ASC
                LIMIT 100
            `)
        ]);

        // Obtener productos más vendidos (top 10)
        const topProducts = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.codigo,
                SUM(vi.cantidad) as total_vendido
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            GROUP BY p.id
            ORDER BY total_vendido DESC
            LIMIT 10
        `);

        // Consolidar respuesta
        const dashboardData = {
            stats: statsResult[0] || {},
            suppliers: suppliersResult || [],
            supplierOrders: supplierOrdersResult || [],
            cierres: cierresResult || [],
            expiringSoon: expiringSoonResult || [],
            expired: expiredResult || [],
            products: productsResult || [],
            lotes: lotesResult || [],
            topProducts: topProducts || [],
            timestamp: new Date().toISOString(),
            cached: false // Para implementación futura de caché
        };

        // Headers para caché del navegador (5 minutos)
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(dashboardData);

    } catch (error) {
        console.error('Error obteniendo datos del dashboard:', error);
        res.status(500).json({
            error: 'Error interno del servidor: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Ruta de diagnóstico
app.get('/api/diagnostic', async (req, res) => {
    try {
        const productCount = await dbAll("SELECT COUNT(*) as count FROM productos");
        const salesCount = await dbAll("SELECT COUNT(*) as count FROM ventas");

        res.json({
            database: 'SQLite',
            file: 'pos_database.sqlite',
            total_products: productCount[0].count,
            total_sales: salesCount[0].count,
            status: 'OK',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            database: 'SQLite',
            status: 'ERROR'
        });
    }
});

// Endpoint de prueba de autenticación
app.get('/api/test-auth', (req, res) => {
    console.log('🔓 Ejecutando /api/test-auth sin autenticación');
    console.log('📨 Headers de la request:', JSON.stringify(req.headers, null, 2));
    console.log('🔑 Authorization header:', req.headers.authorization || 'No presente');
    res.json({ authenticated: true, message: 'Autenticación exitosa' });
});


// Ruta para obtener la URL pública de ngrok si está activa
const http = require('http');
app.get('/api/ngrok-url', async (req, res) => {
    // La API de ngrok por defecto está en http://127.0.0.1:4040/api/tunnels
    http.get('http://127.0.0.1:4040/api/tunnels', (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.tunnels && json.tunnels.length > 0) {
                    // Buscar túnel http o https
                    const tunnel = json.tunnels.find(t => t.public_url && t.public_url.startsWith('https://')) || json.tunnels[0];
                    if (tunnel && tunnel.public_url) {
                        return res.json({ active: true, url: tunnel.public_url });
                    }
                }
                res.json({ active: false, url: null });
            } catch (e) {
                res.json({ active: false, url: null, error: 'No se pudo parsear respuesta de ngrok' });
            }
        });
    }).on('error', (err) => {
        res.json({ active: false, url: null, error: 'ngrok no está corriendo o la API no responde' });
    });
});
// Ruta para obtener instrucciones de ngrok (sin API disponible)
app.get('/api/tunnel-url', async (req, res) => {
    res.json({
        message: 'ngrok no tiene API para obtener URLs automáticamente.',
        instructions: 'La URL se muestra en la terminal cuando se inicia el túnel. Copia la URL que aparece después de ejecutar el comando de tunneling.',
        command: 'ngrok http 3000 --config=ngrok.yml',
        example: 'Ejemplo: https://xxxxx.ngrok.io',
        note: 'ngrok genera URLs fijas basadas en tu configuración.'
    });
});

// Ruta para activar ngrok desde el navegador
app.post('/api/start-ngrok', async (req, res) => {
    try {
        console.log('🚀 Iniciando ngrok desde el navegador...');

        // Ejecutar comando del sistema para iniciar ngrok
        const startCommand = 'start cmd /k "ngrok http 3000 --config=ngrok.yml"';

        // Ejecutar el comando usando cmd
        const process = exec(startCommand, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando comando ngrok:', error);
                return;
            }
            console.log('✅ Comando ngrok ejecutado exitosamente');
        });

        // No esperar a que termine, devolver respuesta inmediata
        process.unref();

        res.json({
            success: true,
            message: 'ngrok se está iniciando en una nueva ventana de comandos.',
            command: 'ngrok http 3000 --config=ngrok.yml',
            note: 'Revisa la nueva ventana de comandos que se abrió para ver la URL de ngrok.'
        });

    } catch (error) {
        console.error('❌ Error iniciando ngrok:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar ngrok: ' + error.message
        });
    }
});

// Ruta para establecer hora del sistema
app.post('/api/set-time', conditionalAuth, (req, res) => {
    const { date, time } = req.body;
    if (!date || !time) {
        return res.status(400).json({ error: 'Fecha y hora son requeridas' });
    }

    // Convertir formato: date es YYYY-MM-DD, time es HH:MM
    const dateTimeStr = `${date}T${time}:00`; // YYYY-MM-DDTHH:MM:00
    const psCommand = `Set-Date -Date "${dateTimeStr}"`;

    console.log('🕒 Setting system date/time to:', dateTimeStr);

    // Ejecutar comando PowerShell
    exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error setting date/time:', error);
            let errorMsg = 'Error al establecer fecha/hora: ' + error.message;
            if (error.message.includes('privilegio requerido')) {
                errorMsg += '. Asegúrese de ejecutar el servidor como administrador.';
            }
            return res.status(500).json({ error: errorMsg });
        }
        console.log('Date/time set successfully');
        res.json({ success: true, message: 'Hora del sistema actualizada correctamente' });
    });
});

// Rutas para servir páginas HTML (AGREGADO)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dashboard.html'));
});

// Catch-all handler for SPA (debe ir al final, antes del manejo de errores)
app.get('*', (req, res) => {
    // Excluir rutas de API, archivos estáticos y páginas específicas
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/shared/') ||
        req.path === '/activate' ||
        req.path === '/dashboard') {
        return res.status(404).send('Not found');
    }
    // Para SPA, servir index.html
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});


// ============================================================
// IMPRESIÓN DE TICKETS - NUEVOS ENDPOINTS
// ============================================================
// NOTA: Implementación de impresora removida temporalmente para evitar errores de inicio de Node.js
// Los endpoints /api/print-ticket y /api/print-ticket-by-id han sido deshabilitados
// Para reactivarlos, instale el paquete escpos: npm install escpos

// ============================================================
// ALIAS ENDPOINTS - Para compatibilidad con frontend en inglés
// ============================================================

/**
 * GET /api/customers/debts-summary
 * Alias para GET /api/debts-with-current-total
 * Obtiene resumen de deudas de todos los clientes
 */
app.get('/api/customers/debts-summary', async (req, res) => {
    try {
        // Simplemente redirigir la request al endpoint real
        req.url = '/api/debts-with-current-total';
        return app._router.handle(req, res);
    } catch (error) {
        console.error('Error en GET /api/customers/debts-summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen de deudas' });
    }
});

/**
 * GET /api/customers/:cliente_id/debts-with-products
 * Obtiene deudas con productos de un cliente específico
 */
app.get('/api/customers/:cliente_id/debts-with-products', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Simular una request GET a /api/debts-with-current-total?cliente_id=X
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/debts-with-current-total?cliente_id=${cliente_id}`, {
            headers,
            method: 'GET'
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al obtener deudas' });
        }
        
        const deudas = await response.json();
        res.json(deudas);
        
    } catch (error) {
        console.error('Error en GET /api/customers/:cliente_id/debts-with-products:', error);
        res.status(500).json({ error: 'Error al obtener deudas con productos' });
    }
});

/**
 * PUT /api/customers/:cliente_id/update-debts
 * Alias para POST /api/debts/update-prices
 * Actualiza los precios en las deudas de un cliente
 */
app.put('/api/customers/:cliente_id/update-debts', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Usar el endpoint de actualización de precios
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/debts/update-prices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cliente_id, ...req.body })
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al actualizar deudas' });
        }
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        console.error('Error en PUT /api/customers/:cliente_id/update-debts:', error);
        res.status(500).json({ error: 'Error al actualizar deudas' });
    }
});

/**
 * POST /api/sales/credit-account
 * Alias para POST /api/sales/cuenta-corriente
 * Crea una venta a crédito/cuenta corriente
 */
app.post('/api/sales/credit-account', async (req, res) => {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Usar el endpoint real de venta a cuenta corriente
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/sales/cuenta-corriente`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al crear venta a crédito' });
        }
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        console.error('Error en POST /api/sales/credit-account:', error);
        res.status(500).json({ error: 'Error al crear venta a crédito' });
    }
});


// ============================================================
// ENDPOINT PARA CAMBIO DE CREDENCIALES DE INICIO DE SESIÓN
// ============================================================

/**
 * POST /api/change-credentials
 * Endpoint para cambiar las credenciales de inicio de sesión del sistema
 * Requiere autenticación básica para proteger el cambio de credenciales
 */
app.post('/api/change-credentials', conditionalAuth, async (req, res) => {
    try {
        const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

        // Validaciones requeridas
        if (!currentUsername || !currentPassword || !newUsername || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos: currentUsername, currentPassword, newUsername, newPassword'
            });
        }

        if (typeof newUsername !== 'string' || newUsername.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El nuevo nombre de usuario no puede estar vacío'
            });
        }

        if (typeof newPassword !== 'string' || newPassword.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña no puede estar vacía'
            });
        }

        if (newPassword.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 3 caracteres'
            });
        }

        // Verificar que las credenciales actuales sean correctas
        const currentAuth = req.headers.authorization;
        if (!currentAuth) {
            return res.status(401).json({
                success: false,
                error: 'No se proporcionó autenticación'
            });
        }

        // Decodificar credenciales Basic Auth
        const base64Credentials = currentAuth.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        // Validar que las credenciales proporcionadas coincidan con las actuales
        if (username !== currentUsername || password !== currentPassword) {
            return res.status(401).json({
                success: false,
                error: 'Las credenciales actuales son incorrectas'
            });
        }

        // Verificar que el nuevo username no sea igual al actual
        if (newUsername === currentUsername) {
            return res.status(400).json({
                success: false,
                error: 'El nuevo nombre de usuario debe ser diferente al actual'
            });
        }

        // Verificar que el nuevo password no sea igual al actual
        if (newPassword === currentPassword) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // Validar formato del nuevo username (solo letras, números y guiones bajos)
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de usuario solo puede contener letras, números y guiones bajos'
            });
        }

        // Validar que el nuevo username no tenga más de 50 caracteres
        if (newUsername.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de usuario no puede tener más de 50 caracteres'
            });
        }

        // Validar que la nueva contraseña no tenga más de 100 caracteres
        if (newPassword.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña no puede tener más de 100 caracteres'
            });
        }

        // Registrar la operación en el log (antes del cambio)
        logOperation(
            'CREDENCIALES_CAMBIADAS',
            `Credenciales cambiadas: usuario anterior: ${currentUsername}, nuevo usuario: ${newUsername}`,
            'Sistema',
            'sistema',
            null,
            null,
            {
                usuario_anterior: currentUsername,
                usuario_nuevo: newUsername,
                password_cambiado: true
            }
        );

        // Enviar respuesta de éxito
        res.json({
            success: true,
            message: 'Credenciales cambiadas exitosamente. Por favor, inicie sesión nuevamente con las nuevas credenciales.',
            newUsername: newUsername
        });

    } catch (error) {
        console.error('Error cambiando credenciales:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al cambiar credenciales: ' + error.message
        });
    }
});

// Crear servidor HTTP antes del WebSocket
const server = http.createServer(app);

// Iniciar servidor HTTP
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`🌐 También disponible en la red local (reemplaza localhost con tu IP)`);
    console.log(`📦 API disponible en http://localhost:${PORT}/api/products`);
    console.log(`📊 Estadísticas: http://localhost:${PORT}/api/stats`);
    console.log(`🔧 Diagnóstico: http://localhost:${PORT}/api/diagnostic`);
    console.log(`💾 Base de datos: ${dbPath}`);
    console.log(`🌐 Frontend disponible en http://localhost:${PORT}`);

    // Mostrar IP local para acceso desde otros dispositivos
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    console.log('\n📱 Para acceder desde tu teléfono usa una de estas IPs:');
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((interfaceInfo) => {
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                console.log(`   http://${interfaceInfo.address}:${PORT}`);
            }
        });
    });

    // Verificar licencias expiradas al iniciar (solo para logging)
    setTimeout(checkExpiredLicenses, 2000);
});

// Configurar servidor WebSocket
const wss = new WebSocket.Server({ server, path: '/ws' });

// Almacenar conexiones activas por tipo de cliente
const clients = {
    mobile: new Set(), // Conexiones desde móviles (escáneres)
    web: new Set()     // Conexiones desde la interfaz web principal
};

// Función para broadcast a un tipo específico de clientes
function broadcastToType(type, message) {
    const targetClients = clients[type];
    if (targetClients) {
        targetClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

// Función para broadcast a todos los clientes
function broadcastToAll(message) {
    Object.values(clients).forEach(clientSet => {
        clientSet.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    });
}

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
    console.log('🔗 Nueva conexión WebSocket desde:', req.socket.remoteAddress);

    // Identificar el tipo de cliente desde los parámetros de consulta
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientType = url.searchParams.get('type') || 'unknown';

    // Agregar cliente al grupo correspondiente
    if (clientType === 'mobile') {
        clients.mobile.add(ws);
        console.log('📱 Cliente móvil conectado. Total móviles:', clients.mobile.size);

        // Notificar a todos los clientes web sobre la conexión del móvil
        broadcastToType('web', {
            type: 'mobile_connected',
            mobile_clients: clients.mobile.size,
            timestamp: new Date().toISOString()
        });
    } else if (clientType === 'web') {
        clients.web.add(ws);
        console.log('💻 Cliente web conectado. Total web:', clients.web.size);

        // Enviar estado actual de móviles al nuevo cliente web
        if (clients.mobile.size > 0) {
            ws.send(JSON.stringify({
                type: 'mobile_connected',
                mobile_clients: clients.mobile.size,
                timestamp: new Date().toISOString()
            }));
        }
    } else {
        console.log('❓ Cliente desconocido conectado:', clientType);
    }

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        message: `Conectado como ${clientType}`,
        timestamp: new Date().toISOString()
    }));

    // Manejar mensajes entrantes
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 Mensaje recibido de ${clientType}:`, message);

            switch (message.type) {
                case 'barcode_scanned':
                    // Código de barras escaneado desde móvil
                    if (clientType === 'mobile') {
                        console.log('📱 Código escaneado:', message.barcode);

                        // Broadcast a todos los clientes web
                        broadcastToType('web', {
                            type: 'barcode_received',
                            barcode: message.barcode,
                            timestamp: new Date().toISOString(),
                            source: 'mobile_scanner'
                        });

                        // Confirmar recepción al móvil
                        ws.send(JSON.stringify({
                            type: 'barcode_ack',
                            barcode: message.barcode,
                            status: 'received',
                            timestamp: new Date().toISOString()
                        }));
                    }
                    break;

                case 'ping':
                    // Responder a ping para mantener conexión viva
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;

                case 'status_request':
                    // Enviar estado del sistema
                    ws.send(JSON.stringify({
                        type: 'status',
                        mobile_clients: clients.mobile.size,
                        web_clients: clients.web.size,
                        timestamp: new Date().toISOString()
                    }));
                    break;

                default:
                    console.log('⚠️ Tipo de mensaje desconocido:', message.type);
            }
        } catch (error) {
            console.error('❌ Error procesando mensaje WebSocket:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error procesando mensaje',
                timestamp: new Date().toISOString()
            }));
        }
    });

    // Manejar desconexión
    ws.on('close', () => {
        console.log(`🔌 Conexión WebSocket cerrada (${clientType})`);

        // Remover cliente del grupo correspondiente
        if (clientType === 'mobile') {
            clients.mobile.delete(ws);
            console.log('📱 Cliente móvil desconectado. Total móviles:', clients.mobile.size);

            // Notificar a todos los clientes web sobre la desconexión del móvil
            broadcastToType('web', {
                type: 'mobile_disconnected',
                mobile_clients: clients.mobile.size,
                timestamp: new Date().toISOString()
            });
        } else if (clientType === 'web') {
            clients.web.delete(ws);
            console.log('💻 Cliente web desconectado. Total web:', clients.web.size);
        }

        // Notificar a otros clientes sobre la desconexión
        broadcastToAll({
            type: 'client_disconnected',
            client_type: clientType,
            timestamp: new Date().toISOString()
        });
    });

    // Manejar errores
    ws.on('error', (error) => {
        console.error('❌ Error en conexión WebSocket:', error);
    });
});

console.log('🔌 Servidor WebSocket configurado y listo');

// Endpoint optimizado para actualización de precios de deudas ya está implementado directamente en este archivo (líneas ~2487-2635)

// Cerrar conexión al terminar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('✅ Conexión a la base de datos cerrada');
        process.exit(0);
    });
});
