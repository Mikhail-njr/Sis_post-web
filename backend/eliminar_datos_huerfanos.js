#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE LIMPIEZA: Eliminar datos huérfanos de cuenta corriente
 * 
 * Este script elimina las ventas en cuenta corriente sin cliente asociado
 * para resolver el problema de "Clientes Cuenta corriente" en el dashboard.
 * 
 * 🎯 OBJETIVO: Eliminar 19 ventas en cuenta corriente sin cliente
 * ⚠️  ADVERTENCIA: Realiza cambios estructurales en la base de datos
 * 📝  REQUISITO: Tener el servidor backend detenido durante la ejecución
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3').verbose();

// Rutas de archivos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const backupDir = path.join(__dirname, 'backups');

console.log('🚀 INICIANDO LIMPIEZA DE DATOS HUÉRFANOS');
console.log('=========================================');

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

// Conectar a la base de datos
console.log('🔗 CONECTANDO A LA BASE DE DATOS...');
const db = new Database(dbPath, (err) => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:', err.message);
        process.exit(1);
    }
    console.log('✅ CONEXIÓN A BASE DE DATOS ESTABLECIDA');
});

// Contar datos huérfanos antes de la eliminación
console.log('📊 CONTANDO DATOS HUÉRFANOS...');
db.get("SELECT COUNT(*) as count FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)", (err, row) => {
    if (err) {
        console.error('❌ ERROR AL CONTAR DATOS HUÉRFANOS:', err.message);
        process.exit(1);
    }
    
    const huérfanosCount = row.count;
    console.log(`   - Ventas en cuenta corriente sin cliente: ${huérfanosCount}`);
    
    if (huérfanosCount === 0) {
        console.log('✅ No hay datos huérfanos para eliminar');
        db.close();
        return;
    }
    
    // Confirmar eliminación
    console.log('⚠️  ATENCIÓN: Se eliminarán', huérfanosCount, 'ventas en cuenta corriente sin cliente');
    console.log('   Esta acción no se puede deshacer');
    
    // Eliminar datos huérfanos
    console.log('🗑️ ELIMINANDO DATOS HUÉRFANOS...');
    db.run("DELETE FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)", function(err) {
        if (err) {
            console.error('❌ ERROR AL ELIMINAR DATOS HUÉRFANOS:', err.message);
            process.exit(1);
        }
        
        console.log(`✅ SE ELIMINARON ${this.changes} VENTAS EN CUENTA CORRIENTE SIN CLIENTE`);
        
        // Contar datos huérfanos después de la eliminación
        db.get("SELECT COUNT(*) as count FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)", (err, row) => {
            if (err) {
                console.error('❌ ERROR AL CONTAR DATOS DESPUÉS DE LA ELIMINACIÓN:', err.message);
                process.exit(1);
            }
            
            console.log(`   - Ventas en cuenta corriente sin cliente después: ${row.count}`);
            
            // Mensaje final
            console.log('');
            console.log('🎉 LIMPIEZA COMPLETA');
            console.log('====================');
            console.log('✅ Datos huérfanos eliminados exitosamente');
            console.log('✅ El problema de "Clientes Cuenta corriente" ha sido resuelto');
            console.log('');
            console.log('🔒 SEGURIDAD:');
            console.log(`   - Backup disponible en: ${backupPath}`);
            console.log('   - Si necesitas restaurar, copia el backup sobre pos_database.sqlite');
            console.log('');
            
            db.close();
        });
    });
});

// Manejo de errores de la base de datos
db.on('error', (err) => {
    console.error('❌ ERROR EN LA BASE DE DATOS:', err.message);
    process.exit(1);
});