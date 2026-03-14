const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Script para instalar el sistema de deudas en el backend existente
 */

class DebtsSystemInstaller {
    constructor() {
        this.dbPath = path.join(__dirname, 'pos_database.sqlite');
        this.db = new sqlite3.Database(this.dbPath);
    }

    /**
     * Instalar el sistema de deudas
     */
    async install() {
        console.log('🚀 Iniciando instalación del sistema de deudas...');

        try {
            // 1. Crear tablas de deudas
            await this.createDebtsTables();
            
            // 2. Verificar existencia de clientes
            await this.verifyClients();
            
            // 3. Verificar existencia de productos
            await this.verifyProducts();
            
            // 4. Crear datos de ejemplo
            await this.createSampleData();
            
            console.log('✅ Sistema de deudas instalado exitosamente');
            
            // 5. Mostrar resumen
            await this.showInstallationSummary();
            
        } catch (error) {
            console.error('❌ Error durante la instalación:', error);
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Crear tablas de deudas
     */
    async createDebtsTables() {
        console.log('📋 Creando tablas de deudas...');
        
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Tabla principal de deudas
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS deudas (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cliente_id INTEGER NOT NULL,
                        monto_total REAL NOT NULL,
                        monto_pendiente REAL NOT NULL,
                        estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'parcial', 'vencida', 'pagada')),
                        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                        fecha_vencimiento DATE,
                        descripcion TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) return reject(err);
                    
                    // Tabla de productos asociados a deudas
                    this.db.run(`
                        CREATE TABLE IF NOT EXISTS deuda_productos (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            deuda_id INTEGER NOT NULL,
                            producto_id INTEGER NOT NULL,
                            cantidad INTEGER NOT NULL,
                            precio_unitario REAL NOT NULL,
                            subtotal REAL NOT NULL,
                            precio_actual REAL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE,
                            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
                        )
                    `, (err) => {
                        if (err) return reject(err);
                        
                        // Índices para optimizar consultas
                        this.db.run('CREATE INDEX IF NOT EXISTS idx_deudas_cliente_id ON deudas(cliente_id)', (err) => {
                            if (err) return reject(err);
                            
                            this.db.run('CREATE INDEX IF NOT EXISTS idx_deudas_estado ON deudas(estado)', (err) => {
                                if (err) return reject(err);
                                
                                this.db.run('CREATE INDEX IF NOT EXISTS idx_deuda_productos_deuda_id ON deuda_productos(deuda_id)', (err) => {
                                    if (err) return reject(err);
                                    
                                    console.log('✅ Tablas de deudas creadas exitosamente');
                                    resolve();
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * Verificar existencia de clientes
     */
    async verifyClients() {
        console.log('👥 Verificando clientes...');
        
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM clientes', (err, row) => {
                if (err) return reject(err);
                
                if (row.count === 0) {
                    console.log('⚠️ No se encontraron clientes. Se crearán datos de ejemplo...');
                    this.createSampleClients().then(resolve).catch(reject);
                } else {
                    console.log(`✅ Se encontraron ${row.count} clientes`);
                    resolve();
                }
            });
        });
    }

    /**
     * Crear clientes de ejemplo
     */
    async createSampleClients() {
        return new Promise((resolve, reject) => {
            const clients = [
                ['Juan Pérez', '1122334455', 'Av. Siempre Viva 123', '30000000001', 'Cliente regular'],
                ['María García', '1133557799', 'Calle Falsa 456', '30000000002', 'Cliente preferencial'],
                ['Carlos Rodríguez', '1144668800', 'Avenida 9 de Julio 789', '30000000003', 'Cliente nuevo']
            ];

            const stmt = this.db.prepare(`
                INSERT INTO clientes (nombre, telefono, direccion, dni, nota)
                VALUES (?, ?, ?, ?, ?)
            `);

            clients.forEach(client => {
                stmt.run(client);
            });

            stmt.finalize((err) => {
                if (err) return reject(err);
                console.log('✅ Clientes de ejemplo creados');
                resolve();
            });
        });
    }

    /**
     * Verificar existencia de productos
     */
    async verifyProducts() {
        console.log('📦 Verificando productos...');
        
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM productos', (err, row) => {
                if (err) return reject(err);
                
                if (row.count === 0) {
                    console.log('⚠️ No se encontraron productos. Se crearán datos de ejemplo...');
                    this.createSampleProducts().then(resolve).catch(reject);
                } else {
                    console.log(`✅ Se encontraron ${row.count} productos`);
                    resolve();
                }
            });
        });
    }

    /**
     * Crear productos de ejemplo
     */
    async createSampleProducts() {
        return new Promise((resolve, reject) => {
            const fechaVencimiento = new Date();
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
            const fechaStr = fechaVencimiento.toISOString().split('T')[0];

            const productos = [
                ['LAP-001', 'Laptop HP 15.6"', 'Laptop para oficina', 899.99, 30, 'Tecnología', fechaStr],
                ['MON-001', 'Monitor Samsung 24"', 'Monitor Full HD', 249.99, 30, 'Tecnología', fechaStr],
                ['TEC-001', 'Teclado Mecánico RGB', 'Teclado gaming', 89.99, 30, 'Periféricos', fechaStr],
                ['MOU-001', 'Mouse Inalámbrico', 'Mouse óptico', 39.99, 30, 'Periféricos', fechaStr],
                ['PRI-001', 'Impresora Multifunción', 'Impresora láser', 199.99, 30, 'Periféricos', fechaStr]
            ];

            const stmt = this.db.prepare(`
                INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria, fecha_vencimiento)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            productos.forEach(producto => {
                stmt.run(producto);
            });

            stmt.finalize((err) => {
                if (err) return reject(err);
                console.log('✅ Productos de ejemplo creados');
                resolve();
            });
        });
    }

    /**
     * Crear datos de ejemplo para deudas
     */
    async createSampleData() {
        console.log('💳 Creando datos de ejemplo para deudas...');
        
        return new Promise((resolve, reject) => {
            // Insertar deudas de ejemplo
            const deudas = [
                [1, 150.50, 150.50, 'pendiente', '2025-01-30', 'Compra de productos varios'],
                [2, 89.99, 89.99, 'pendiente', '2025-01-15', 'Impresora multifunción'],
                [1, 200.00, 120.00, 'parcial', '2025-01-07', 'Laptop HP - abono parcial'],
                [3, 75.25, 75.25, 'vencida', '2024-12-25', 'Teclado mecánico RGB'],
                [2, 300.00, 300.00, 'pendiente', '2025-02-15', 'Monitor Samsung 24"']
            ];

            const deudaStmt = this.db.prepare(`
                INSERT INTO deudas (cliente_id, monto_total, monto_pendiente, estado, fecha_vencimiento, descripcion)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            deudas.forEach(deuda => {
                deudaStmt.run(deuda);
            });

            deudaStmt.finalize((err) => {
                if (err) return reject(err);

                // Insertar productos de deudas de ejemplo
                const productosDeuda = [
                    [1, 3, 1, 60.51, 60.51, 60.51],
                    [1, 4, 1, 89.99, 89.99, 89.99],
                    [2, 5, 1, 89.99, 89.99, 89.99],
                    [3, 1, 1, 200.00, 200.00, 200.00],
                    [4, 3, 1, 75.25, 75.25, 75.25],
                    [5, 2, 1, 300.00, 300.00, 300.00]
                ];

                const prodStmt = this.db.prepare(`
                    INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal, precio_actual)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                productosDeuda.forEach(prod => {
                    prodStmt.run(prod);
                });

                prodStmt.finalize((err) => {
                    if (err) return reject(err);
                    console.log('✅ Datos de ejemplo para deudas creados');
                    resolve();
                });
            });
        });
    }

    /**
     * Mostrar resumen de instalación
     */
    async showInstallationSummary() {
        console.log('\n📊 Resumen de instalación:');
        
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM deudas', (err, deudasRow) => {
                if (err) return reject(err);
                
                this.db.get('SELECT COUNT(*) as count FROM deuda_productos', (err, productosRow) => {
                    if (err) return reject(err);
                    
                    this.db.get('SELECT COUNT(*) as count FROM clientes', (err, clientesRow) => {
                        if (err) return reject(err);
                        
                        this.db.get('SELECT COUNT(*) as count FROM productos', (err, productosTotalRow) => {
                            if (err) return reject(err);
                            
                            console.log(`✅ Deudas creadas: ${deudasRow.count}`);
                            console.log(`✅ Productos en deudas: ${productosRow.count}`);
                            console.log(`✅ Clientes totales: ${clientesRow.count}`);
                            console.log(`✅ Productos totales: ${productosTotalRow.count}`);
                            
                            console.log('\n🎯 Endpoints disponibles:');
                            console.log('   GET    /api/clientes/deudas-resumen');
                            console.log('   GET    /api/clientes/:id/deudas-con-productos');
                            console.log('   PUT    /api/clientes/:id/actualizar-deudas');
                            console.log('   POST   /api/ventas/cuenta-corriente');
                            console.log('   GET    /api/clientes');
                            console.log('   GET    /api/clientes/:id');
                            
                            resolve();
                        });
                    });
                });
            });
        });
    }
}

// Ejecutar instalación si se llama directamente
if (require.main === module) {
    const installer = new DebtsSystemInstaller();
    installer.install().catch(console.error);
}

module.exports = DebtsSystemInstaller;