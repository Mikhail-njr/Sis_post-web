// Test to add barcode to a product and test search
const { apiRequest } = require('./test-utils');

async function testProductBarcode() {
    console.log('🧪 Testing product barcode functionality...\n');

    try {
        // Get first product
        const products = await apiRequest('/products');
        if (products.length === 0) {
            console.log('❌ No products found in database');
            return;
        }

        const product = products[0];
        console.log(`📦 Using product: ${product.nombre} (ID: ${product.id})`);

        // Add barcode to the product
        const barcode = '1234567890128'; // Valid EAN-13
        console.log(`🏷️  Adding barcode ${barcode} to product...`);

        const updateResult = await apiRequest(`/products/${product.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...product,
                codigo_barras: barcode
            })
        });

        console.log('✅ Barcode added to product successfully');

        // Now test searching for the product by barcode
        console.log(`🔍 Searching for product by barcode ${barcode}...`);
        const searchResult = await apiRequest(`/products/search-by-barcode/${barcode}`);

        if (searchResult.found) {
            console.log('✅ Product found by barcode!');
            console.log(`   Product: ${searchResult.product.nombre}`);
            console.log(`   Stock: ${searchResult.product.stock_disponible}`);
            console.log(`   Lote: ${searchResult.lote.numero_lote}`);
            console.log(`   Barcode matches: ${searchResult.barcode === barcode}`);
        } else {
            console.log('❌ Product not found by barcode');
        }

        console.log('\n🎉 PRODUCT BARCODE TEST PASSED!');

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testProductBarcode();