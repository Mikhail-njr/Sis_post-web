const fs = require('fs');
const API_BASE = 'http://localhost:3000/api';

async function log(message) {
    console.log(message);
    fs.appendFileSync('test_lotes_log.txt', message + '\n');
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers,
        ...options
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function runLotesTest() {
    try {
        fs.writeFileSync('test_lotes_log.txt', '=== TEST DE LOTES - 5 COMPRAS ===\n\n');

        await log('🚀 Starting Lotes Test - 5 Purchases');

        // Test 1: Check server status
        await log('🧪 Test 1: Checking server status...');
        const diagnostic = await apiRequest('/diagnostic');
        await log(`✅ Server OK: ${diagnostic.total_products} products, ${diagnostic.total_sales} sales`);

        // Test 2: Login with admin credentials
        await log('🔐 Test 2: Logging in with admin credentials...');
        const authHeader = 'Basic ' + btoa('admin:pos123');

        try {
            const products = await apiRequest('/products', {
                headers: { 'Authorization': authHeader }
            });
            await log(`✅ Login successful, fetched ${products.length} products`);
        } catch (error) {
            await log('❌ Login failed:', error.message);
            return;
        }

        // Test 3: Get initial lotes status
        await log('📦 Test 3: Getting initial lotes status...');
        const initialLotes = await apiRequest('/lotes', {
            headers: { 'Authorization': authHeader }
        });
        await log(`✅ Found ${initialLotes.length} lotes initially`);

        // Log initial stock per lote
        for (const lote of initialLotes) {
            await log(`  Lote ${lote.numero_lote}: ${lote.cantidad_actual}/${lote.cantidad_inicial} unidades`);
        }

        // Test 4: Perform 5 purchases and verify lote deduction
        await log('🛒 Test 4: Performing 5 purchases and verifying lote deduction...');

        const products = await apiRequest('/products', {
            headers: { 'Authorization': authHeader }
        });

        if (products.length < 5) {
            await log('❌ Not enough products for test');
            return;
        }

        // Filter products that have available lotes
        const productsWithLotes = products.filter(p => {
            const productLotes = initialLotes.filter(l => l.producto_id == p.id && l.cantidad_actual > 0 && l.estado_vencimiento !== 'vencido');
            return productLotes.length > 0 && productLotes.reduce((sum, l) => sum + l.cantidad_actual, 0) >= 3;
        });

        await log(`📊 Found ${productsWithLotes.length} products with valid lotes out of ${products.length} total products`);

        if (productsWithLotes.length < 5) {
            await log(`❌ Not enough products with available lotes for test. Found ${productsWithLotes.length} products with valid lotes.`);
            await log(`   Available products: ${productsWithLotes.map(p => `${p.nombre} (${p.stock} stock)`).join(', ')}`);
            return;
        }

        const purchases = [];
        const paymentMethods = ['efectivo', 'transferencia', 'debito', 'credito'];

        for (let i = 0; i < 5; i++) {
            const product = productsWithLotes[i];
            const quantity = Math.min(3, product.stock); // Buy up to 3 units per purchase

            if (quantity <= 0) {
                await log(`⚠️  Product ${product.nombre} has no stock, skipping`);
                continue;
            }

            // Additional validation: check if there are lotes with available stock
            const availableLotes = initialLotes.filter(l => l.producto_id == product.id && l.cantidad_actual > 0 && l.estado_vencimiento !== 'vencido');
            if (availableLotes.length === 0) {
                await log(`⚠️  Product ${product.nombre} has no available lotes (vigentes), skipping`);
                continue;
            }

            const totalLoteStock = availableLotes.reduce((sum, l) => sum + l.cantidad_actual, 0);
            if (totalLoteStock < quantity) {
                await log(`⚠️  Product ${product.nombre} has insufficient lote stock (${totalLoteStock} available, ${quantity} requested), skipping`);
                continue;
            }

            const paymentMethod = paymentMethods[i % paymentMethods.length];

            const saleData = {
                items: [{
                    id: product.id,
                    nombre: product.nombre,
                    cantidad: quantity,
                    precio: product.precio,
                    descuento_porcentaje: product.descuento_porcentaje || 0
                }],
                paymentMethod: paymentMethod
            };

            await log(`\n--- Purchase ${i + 1} ---`);
            await log(`Product: ${product.nombre} (ID: ${product.id})`);
            await log(`Quantity: ${quantity}, Price: $${product.precio}`);

            // Get lotes before purchase
            const lotesBefore = await apiRequest(`/products/${product.id}/lotes`, {
                headers: { 'Authorization': authHeader }
            });
            await log(`Lotes before purchase: ${lotesBefore.map(l => `${l.numero_lote}: ${l.cantidad_actual}`).join(', ')}`);

            try {
                const response = await apiRequest('/sales', {
                    method: 'POST',
                    headers: { 'Authorization': authHeader },
                    body: JSON.stringify(saleData)
                });

                await log(`✅ Purchase ${i + 1} completed: ${response.numero_factura} - $${response.total}`);
                purchases.push(response);

                // Get lotes after purchase
                const lotesAfter = await apiRequest(`/products/${product.id}/lotes`, {
                    headers: { 'Authorization': authHeader }
                });
                await log(`Lotes after purchase: ${lotesAfter.map(l => `${l.numero_lote}: ${l.cantidad_actual}`).join(', ')}`);

                // Verify deduction
                const totalBefore = lotesBefore.reduce((sum, l) => sum + l.cantidad_actual, 0);
                const totalAfter = lotesAfter.reduce((sum, l) => sum + l.cantidad_actual, 0);
                const expectedDeduction = quantity;

                if (totalBefore - totalAfter === expectedDeduction) {
                    await log(`✅ Stock deduction correct: ${totalBefore} → ${totalAfter} (-${expectedDeduction})`);
                } else {
                    await log(`❌ Stock deduction incorrect: ${totalBefore} → ${totalAfter} (expected -${expectedDeduction})`);
                }

            } catch (error) {
                await log(`❌ Purchase ${i + 1} failed: ${error.message}`);
                await log(`   Error details: ${JSON.stringify(error, null, 2)}`);
                await log(`   Sale data attempted: ${JSON.stringify(saleData, null, 2)}`);
                await log(`   Product stock before: ${product.stock}, quantity requested: ${quantity}`);
                await log(`   Lotes available: ${lotesBefore.map(l => `${l.numero_lote}: ${l.cantidad_actual} (${l.estado_vencimiento})`).join(', ')}`);
            }
        }

        // Test 5: Final verification - check all lotes
        await log('\n📊 Test 5: Final verification of all lotes...');
        const finalLotes = await apiRequest('/lotes', {
            headers: { 'Authorization': authHeader }
        });

        await log(`✅ Final lotes status (${finalLotes.length} lotes):`);
        for (const lote of finalLotes) {
            await log(`  Lote ${lote.numero_lote}: ${lote.cantidad_actual}/${lote.cantidad_inicial} unidades restantes`);
        }

        // Test 6: Check sales history
        await log('\n📋 Test 6: Checking sales history...');
        const sales = await apiRequest('/sales', {
            headers: { 'Authorization': authHeader }
        });

        await log(`✅ Found ${sales.length} total sales`);
        sales.slice(-5).forEach((sale, index) => {
            log(`  Recent sale ${index + 1}: ${sale.numero_factura} - $${sale.total} - ${sale.metodo_pago}`);
        });

        // Generate report
        const reportData = {
            timestamp: new Date().toISOString(),
            test_summary: {
                totalPurchases: purchases.length,
                totalLotesInitially: initialLotes.length,
                totalLotesFinally: finalLotes.length,
                totalRevenue: purchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0)
            },
            purchases: purchases,
            initial_lotes: initialLotes,
            final_lotes: finalLotes
        };

        fs.writeFileSync('test_lotes_report.json', JSON.stringify(reportData, null, 2));
        await log(`\n✅ Report generated and saved to test_lotes_report.json`);
        await log(`📊 Test completed: ${purchases.length} purchases, $${reportData.test_summary.totalRevenue.toFixed(2)} revenue`);

        await log('\n🎯 LOTES TEST COMPLETED SUCCESSFULLY!');

    } catch (error) {
        await log('💥 Critical error during lotes testing:', error.message);
    }
}

runLotesTest();