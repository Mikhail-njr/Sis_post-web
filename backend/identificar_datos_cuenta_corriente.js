#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE IDENTIFICACIÓN: Datos de cuenta corriente persistentes
 * 
 * Este script identifica todos los datos relacionados con cuenta corriente
 * que podrían estar causando problemas en el sistema.
 * 
 * 🎯 OBJETIVO: Identificar datos de cuenta corriente que persisten
 * ⚠️  ADVERTENCIA: Realiza consultas de diagnóstico en la base de datos
 * 📝  REQUISITO: Tener el servidor backend detenido durante la ejecución
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3').verbose();

// Rutas de archivos
const dbPath = path.join(__dirname, 'pos_database.sqlite');

console.log('🔍 IDENTIFICANDO DATOS DE CUENTA CORRIENTE PERSISTENTES');
console.log('======================================================');

// Conectar a la base de datos
console.log('🔗 CONECTANDO A LA BASE DE DATOS...');
const db = new Database(dbPath, (err) => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:', err.message);
        process.exit(1);
    }
    console.log('✅ CONEXIÓN A BASE DE DATOS ESTABLECIDA');
});

// Consultas de diagnóstico
console.log('📊 REALIZANDO DIAGNÓSTICO DE DATOS...');

// 1. Contar ventas en cuenta corriente
db.get("SELECT COUNT(*) as count FROM ventas WHERE metodo_pago = 'cuenta_corriente'", (err, row) => {
    if (err) {
        console.error('❌ ERROR AL CONTAR VENTAS EN CUENTA CORRIENTE:', err.message);
        process.exit(1);
    }
    console.log(`💳 Ventas en cuenta corriente: ${row.count}`);
    
    // 2. Contar deudas
    db.get("SELECT COUNT(*) as count FROM deudas", (err, row) => {
        if (err) {
            console.error('❌ ERROR AL CONTAR DEUDAS:', err.message);
            process.exit(1);
        }
        console.log(`💳 Deudas registradas: ${row.count}`);
        
        // 3. Contar productos de deudas
        db.get("SELECT COUNT(*) as count FROM deuda_productos", (err, row) => {
            if (err) {
                console.error('❌ ERROR AL CONTAR PRODUCTOS DE DEUDAS:', err.message);
                process.exit(1);
            }
            console.log(`📦 Productos de deudas: ${row.count}`);
            
            // 4. Contar pagos de deudas
            db.get("SELECT COUNT(*) as count FROM pagos_deudas", (err, row) => {
                if (err) {
                    console.error('❌ ERROR AL CONTAR PAGOS DE DEUDAS:', err.message);
                    process.exit(1);
                }
                console.log(`💰 Pagos de deudas: ${row.count}`);
                
                // 5. Verificar deudas sin cliente válido
                db.get("SELECT COUNT(*) as count FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0", (err, row) => {
                    if (err) {
                        console.error('❌ ERROR AL CONTAR DEUDAS SIN CLIENTE:', err.message);
                        process.exit(1);
                    }
                    console.log(`⚠️  Deudas sin cliente válido: ${row.count}`);
                    
                    // 6. Verificar productos de deudas sin deuda válida
                    db.get("SELECT COUNT(*) as count FROM deuda_productos WHERE deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL)", (err, row) => {
                        if (err) {
                            console.error('❌ ERROR AL CONTAR PRODUCTOS DE DEUDAS SIN DEUDA:', err.message);
                            process.exit(1);
                        }
                        console.log(`⚠️  Productos de deudas sin deuda válida: ${row.count}`);
                        
                        // 7. Verificar productos de deudas sin producto válido
                        db.get("SELECT COUNT(*) as count FROM deuda_productos WHERE producto_id NOT IN (SELECT id FROM productos WHERE id IS NOT NULL)", (err, row) => {
                            if (err) {
                                console.error('❌ ERROR AL CONTAR PRODUCTOS DE DEUDAS SIN PRODUCTO:', err.message);
                                process.exit(1);
                            }
                            console.log(`⚠️  Productos de deudas sin producto válido: ${row.count}`);
                            
                            // 8. Verificar pagos de deudas sin deuda válida
                            db.get("SELECT COUNT(*) as count FROM pagos_deudas WHERE deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL)", (err, row) => {
                                if (err) {
                                    console.error('❌ ERROR AL CONTAR PAGOS DE DEUDAS SIN DEUDA:', err.message);
                                    process.exit(1);
                                }
                                console.log(`⚠️  Pagos de deudas sin deuda válida: ${row.count}`);
                                
                                // 9. Mostrar resumen de deudas por cliente
                                db.all("SELECT cliente_id, COUNT(*) as deudas, SUM(monto_total) as total FROM deudas WHERE cliente_id IS NOT NULL AND cliente_id != 0 GROUP BY cliente_id ORDER BY total DESC LIMIT 10", (err, rows) => {
                                    if (err) {
                                        console.error('❌ ERROR AL CONSULTAR DEUDAS POR CLIENTE:', err.message);
                                        process.exit(1);
                                    }
                                    console.log('');
                                    console.log('📋 RESUMEN DE DEUDAS POR CLIENTE:');
                                    if (rows.length === 0) {
                                        console.log('   No hay deudas asociadas a clientes válidos');
                                    } else {
                                        rows.forEach(row => {
                                            console.log(`   Cliente ${row.cliente_id}: ${row.deudas} deudas, Total: $${row.total}`);
                                        });
                                    }
                                    
                                    // 10. Mostrar resumen de ventas en cuenta corriente por cliente
                                    db.all("SELECT cliente_id, COUNT(*) as ventas, SUM(total) as total FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND cliente_id IS NOT NULL AND cliente_id != 0 GROUP BY cliente_id ORDER BY total DESC LIMIT 10", (err, rows) => {
                                        if (err) {
                                            console.error('❌ ERROR AL CONSULTAR VENTAS POR CLIENTE:', err.message);
                                            process.exit(1);
                                        }
                                        console.log('');
                                        console.log('📋 RESUMEN DE VENTAS EN CUENTA CORRIENTE POR CLIENTE:');
                                        if (rows.length === 0) {
                                            console.log('   No hay ventas en cuenta corriente asociadas a clientes válidos');
                                        } else {
                                            rows.forEach(row => {
                                                console.log(`   Cliente ${row.cliente_id}: ${row.ventas} ventas, Total: $${row.total}`);
                                            });
                                        }
                                        
                                        // Mensaje final
                                        console.log('');
                                        console.log('🎯 RESUMEN DEL DIAGNÓSTICO:');
                                        console.log('==========================');
                                        console.log('✅ Diagnóstico completado');
                                        console.log('💡 Revisa los datos persistentes para determinar qué eliminar');
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