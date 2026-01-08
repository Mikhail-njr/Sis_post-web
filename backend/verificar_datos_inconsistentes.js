#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE VERIFICACIÓN: Datos inconsistentes
 *
 * Este script identifica datos que impiden la creación de relaciones FOREIGN KEY
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3').verbose();

// Rutas de archivos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const sqlScriptPath = path.join(__dirname, 'VERIFICAR_DATOS_INCONSISTENTES_SIMPLE.sql');

console.log('🔍 INICIANDO VERIFICACIÓN DE DATOS INCONSISTENTES');
console.log('==================================================');

// Verificar que el script SQL exista
if (!fs.existsSync(sqlScriptPath)) {
    console.error('❌ ERROR: No se encontró el script SQL de verificación');
    console.error(`   Ruta esperada: ${sqlScriptPath}`);
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
console.log('⚡ EJECUTANDO VERIFICACIÓN...');
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
            process.exit(1);
        }
        
        console.log('✅ VERIFICACIÓN COMPLETA');
        
        // Mensaje final
        console.log('');
        console.log('🎯 PRÓXIMOS PASOS:');
        console.log('   1. Revisa los datos inconsistentes mostrados arriba');
        console.log('   2. Elimina manualmente los datos que impiden las relaciones');
        console.log('   3. Vuelve a ejecutar el script de implementación');
        console.log('');
        
        db.close();
    });
});

// Manejo de errores de la base de datos
db.on('error', (err) => {
    console.error('❌ ERROR EN LA BASE DE DATOS:', err.message);
    process.exit(1);
});