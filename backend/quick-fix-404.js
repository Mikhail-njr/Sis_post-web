/**
 * Script de Solución Rápida para Errores 404
 * Este script guía al usuario paso a paso para solucionar
 * los errores 404 en el backend de manera rápida y efectiva.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./database-sqlite');

// Configuración de la interfaz de línea de comandos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Variables de estado
let quickFixResults = [];

/**
 * Inicia la solución rápida de errores 404
 */
async function runQuickFix() {
    console.log('⚡ Iniciando solución rápida para errores 404...\n');
    console.log('Este asistente te guiará paso a paso para solucionar');
    console.log('los errores 404 en el backend.\n');

    quickFixResults = [];

    try {
        // Paso 1: Diagnóstico rápido
        await runQuickDiagnostic();

        // Paso 2: Solución rápida
        await applyQuickFix();

        // Paso 3: Verificación final
        await verifyQuickFix();

        // Generar reporte
        generateQuickFixReport();

    } catch (error) {
        console.error(`❌ Error durante la solución rápida: ${error.message}`);
        quickFixResults.push({
            step: 'Solución Rápida General',
            status: 'error',
            message: `Error durante la solución rápida: ${error.message}`
        });
        generateQuickFixReport();
    }
}

/**
 * Paso 1: Diagnóstico rápido
 */
async function runQuickDiagnostic() {
    console.log('🔍 Paso 1: Diagnóstico Rápido\n');

    try {
        // Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Verificar archivos críticos
        await checkCriticalFiles();

        // Verificar rutas críticas
        await checkCriticalRoutes();

        console.log('✅ Diagnóstico rápido completado\n');

    } catch (error) {
        console.error(`❌ Error durante el diagnóstico rápido: ${error.message}`);
        quickFixResults.push({
            step: 'Diagnóstico Rápido',
            status: 'error',
            message: `Error durante el diagnóstico: ${error.message}`
        });
    }
}

/**
 * Verificar conexión con la base de datos
 */
async function checkDatabaseConnection() {
    console.log('📡 Verificando conexión con la base de datos...');

    try {
        const result = await db.query('SELECT 1 as test');
        console.log('✅ Conexión con base de datos exitosa');

        quickFixResults.push({
            step: 'Conexión Base de Datos',
            status: 'success',
            message: 'Conexión con base de datos exitosa'
        });
    } catch (error) {
        console.error(`❌ Error de conexión con base de datos: ${error.message}`);
        quickFixResults.push({
            step: 'Conexión Base de Datos',
            status: 'error',
            message: `Error de conexión: ${error.message}`
        });
    }
}

/**
 * Verificar archivos críticos
 */
function checkCriticalFiles() {
    console.log('📁 Verificando archivos críticos...');

    const criticalFiles = [
        'server.js',
        'database-sqlite.js',
        'response-middleware.js',
        'error-handler.js'
    ];

    for (const file of criticalFiles) {
        const fullPath = path.join(__dirname__, file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ Archivo ${file} existe`);
            quickFixResults.push({
                step: `Archivo ${file}`,
                status: 'success',
                message: 'Existe'
            });
        } else {
            console.error(`❌ Archivo ${file} no existe`);
            quickFixResults.push({
                step: `Archivo ${file}`,
                status: 'error',
                message: 'No existe'
            });
        }
    }
}

/**
 * Verificar rutas críticas
 */
function checkCriticalRoutes() {
    console.log('🛣️ Verificando rutas críticas...');

    try {
        const serverFile = path.join(__dirname__, 'server.js');
        if (fs.existsSync(serverFile)) {
            const serverContent = fs.readFileSync(serverFile, 'utf8');

            const criticalRoutes = [
                '/api/clientes',
                '/api/deudas',
                '/api/ventas',
                '/api/health'
            ];

            for (const route of criticalRoutes) {
                if (serverContent.includes(route)) {
                    console.log(`✅ Ruta ${route} encontrada`);
                    quickFixResults.push({
                        step: `Ruta ${route}`,
                        status: 'success',
                        message: 'Encontrada'
                    });
                } else {
                    console.error(`❌ Ruta ${route} no encontrada`);
                    quickFixResults.push({
                        step: `Ruta ${route}`,
                        status: 'error',
                        message: 'No encontrada'
                    });
                }
            }
        } else {
            console.error('❌ No se encontró el archivo server.js');
            quickFixResults.push({
                step: 'Archivo server.js',
                status: 'error',
                message: 'No encontrado'
            });
        }
    } catch (error) {
        console.error(`❌ Error al verificar rutas: ${error.message}`);
        quickFixResults.push({
            step: 'Rutas Críticas',
            status: 'error',
            message: `Error al verificar: ${error.message}`
        });
    }
}

/**
 * Paso 2: Solución rápida
 */
async function applyQuickFix() {
    console.log('🔧 Paso 2: Aplicando Solución Rápida\n');

    try {
        // Preguntar al usuario si desea aplicar la solución
        const applyFix = await askUser('¿Deseas aplicar la solución automática? (s/n): ');

        if (applyFix.toLowerCase() === 's' || applyFix.toLowerCase() === 'si') {
            console.log('\n🚀 Aplicando solución automática...\n');

            // Aplicar solución de errores 404
            const { runFix } = require('./fix-backend-404');
            await runFix();

            console.log('✅ Solución automática aplicada\n');

            quickFixResults.push({
                step: 'Solución Automática',
                status: 'success',
                message: 'Solución aplicada exitosamente'
            });
        } else {
            console.log('\n✅ Solución automática omitida\n');
            quickFixResults.push({
                step: 'Solución Automática',
                status: 'info',
                message: 'Usuario decidió no aplicar solución automática'
            });
        }

    } catch (error) {
        console.error(`❌ Error al aplicar solución rápida: ${error.message}`);
        quickFixResults.push({
            step: 'Solución Rápida',
            status: 'error',
            message: `Error al aplicar solución: ${error.message}`
        });
    }
}

/**
 * Paso 3: Verificación final
 */
async function verifyQuickFix() {
    console.log('🔍 Paso 3: Verificación Final\n');

    try {
        // Ejecutar validación de errores 404
        const { runValidation } = require('./validate-backend-404');
        await runValidation();

        console.log('✅ Verificación final completada\n');

        quickFixResults.push({
            step: 'Verificación Final',
            status: 'success',
            message: 'Verificación completada'
        });

    } catch (error) {
        console.error(`❌ Error durante la verificación: ${error.message}`);
        quickFixResults.push({
            step: 'Verificación Final',
            status: 'error',
            message: `Error durante la verificación: ${error.message}`
        });
    }
}

/**
 * Pregunta al usuario y espera una respuesta
 */
function askUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

/**
 * Genera el reporte final de la solución rápida
 */
function generateQuickFixReport() {
    console.log('📊 Generando reporte de la solución rápida...\n');

    // Mostrar resultados
    quickFixResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : result.status === 'error' ? '❌' : 'ℹ️';
        console.log(`${icon} ${result.step}: ${result.message}`);
    });

    // Resumen
    const successCount = quickFixResults.filter(r => r.status === 'success').length;
    const warningCount = quickFixResults.filter(r => r.status === 'warning').length;
    const errorCount = quickFixResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen de la Solución Rápida:');
    console.log(`✅ Pasos exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mensaje final
    if (errorCount === 0 && warningCount === 0) {
        console.log('\n🎉 ¡Solución rápida exitosa!');
        console.log('✅ Los errores 404 deberían estar resueltos');
        console.log('💡 Próximos pasos:');
        console.log('1. Reinicia el servidor backend');
        console.log('2. Abre el dashboard: http://localhost:3000/dashboard.html');
        console.log('3. Verifica que las deudas se muestren correctamente');
    } else {
        console.log('\n⚠️ Solución con advertencias o errores');
        console.log('💡 Revisa los mensajes anteriores');
        console.log('💡 Considera ejecutar los scripts manualmente:');
        console.log('   - node backend/diagnostic-backend-404.js');
        console.log('   - node backend/fix-backend-404.js');
        console.log('   - node backend/validate-backend-404.js');
    }

    console.log('\n✅ Solución rápida completada');

    // Cerrar la interfaz de línea de comandos
    rl.close();
}

// Ejecutar la solución rápida si este script se ejecuta directamente
if (require.main === module) {
    runQuickFix().catch(console.error);
}

module.exports = { runQuickFix };