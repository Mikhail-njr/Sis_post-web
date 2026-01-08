#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE ELIMINACIÓN EN CASCADA: Datos de cuenta corriente
 * 
 * Este script elimina datos de cuenta corriente persistentes en cascada
 * para limpiar completamente el sistema.
 * 
 * 🎯 OBJETIVO: Eliminar datos de cuenta corriente persistentes
 * ⚠️  ADVERTENCIA: Realiza cambios estructurales en la base de datos
 * 📝  REQUISITO: Tener el servidor backend detenido durante la ejecución
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3').verbose();

// Rutas de archivos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const backupDir = path.join(__dirname, 'backups');

console.log('🗑️ ELIMINANDO DATOS DE CUENTA CORRIENTE EN CASCADA');
console.log('==================================================');

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

// Contar datos antes de la eliminación
console.log('📊 CONTANDO DATOS ANTES DE LA ELIMINACIÓN...');
db.serialize(() => {
    // Contar deudas
    db.get("SELECT COUNT(*) as count FROM deudas", (err, row) => {
        if (err) {
            console.error('❌ ERROR AL CONTAR DEUDAS:', err.message);
            process.exit(1);
        }
        const deudasCount = row.count;
        console.log(`   - Deudas: ${deudasCount}`);
        
        // Contar productos de deudas
        db.get("SELECT COUNT(*) as count FROM deuda_productos", (err, row) => {
            if (err) {
                console.error('❌ ERROR AL CONTAR PRODUCTOS DE DEUDAS:', err.message);
                process.exit(1);
            }
            const productosDeudasCount = row.count;
            console.log(`   - Productos de deudas: ${productosDeudasCount}`);
            
            // Contar pagos de deudas
            db.get("SELECT COUNT(*) as count FROM pagos_deudas", (err, row) => {
                if (err) {
                    console.error('❌ ERROR AL CONTAR PAGOS DE DEUDAS:', err.message);
                    process.exit(1);
                }
                const pagosDeudasCount = row.count;
                console.log(`   - Pagos de deudas: ${pagosDeudasCount}`);
                
                // Confirmar eliminación
                console.log('');
                console.log('⚠️  ATENCIÓN: Se eliminarán todos los datos de cuenta corriente');
                console.log(`   - ${deudasCount} deudas`);
                console.log(`   - ${productosDeudasCount} productos de deudas`);
                console.log(`   - ${pagosDeudasCount} pagos de deudas`);
                console.log('   Esta acción no se puede deshacer');
                
                // Eliminar datos en cascada
                console.log('');
                console.log('🗑️ ELIMINANDO DATOS EN CASCADA...');
                
                // Paso 1: Eliminar pagos de deudas
                db.run("DELETE FROM pagos_deudas", function(err) {
                    if (err) {
                        console.error('❌ ERROR AL ELIMINAR PAGOS DE DEUDAS:', err.message);
                        process.exit(1);
                    }
                    console.log(`   ✅ Eliminados ${this.changes} pagos de deudas`);
                    
                    // Paso 2: Eliminar productos de deudas
                    db.run("DELETE FROM deuda_productos", function(err) {
                        if (err) {
                            console.error('❌ ERROR AL ELIMINAR PRODUCTOS DE DEUDAS:', err.message);
                            process.exit(1);
                        }
                        console.log(`   ✅ Eliminados ${this.changes} productos de deudas`);
                        
                        // Paso 3: Eliminar deudas
                        db.run("DELETE FROM deudas", function(err) {
                            if (err) {
                                console.error('❌ ERROR AL ELIMINAR DEUDAS:', err.message);
                                process.exit(1);
                            }
                            console.log(`   ✅ Eliminadas ${this.changes} deudas`);
                            
                            // Contar datos después de la eliminación
                            console.log('');
                            console.log('📊 CONTANDO DATOS DESPUÉS DE LA ELIMINACIÓN...');
                            db.get("SELECT COUNT(*) as count FROM deudas", (err, row) => {
                                if (err) {
                                    console.error('❌ ERROR AL CONTAR DEUDAS DESPUÉS:', err.message);
                                    process.exit(1);
                                }
                                console.log(`   - Deudas: ${row.count}`);
                                
                                db.get("SELECT COUNT(*) as count FROM deuda_productos", (err, row) => {
                                    if (err) {
                                        console.error('❌ ERROR AL CONTAR PRODUCTOS DE DEUDAS DESPUÉS:', err.message);
                                        process.exit(1);
                                    }
                                    console.log(`   - Productos de deudas: ${row.count}`);
                                    
                                    db.get("SELECT COUNT(*) as count FROM pagos_deudas", (err, row) => {
                                        if (err) {
                                            console.error('❌ ERROR AL CONTAR PAGOS DE DEUDAS DESPUÉS:', err.message);
                                            process.exit(1);
                                        }
                                        console.log(`   - Pagos de deudas: ${row.count}`);
                                        
                                        // Mensaje final
                                        console.log('');
                                        console.log('🎉 ELIMINACIÓN EN CASCADA COMPLETA');
                                        console.log('==================================');
                                        console.log('✅ Todos los datos de cuenta corriente han sido eliminados');
                                        console.log('✅ El sistema está limpio de datos de cuenta corriente');
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
                    });
                });
            });
        });
    });
});

// Manejo de errores de la base de datos
db.on('error', (err) => {
    console.error('❌ ERROR EN LA BASE DE DATOS:', err.message);
    process.exit(1);
});