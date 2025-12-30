#!/usr/bin/env node

/**
 * Script de Diagnóstico para Problemas de Deudas sin Productos Asociados
 *
 * Este script analiza el sistema de deudas y detecta problemas comunes:
 * - Deudas sin productos asociados
 * - Inconsistencias de montos
 * - Estadísticas generales del sistema
 *
 * Uso: node test_debt_diagnosis.js
 */

const http = require('http');

// Configuración del servidor
const HOST = 'localhost';
const PORT = 3000;

// Función para formatear moneda
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

// Función para hacer requests HTTP
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic YWRtaW46cG9zMTIz' // admin:pos123
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Función principal de diagnóstico
async function runDiagnosis() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE DEUDAS\n');
    console.log('=' .repeat(60));

    try {
        // 1. Obtener diagnóstico general
        console.log('📊 Paso 1: Obteniendo estadísticas generales...');
        const diagnosticsResponse = await makeRequest('/api/debts/diagnostics');

        if (diagnosticsResponse.status !== 200) {
            console.error('❌ Error obteniendo diagnóstico:', diagnosticsResponse.data);
            return;
        }

        const diagnostics = diagnosticsResponse.data;

        console.log('✅ Estadísticas obtenidas exitosamente\n');

        // Mostrar estadísticas generales
        console.log('📈 ESTADÍSTICAS GENERALES:');
        console.log('-'.repeat(40));
        console.log(`Total de deudas: ${diagnostics.estadisticas.total_deudas}`);
        console.log(`Deudas sin productos: ${diagnostics.estadisticas.deudas_sin_productos}`);
        console.log(`Productos asociados: ${diagnostics.estadisticas.total_productos_asociados}`);
        console.log('');

        // 2. Analizar deudas sin productos
        if (diagnostics.deudas_sin_productos && diagnostics.deudas_sin_productos.length > 0) {
            console.log('🚨 DEUDAS SIN PRODUCTOS ASOCIADOS:');
            console.log('-'.repeat(40));
            console.log('Estas deudas no pueden calcular totales basados en precios actuales.');
            console.log('');

            diagnostics.deudas_sin_productos.forEach((deuda, index) => {
                console.log(`${index + 1}. Deuda ID: ${deuda.id}`);
                console.log(`   Cliente: ${deuda.cliente_nombre}`);
                console.log(`   Factura: ${deuda.numero_factura}`);
                console.log(`   Monto original: ${formatCurrency(deuda.monto_original)}`);
                console.log(`   Fecha: ${new Date(deuda.created_at).toLocaleDateString('es-AR')}`);
                console.log('');
            });

            // 3. Intentar corregir automáticamente
            console.log('🔧 Paso 2: Intentando corrección automática...');
            const fixResponse = await makeRequest('/api/debts/fix-missing-products', 'POST');

            if (fixResponse.status === 200) {
                console.log('✅ Corrección automática exitosa:');
                console.log(`   Deudas corregidas: ${fixResponse.data.fixed}`);
                console.log(`   Detalles: ${fixResponse.data.details.length} deudas procesadas`);

                if (fixResponse.data.details && fixResponse.data.details.length > 0) {
                    console.log('   Detalles de corrección:');
                    fixResponse.data.details.forEach(detail => {
                        console.log(`   - ${detail.cliente} (${detail.factura}): ${detail.productos_asociados} productos asociados`);
                    });
                }
                console.log('');
            } else {
                console.error('❌ Error en corrección automática:', fixResponse.data);
                console.log('');
            }
        } else {
            console.log('✅ No se encontraron deudas sin productos asociados.');
            console.log('');
        }

        // 4. Analizar inconsistencias de montos
        if (diagnostics.deudas_con_problemas && diagnostics.deudas_con_problemas.length > 0) {
            console.log('⚠️ DEUDAS CON INCONSISTENCIAS DE MONTOS:');
            console.log('-'.repeat(40));
            console.log('Estas deudas tienen discrepancias entre el monto original y el cálculo de productos.');
            console.log('');

            diagnostics.deudas_con_problemas.forEach((deuda, index) => {
                const diferencia = deuda.monto_original - deuda.subtotal_calculado;
                console.log(`${index + 1}. Deuda ID: ${deuda.id}`);
                console.log(`   Cliente: ${deuda.cliente_nombre}`);
                console.log(`   Factura: ${deuda.numero_factura}`);
                console.log(`   Monto original: ${formatCurrency(deuda.monto_original)}`);
                console.log(`   Subtotal calculado: ${formatCurrency(deuda.subtotal_calculado)}`);
                console.log(`   Diferencia: ${formatCurrency(diferencia)} (${diferencia > 0 ? 'exceso' : 'defecto'})`);
                console.log(`   Productos asociados: ${deuda.productos_asociados}`);
                console.log('');
            });
        } else {
            console.log('✅ No se encontraron inconsistencias de montos en deudas.');
            console.log('');
        }

        // 5. Validar consistencia general
        console.log('🔍 Paso 3: Validando consistencia general del sistema...');
        const consistencyResponse = await makeRequest('/api/debts/validate-consistency');

        if (consistencyResponse.status === 200) {
            const consistency = consistencyResponse.data;
            console.log('✅ Validación de consistencia completada:');
            console.log(`   Estado: ${consistency.estado}`);
            console.log(`   Deudas sin productos: ${consistency.deudas_sin_productos}`);
            console.log(`   Deudas con monto incorrecto: ${consistency.deudas_con_monto_incorrecto}`);
            console.log(`   Productos huérfanos: ${consistency.productos_huerfanos}`);

            if (consistency.estado === 'INCONSISTENTE') {
                console.log('');
                console.log('⚠️ ATENCIÓN: El sistema tiene inconsistencias que requieren atención.');
                console.log('   Recomendaciones:');
                console.log('   - Ejecutar corrección automática de deudas sin productos');
                console.log('   - Revisar manualmente deudas con montos incorrectos');
                console.log('   - Verificar integridad de datos');
            } else {
                console.log('');
                console.log('✅ El sistema está en estado consistente.');
            }
            console.log('');
        } else {
            console.error('❌ Error validando consistencia:', consistencyResponse.data);
        }

        // 6. Recomendaciones finales
        console.log('📋 RECOMENDACIONES FINALES:');
        console.log('-'.repeat(40));
        console.log('1. Ejecutar diagnóstico regularmente para detectar problemas temprano');
        console.log('2. Mantener productos asociados a todas las deudas');
        console.log('3. Verificar consistencia después de actualizaciones de precios');
        console.log('4. Monitorear el log de operaciones para auditoría');
        console.log('');

        console.log('=' .repeat(60));
        console.log('✅ DIAGNÓSTICO COMPLETADO');

        // Timestamp de finalización
        console.log(`Finalizado en: ${new Date().toLocaleString('es-AR')}`);

    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error.message);
        console.log('');
        console.log('🔧 Sugerencias para resolver problemas de conexión:');
        console.log('1. Verificar que el servidor esté ejecutándose en http://localhost:3000');
        console.log('2. Verificar credenciales de autenticación');
        console.log('3. Verificar conectividad de red');
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log('Script de Diagnóstico de Deudas');
    console.log('');
    console.log('Uso: node test_debt_diagnosis.js');
    console.log('');
    console.log('Este script realiza un diagnóstico completo del sistema de deudas:');
    console.log('- Estadísticas generales');
    console.log('- Deudas sin productos asociados');
    console.log('- Inconsistencias de montos');
    console.log('- Validación de consistencia');
    console.log('- Corrección automática cuando es posible');
    console.log('');
    console.log('Requisitos:');
    console.log('- Servidor ejecutándose en http://localhost:3000');
    console.log('- Credenciales válidas (admin:pos123)');
}

// Verificar argumentos de línea de comandos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Ejecutar diagnóstico
runDiagnosis().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});