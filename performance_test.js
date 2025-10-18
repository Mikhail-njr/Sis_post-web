/**
 * Performance Test Script for POS System
 * Simulates 5 sales per minute for 1 hour (300 sales total)
 * Tests API performance and reliability under load
 */

const fs = require('fs');
const API_BASE = 'http://localhost:3000/api';

// Test configuration
const SALES_PER_MINUTE = 5;
const TEST_DURATION_MINUTES = 60;
const TOTAL_SALES = SALES_PER_MINUTE * TEST_DURATION_MINUTES;
const INTERVAL_MS = (60 * 1000) / SALES_PER_MINUTE; // milliseconds between sales

// Global variables for tracking
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

// Helper function for API requests with timing
async function timedApiRequest(endpoint, options = {}) {
    const startTime = Date.now();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers,
            ...options
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            // Get error message from response body
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorBody = await response.text();
                if (errorBody) {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.error || errorBody;
                }
            } catch (e) {
                // If can't parse error body, use default message
            }
            return { error: errorMessage, responseTime, success: false };
        }

        const data = await response.json();
        return { data, responseTime, success: true };

    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        return { error: error.message, responseTime, success: false };
    }
}

// Log function
function log(message, toFile = true) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    if (toFile) {
        fs.appendFileSync('performance_test_log.txt', logMessage + '\n');
    }
}

// Initialize test environment
async function initializeTest() {
    log('🚀 Initializing Performance Test for POS System');
    log(`📊 Test Configuration: ${SALES_PER_MINUTE} sales/minute for ${TEST_DURATION_MINUTES} minutes (${TOTAL_SALES} total sales)`);

    // Setup authentication
    authHeader = 'Basic ' + btoa('admin:pos123');
    log('🔐 Authentication header prepared');

    // Get available products
    log('📦 Fetching available products...');
    const productResult = await timedApiRequest('/products', {
        headers: { 'Authorization': authHeader }
    });

    if (!productResult.success) {
        log(`❌ Failed to fetch products: ${productResult.error}`);
        return false;
    }

    availableProducts = productResult.data.filter(p => p.stock > 0);
    log(`✅ Found ${availableProducts.length} products with stock`);

    if (availableProducts.length < 3) {
        log('❌ Not enough products with stock for meaningful test');
        return false;
    }

    // Initialize log file
    fs.writeFileSync('performance_test_log.txt', '=== POS PERFORMANCE TEST LOG ===\n\n');
    fs.writeFileSync('performance_test_results.json', '');

    testResults.startTime = new Date();
    return true;
}

// Generate random sale data
function generateRandomSale() {
    // Random number of items (1-5)
    const numItems = Math.floor(Math.random() * 5) + 1;
    const items = [];
    const usedProductIds = new Set();

    for (let i = 0; i < numItems && items.length < availableProducts.length; i++) {
        // Select random product that hasn't been used in this sale
        let product;
        let attempts = 0;
        do {
            product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
            attempts++;
        } while (usedProductIds.has(product.id) && attempts < availableProducts.length);

        if (usedProductIds.has(product.id)) break; // No more unique products available

        usedProductIds.add(product.id);

        // Random quantity (1-3, but not exceeding stock)
        const maxQuantity = Math.min(3, product.stock);
        const quantity = Math.floor(Math.random() * maxQuantity) + 1;

        items.push({
            id: product.id,
            nombre: product.nombre,
            cantidad: quantity,
            precio: product.precio, // Use original price, server calculates discount
            descuento_porcentaje: product.descuento_porcentaje || 0
        });
    }

    // Random payment method
    const paymentMethods = ['efectivo', 'debito', 'credito', 'transferencia'];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    return {
        items: items,
        paymentMethod: paymentMethod
    };
}

// Execute a single sale
async function executeSale(saleNumber) {
    const saleData = generateRandomSale();
    const startTime = Date.now();

    log(`🛒 Executing sale ${saleNumber}/${TOTAL_SALES} with ${saleData.items.length} items`);

    const saleResponse = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
        },
        body: JSON.stringify(saleData)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    let result;
    if (!saleResponse.ok) {
        let errorMessage = `HTTP ${saleResponse.status}: ${saleResponse.statusText}`;
        try {
            const errorBody = await saleResponse.text();
            if (errorBody) {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error || errorBody;
            }
        } catch (e) {
            // If can't parse error body, use default message
        }
        result = { error: errorMessage, responseTime: duration, success: false };
    } else {
        const data = await saleResponse.json();
        result = { data, responseTime: duration, success: true };
    }

    testResults.totalSales++;
    testResults.responseTimes.push(result.responseTime);

    if (result.success) {
        testResults.successfulSales++;
        const total = result.data.total;
        log(`✅ Sale ${saleNumber} SUCCESS: ${result.data.numero_factura} - $${total} (${result.responseTime}ms)`);

        testResults.salesData.push({
            saleNumber,
            numero_factura: result.data.numero_factura,
            total: total,
            items: saleData.items.length,
            paymentMethod: saleData.paymentMethod,
            responseTime: result.responseTime,
            timestamp: new Date().toISOString()
        });
    } else {
        testResults.failedSales++;
        log(`❌ Sale ${saleNumber} FAILED: ${result.error} (${result.responseTime}ms)`);

        testResults.errors.push({
            saleNumber,
            error: result.error,
            responseTime: result.responseTime,
            timestamp: new Date().toISOString()
        });
    }

    return result.success;
}

// Run the performance test
async function runPerformanceTest() {
    if (!(await initializeTest())) {
        log('❌ Test initialization failed');
        return;
    }

    log(`\n🎯 Starting performance test: ${SALES_PER_MINUTE} sales/minute for ${TEST_DURATION_MINUTES} minutes`);
    log(`⏱️  Sales will be executed every ${INTERVAL_MS}ms\n`);

    let saleNumber = 1;
    const testStartTime = Date.now();

    // Execute sales with controlled timing
    const saleInterval = setInterval(async () => {
        if (saleNumber > TOTAL_SALES) {
            clearInterval(saleInterval);
            finalizeTest();
            return;
        }

        await executeSale(saleNumber);
        saleNumber++;

    }, INTERVAL_MS);

    // Fallback timeout in case the interval doesn't complete
    setTimeout(() => {
        clearInterval(saleInterval);
        finalizeTest();
    }, TEST_DURATION_MINUTES * 60 * 1000 + 10000); // Add 10 seconds buffer
}

// Finalize and report results
function finalizeTest() {
    testResults.endTime = new Date();
    const totalDuration = testResults.endTime - testResults.startTime;
    const actualDurationMinutes = totalDuration / (1000 * 60);

    // Calculate statistics
    const successRate = (testResults.successfulSales / testResults.totalSales) * 100;
    const avgResponseTime = testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length;
    const minResponseTime = Math.min(...testResults.responseTimes);
    const maxResponseTime = Math.max(...testResults.responseTimes);
    const medianResponseTime = testResults.responseTimes.sort((a, b) => a - b)[Math.floor(testResults.responseTimes.length / 2)];

    // Calculate throughput
    const actualThroughput = testResults.successfulSales / actualDurationMinutes;

    log('\n🎯 PERFORMANCE TEST COMPLETED');
    log('='.repeat(50));
    log(`📊 Test Duration: ${actualDurationMinutes.toFixed(2)} minutes`);
    log(`🛒 Total Sales Attempted: ${testResults.totalSales}`);
    log(`✅ Successful Sales: ${testResults.successfulSales}`);
    log(`❌ Failed Sales: ${testResults.failedSales}`);
    log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
    log(`⚡ Actual Throughput: ${actualThroughput.toFixed(2)} sales/minute`);
    log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    log(`🏃 Min Response Time: ${minResponseTime}ms`);
    log(`🐌 Max Response Time: ${maxResponseTime}ms`);
    log(`📊 Median Response Time: ${medianResponseTime}ms`);

    // Performance assessment
    log('\n🎯 PERFORMANCE ASSESSMENT:');
    if (successRate >= 95) {
        log('✅ EXCELLENT: High success rate');
    } else if (successRate >= 90) {
        log('⚠️  GOOD: Acceptable success rate');
    } else {
        log('❌ POOR: Low success rate - investigate issues');
    }

    if (avgResponseTime < 500) {
        log('✅ FAST: Good response times');
    } else if (avgResponseTime < 1000) {
        log('⚠️  SLOW: Response times could be better');
    } else {
        log('❌ VERY SLOW: Response times need optimization');
    }

    if (actualThroughput >= SALES_PER_MINUTE * 0.9) {
        log('✅ TARGET MET: Achieved required throughput');
    } else {
        log('❌ TARGET MISSED: Did not achieve required throughput');
    }

    // Save detailed results
    const finalResults = {
        ...testResults,
        statistics: {
            successRate,
            avgResponseTime,
            minResponseTime,
            maxResponseTime,
            medianResponseTime,
            actualThroughput,
            targetThroughput: SALES_PER_MINUTE,
            totalDuration: actualDurationMinutes
        },
        assessment: {
            successRateStatus: successRate >= 95 ? 'EXCELLENT' : successRate >= 90 ? 'GOOD' : 'POOR',
            responseTimeStatus: avgResponseTime < 500 ? 'FAST' : avgResponseTime < 1000 ? 'SLOW' : 'VERY_SLOW',
            throughputStatus: actualThroughput >= SALES_PER_MINUTE * 0.9 ? 'TARGET_MET' : 'TARGET_MISSED'
        }
    };

    fs.writeFileSync('performance_test_results.json', JSON.stringify(finalResults, null, 2));
    log('\n💾 Detailed results saved to performance_test_results.json');
    log('📝 Log saved to performance_test_log.txt');

    // Summary for quick reference
    log('\n📋 QUICK SUMMARY:');
    log(`Success Rate: ${successRate.toFixed(1)}% | Throughput: ${actualThroughput.toFixed(1)}/min | Avg Response: ${avgResponseTime.toFixed(0)}ms`);
}

// Handle process termination
process.on('SIGINT', () => {
    log('\n⏹️  Test interrupted by user');
    finalizeTest();
    process.exit(0);
});

// Run the test
if (require.main === module) {
    runPerformanceTest().catch(error => {
        log(`💥 Critical error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runPerformanceTest };