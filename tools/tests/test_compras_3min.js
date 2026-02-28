/**
 * Test Script: Compras de Alta Carga - 300 por hora
 * Simula 300 ventas por hora (5 ventas por minuto)
 * Tests de rendimiento máximo y estabilidad del sistema
 */

const fs = require('fs');
const API_BASE = 'http://localhost:3000/api';

// Test configuration
const SALES_PER_HOUR = 300;
const TEST_DURATION_HOURS = 1;
const TOTAL_SALES = SALES_PER_HOUR * TEST_DURATION_HOURS;
const INTERVAL_MS = (60 * 60 * 1000) / SALES_PER_HOUR; // milliseconds between sales (12 seconds)

let authHeader = null;
let availableProducts = [];
let testResults = {
    startTime: null,
    endTime: null,
    totalSales: 0,
    successfulSales: 0,
    failedSales: 0,
    responseTimes: [],
    errors: [],
    salesData: []
};

// Función para crear barra de progreso
function createProgressBar(current, total, width = 40) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '─'.repeat(empty);
    return `${bar}│ ${percentage}%`;
}

// Función para mostrar tabla de compras
function displaySalesTable() {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          TABLA DE COMPRAS REALIZADAS                       ║');
    console.log('╠═══════╦════════════════╦══════════════╦════════════╦══════════════════════╣');
    console.log('║ Compra║     Estado     ║ Tiempo (ms)  ║   Total    ║       Factura        ║');
    console.log('╠═══════╬════════════════╬══════════════╬════════════╬══════════════════════╣');

    testResults.salesData.forEach((sale, index) => {
        const status = sale.success ? '✅ EXITOSA' : '❌ FALLIDA';
        const time = sale.responseTime.toString().padStart(12);
        const total = `$${sale.total.toFixed(2)}`.padStart(10);
        const factura = (sale.numero_factura || 'N/A').padStart(20);

        console.log(`║   ${String(index + 1).padStart(3)} ║ ${status.padEnd(14)} ║ ${time} ║ ${total} ║ ${factura} ║`);
    });

    // Agregar líneas vacías si no hay suficientes ventas
    const remainingRows = Math.max(0, 10 - testResults.salesData.length);
    for (let i = 0; i < remainingRows; i++) {
        console.log('║       ║                ║              ║            ║                      ║');
    }

    console.log('╠═══════╬════════════════╬══════════════╬════════════╬══════════════════════╣');

    // Estadísticas
    const successRate = testResults.totalSales > 0 ? (testResults.successfulSales / testResults.totalSales * 100).toFixed(1) : '0.0';
    const avgTime = testResults.responseTimes.length > 0 ? (testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length).toFixed(0) : '0';

    console.log(`║ TOTAL ║ ${String(testResults.totalSales).padStart(3)}/${TOTAL_SALES.toString().padStart(3)} ║ ${avgTime.padStart(12)} ║ ${successRate.padStart(10)}% ║ PROGRESO: ${createProgressBar(testResults.totalSales, TOTAL_SALES)} ║`);
    console.log('╚═══════╩════════════════╩══════════════╩════════════╩══════════════════════╝');

    // Información adicional
    const elapsed = testResults.startTime ? (new Date() - testResults.startTime) / 1000 : 0;
    const estimatedTotal = TOTAL_SALES * (INTERVAL_MS / 1000);
    const remaining = Math.max(0, estimatedTotal - elapsed);

    console.log(`\n⏱️  Tiempo transcurrido: ${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`);
    console.log(`⏳ Tiempo restante estimado: ${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`);
    console.log(`🎯 Próxima venta en: ${Math.max(0, INTERVAL_MS - (Date.now() % INTERVAL_MS))}ms`);
}

function log(message, toFile = true) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    if (toFile) {
        fs.appendFileSync('test_compras_3min_log.txt', logMessage + '\n');
    }
}

async function initializeTest() {
    log('🚀 Inicializando Test: Compras de Alta Carga (300/hora)');
    log(`📊 Configuración: ${SALES_PER_HOUR} ventas/hora durante ${TEST_DURATION_HOURS} hora(s) (${TOTAL_SALES} ventas totales)`);

    authHeader = 'Basic ' + btoa('admin:pos123');
    log('🔐 Header de autenticación preparado');

    log('📦 Obteniendo productos disponibles...');
    const productResult = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
    });

    if (!productResult.ok) {
        log(`❌ Error obteniendo productos: ${productResult.status}`);
        return false;
    }

    const products = await productResult.json();
    availableProducts = products.filter(p => p.stock > 0);
    log(`✅ Encontrados ${availableProducts.length} productos con stock`);

    if (availableProducts.length < 3) {
        log('❌ No hay suficientes productos con stock para el test');
        return false;
    }

    fs.writeFileSync('test_compras_3min_log.txt', '=== TEST COMPRAS CADA 3 MINUTOS ===\n\n');
    fs.writeFileSync('test_compras_3min_results.json', '');

    testResults.startTime = new Date();
    return true;
}

function generateRandomSale() {
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const items = [];
    const usedProductIds = new Set();

    for (let i = 0; i < numItems && items.length < availableProducts.length; i++) {
        let product;
        let attempts = 0;
        do {
            product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
            attempts++;
        } while (usedProductIds.has(product.id) && attempts < availableProducts.length);

        if (usedProductIds.has(product.id)) break;

        usedProductIds.add(product.id);

        const maxQuantity = Math.min(2, product.stock);
        const quantity = Math.floor(Math.random() * maxQuantity) + 1;

        items.push({
            id: product.id,
            nombre: product.nombre,
            cantidad: quantity,
            precio: product.precio,
            descuento_porcentaje: product.descuento_porcentaje || 0
        });
    }

    const paymentMethods = ['efectivo', 'debito', 'credito', 'transferencia'];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    return {
        items: items,
        paymentMethod: paymentMethod
    };
}

async function executeSale(saleNumber) {
    const saleData = generateRandomSale();
    const startTime = Date.now();

    log(`🛒 Ejecutando venta ${saleNumber}/${TOTAL_SALES} con ${saleData.items.length} productos`);

    try {
        const response = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(saleData)
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        testResults.totalSales++;
        testResults.responseTimes.push(duration);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorBody = await response.text();
                if (errorBody) {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.error || errorBody;
                }
            } catch (e) {}

            testResults.failedSales++;
            log(`❌ Venta ${saleNumber} FALLÓ: ${errorMessage} (${duration}ms)`);

            testResults.errors.push({
                saleNumber,
                error: errorMessage,
                responseTime: duration,
                timestamp: new Date().toISOString(),
                success: false
            });

            // Actualizar tabla en tiempo real
            displaySalesTable();

            return false;
        } else {
            const data = await response.json();
            testResults.successfulSales++;

            const total = data.total;
            log(`✅ Venta ${saleNumber} EXITOSA: ${data.numero_factura} - $${total} (${duration}ms)`);

            testResults.salesData.push({
                saleNumber,
                numero_factura: data.numero_factura,
                total: total,
                items: saleData.items.length,
                paymentMethod: saleData.paymentMethod,
                responseTime: duration,
                timestamp: new Date().toISOString(),
                success: true
            });

            // Actualizar tabla en tiempo real
            displaySalesTable();

            return true;
        }

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        testResults.totalSales++;
        testResults.failedSales++;
        testResults.responseTimes.push(duration);

        log(`❌ Venta ${saleNumber} ERROR: ${error.message} (${duration}ms)`);

        testResults.errors.push({
            saleNumber,
            error: error.message,
            responseTime: duration,
            timestamp: new Date().toISOString(),
            success: false
        });

        // Actualizar tabla en tiempo real
        displaySalesTable();

        return false;
    }
}

async function runTestCompras3Min() {
    if (!(await initializeTest())) {
        log('❌ Inicialización del test falló');
        return;
    }

    log(`\n🎯 Iniciando test: ${SALES_PER_HOUR} ventas/hora durante ${TEST_DURATION_HOURS} hora(s)`);
    log(`⏱️  Ventas se ejecutarán cada ${INTERVAL_MS / 1000} segundos\n`);

    // Mostrar tabla inicial
    displaySalesTable();

    let saleNumber = 1;
    const testStartTime = Date.now();

    // Actualizar tabla cada segundo para mostrar progreso de tiempo
    const progressInterval = setInterval(() => {
        displaySalesTable();
    }, 1000);

    const saleInterval = setInterval(async () => {
        if (saleNumber > TOTAL_SALES) {
            clearInterval(saleInterval);
            clearInterval(progressInterval);
            finalizeTest();
            return;
        }

        await executeSale(saleNumber);
        saleNumber++;

    }, INTERVAL_MS);

    // Timeout de respaldo
    setTimeout(() => {
        clearInterval(saleInterval);
        clearInterval(progressInterval);
        finalizeTest();
    }, TEST_DURATION_HOURS * 60 * 60 * 1000 + 30000); // +30 segundos de buffer
}

function finalizeTest() {
    testResults.endTime = new Date();
    const totalDuration = testResults.endTime - testResults.startTime;
    const actualDurationHours = totalDuration / (1000 * 60 * 60);

    const successRate = (testResults.successfulSales / testResults.totalSales) * 100;
    const avgResponseTime = testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length;
    const minResponseTime = Math.min(...testResults.responseTimes);
    const maxResponseTime = Math.max(...testResults.responseTimes);
    const medianResponseTime = testResults.responseTimes.sort((a, b) => a - b)[Math.floor(testResults.responseTimes.length / 2)];

    const actualThroughput = testResults.successfulSales / actualDurationHours;

    // Mostrar tabla final completa
    displaySalesTable();

    console.log('\n🎯 TEST COMPLETADO');
    console.log('='.repeat(80));
    console.log(`📊 Duración del Test: ${actualDurationHours.toFixed(2)} horas`);
    console.log(`🛒 Ventas Intentadas: ${testResults.totalSales}`);
    console.log(`✅ Ventas Exitosas: ${testResults.successfulSales}`);
    console.log(`❌ Ventas Fallidas: ${testResults.failedSales}`);
    console.log(`📈 Tasa de Éxito: ${successRate.toFixed(2)}%`);
    console.log(`⚡ Rendimiento Actual: ${actualThroughput.toFixed(2)} ventas/hora`);
    console.log(`⏱️  Tiempo de Respuesta Promedio: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`🏃 Tiempo de Respuesta Mínimo: ${minResponseTime}ms`);
    console.log(`🐌 Tiempo de Respuesta Máximo: ${maxResponseTime}ms`);
    console.log(`📊 Tiempo de Respuesta Mediano: ${medianResponseTime}ms`);

    console.log('\n🎯 EVALUACIÓN DE RENDIMIENTO:');
    if (successRate >= 95) {
        console.log('✅ EXCELENTE: Alta tasa de éxito');
    } else if (successRate >= 90) {
        console.log('⚠️  BUENO: Tasa de éxito aceptable');
    } else {
        console.log('❌ MALO: Baja tasa de éxito - investigar problemas');
    }

    if (avgResponseTime < 1000) {
        console.log('✅ RÁPIDO: Buenos tiempos de respuesta');
    } else if (avgResponseTime < 2000) {
        console.log('⚠️  LENTO: Tiempos de respuesta podrían mejorar');
    } else {
        console.log('❌ MUY LENTO: Tiempos de respuesta necesitan optimización');
    }

    if (actualThroughput >= SALES_PER_HOUR * 0.9) {
        console.log('✅ OBJETIVO ALCANZADO: Rendimiento requerido alcanzado');
    } else {
        console.log('❌ OBJETIVO NO ALCANZADO: No se alcanzó el rendimiento requerido');
    }

    const finalResults = {
        ...testResults,
        statistics: {
            successRate,
            avgResponseTime,
            minResponseTime,
            maxResponseTime,
            medianResponseTime,
            actualThroughput,
            targetThroughput: SALES_PER_HOUR,
            totalDuration: actualDurationHours
        },
        assessment: {
            successRateStatus: successRate >= 95 ? 'EXCELENTE' : successRate >= 90 ? 'BUENO' : 'MALO',
            responseTimeStatus: avgResponseTime < 1000 ? 'RAPIDO' : avgResponseTime < 2000 ? 'LENTO' : 'MUY_LENTO',
            throughputStatus: actualThroughput >= SALES_PER_HOUR * 0.9 ? 'OBJETIVO_ALCANZADO' : 'OBJETIVO_NO_ALCANZADO'
        }
    };

    fs.writeFileSync('test_compras_3min_results.json', JSON.stringify(finalResults, null, 2));
    log('\n💾 Resultados detallados guardados en test_compras_3min_results.json');
    log('📝 Log guardado en test_compras_3min_log.txt');

    console.log('\n📋 RESUMEN RÁPIDO:');
    console.log(`Tasa de Éxito: ${successRate.toFixed(1)}% | Rendimiento: ${actualThroughput.toFixed(1)}/hora | Respuesta Promedio: ${avgResponseTime.toFixed(0)}ms`);
}

// Manejo de interrupción
process.on('SIGINT', () => {
    log('\n⏹️  Test interrumpido por el usuario');
    finalizeTest();
    process.exit(0);
});

// Ejecutar el test
if (require.main === module) {
    runTestCompras3Min().catch(error => {
        log(`💥 Error crítico: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runTestCompras3Min };