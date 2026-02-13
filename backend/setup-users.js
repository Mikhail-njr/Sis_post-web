const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Conexión a la base de datos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Función para ejecutar una consulta SQL
function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Función para insertar usuario con contraseña encriptada
async function insertDefaultUser() {
    try {
        // Encriptar la contraseña 'pos123'
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash('pos123', saltRounds);
        
        // Insertar usuario por defecto
        const insertSQL = `
            INSERT OR IGNORE INTO usuarios (
                username, 
                password_hash, 
                nombre_completo, 
                email, 
                rol, 
                activo
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertSQL, [
            'admin',
            passwordHash,
            'Administrador del Sistema',
            'admin@empresa.com',
            'admin',
            1
        ], (err) => {
            if (err) {
                console.error('❌ Error insertando usuario por defecto:', err.message);
            } else {
                console.log('✅ Usuario por defecto (admin/pos123) creado exitosamente');
            }
        });
        
    } catch (error) {
        console.error('❌ Error encriptando contraseña:', error);
    }
}

// Función principal
async function setupUsersTable() {
    try {
        console.log('🚀 Creando tabla de usuarios...');
        
        // Crear tabla de usuarios
        await executeSQL(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nombre_completo TEXT,
                email TEXT,
                rol TEXT DEFAULT 'admin' CHECK (rol IN ('admin', 'cajero', 'invitado')),
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso DATETIME,
                intentos_fallidos INTEGER DEFAULT 0,
                bloqueado_hasta DATETIME
            )
        `);
        
        // Crear índices
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)');
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo)');
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol)');
        
        // Crear tabla de logs de autenticación
        await executeSQL(`
            CREATE TABLE IF NOT EXISTS auth_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                tipo_evento TEXT CHECK (tipo_evento IN ('login_exitoso', 'login_fallido', 'logout', 'cambio_clave')),
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crear índices para logs
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_auth_logs_username ON auth_logs(username)');
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_auth_logs_tipo_evento ON auth_logs(tipo_evento)');
        await executeSQL('CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at)');
        
        // Crear triggers
        await executeSQL(`
            CREATE TRIGGER IF NOT EXISTS tr_usuarios_updated_at
            AFTER UPDATE ON usuarios
            FOR EACH ROW
            BEGIN
                UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);
        
        console.log('✅ Tabla de usuarios creada exitosamente');
        
        // Insertar usuario por defecto
        await insertDefaultUser();
        
        console.log('✅ Configuración de usuarios completada');
        
    } catch (error) {
        console.error('❌ Error configurando tabla de usuarios:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando base de datos:', err.message);
            } else {
                console.log('✅ Conexión a base de datos cerrada');
            }
        });
    }
}

// Ejecutar configuración
setupUsersTable();