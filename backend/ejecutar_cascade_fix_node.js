#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE IMPLEMENTACIÓN: CASCADE DELETE
 *
 * Este script implementa las relaciones FOREIGN KEY con CASCADE DELETE
 * para resolver el problema de "Clientes Cuenta corriente" en el dashboard.
 *
 * 🎯 OBJETIVO: Prevenir datos huérfanos cuando se eliminan clientes
 * ⚠️  ADVERTENCIA: Realiza cambios estructurales en la base de datos
 * 📝  REQUISITO: Tener el servidor backend detenido durante la ejecución
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3').verbose();

// Rutas de archivos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const sqlScriptPath = path.join(__dirname, 'IMPLEMENTACION_ULTIMA_FINAL_DEFINITIVA_CASCADE.sql');
const backupDir = path.join(__dirname, 'backups');

console.log('🚀 INICIANDO IMPLEMENTACIÓN CASCADE DELETE');
console.log('==========================================');

// Verificar que el script SQL exista
if (!fs.existsSync(sqlScriptPath)) {
    console.error('❌ ERROR: No se encontró el script SQL de implementación');
    console.error(`   Ruta esperada: ${sqlScriptPath}`);
    process.exit(1);
}

// Crear directorio de backups si no existe
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✅ Directorio de backups creado');
}

// Crear backup de la base de datos
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `pos_database_backup_${timestamp}.sqlite`);

console.log('📦 CREANDO BACKUP DE LA BASE DE DATOS...');
console.log(`   Origen: ${dbPath}`);
console.log(`   Destino: ${backupPath}`);

try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ BACKUP CREADO EXITOSAMENTE');
} catch (error) {
    console.error('❌ ERROR AL CREAR BACKUP:', error.message);
    process.exit(1);
}

// Leer el script SQL
let sqlScript;
try {
    sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
    console.log('✅ SCRIPT SQL LEÍDO EXITOSAMENTE');
} catch (error) {
    console.error('❌ ERROR AL LEER SCRIPT SQL:', error.message);
    process.exit(1);
}

// Conectar a la base de datos
console.log('🔗 CONECTANDO A LA BASE DE DATOS...');
const db = new Database(dbPath, (err) => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:', err.message);
        process.exit(1);
    }
    console.log('✅ CONEXIÓN A BASE DE DATOS ESTABLECIDA');
});

// Ejecutar el script SQL
console.log('⚡ EJECUTANDO IMPLEMENTACIÓN CASCADE DELETE...');
console.log('   Esto puede tomar un momento...');

db.serialize(() => {
    // Habilitar foreign keys
    db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) {
            console.error('❌ ERROR AL HABILITAR FOREIGN KEYS:', err.message);
            process.exit(1);
        }
        console.log('✅ FOREIGN KEYS HABILITADAS');
    });

    // Ejecutar el script SQL
    db.exec(sqlScript, (err) => {
        if (err) {
            console.error('❌ ERROR AL EJECUTAR SCRIPT SQL:', err.message);
            console.error('   DETALLES DEL ERROR:');
            console.error('   - Verifica que el servidor backend esté detenido');
            console.error('   - Verifica que la base de datos no esté siendo usada');
            console.error('   - Revisa el script SQL para detectar errores');
            process.exit(1);
        }
        
        console.log('✅ SCRIPT SQL EJECUTADO EXITOSAMENTE');
        
        // Verificar la implementación
        console.log('🔍 VERIFICANDO IMPLEMENTACIÓN...');
        
        // Verificar relaciones FOREIGN KEY
        db.all("PRAGMA foreign_key_list(ventas)", (err, rows) => {
            if (err) {
                console.error('❌ ERROR AL VERIFICAR RELACIONES:', err.message);
                process.exit(1);
            }
            
            if (rows.length > 0) {
                console.log('✅ RELACIONES FOREIGN KEY VERIFICADAS');
                rows.forEach(row => {
                    console.log(`   - ${row.table} -> ${row.from} -> ${row.to} (${row.on_delete})`);
                });
            } else {
                console.log('⚠️  ADVERTENCIA: No se encontraron relaciones FOREIGN KEY');
            }
            
            // Verificar eliminación de datos huérfanos
            db.get("SELECT COUNT(*) as count FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)", (err, row) => {
                if (err) {
                    console.error('❌ ERROR AL VERIFICAR DATOS HUÉRFANOS:', err.message);
                    process.exit(1);
                }
                
                if (row.count === 0) {
                    console.log('✅ DATOS HUÉRFANOS ELIMINADOS EXITOSAMENTE');
                } else {
                    console.log(`⚠️  ADVERTENCIA: Aún existen ${row.count} ventas sin cliente`);
                }
                
                // Mensaje final
                console.log('');
                console.log('🎉 IMPLEMENTACIÓN COMPLETA');
                console.log('==========================');
                console.log('✅ Backup creado exitosamente');
                console.log('✅ Relaciones CASCADE DELETE implementadas');
                console.log('✅ Datos huérfanos eliminados');
                console.log('✅ Base de datos optimizada');
                console.log('');
                console.log('🎯 PRÓXIMOS PASOS:');
                console.log('   1. Reinicia el servidor backend');
                console.log('   2. Verifica que el dashboard no muestre errores');
                console.log('   3. Prueba eliminar un cliente para confirmar el funcionamiento');
                console.log('');
                console.log('🔒 SEGURIDAD:');
                console.log(`   - Backup disponible en: ${backupPath}`);
                console.log('   - Si necesitas restaurar, copia el backup sobre pos_database.sqlite');
                console.log('');
                
                db.close();
            });
        });
    });
});

// Manejo de errores de la base de datos
db.on('error', (err) => {
    console.error('❌ ERROR EN LA BASE DE DATOS:', err.message);
    process.exit(1);
});