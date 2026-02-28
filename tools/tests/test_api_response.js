const fetch = require('node-fetch');

async function testAPI() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const products = await response.json();

        console.log('First 3 products:');
        products.slice(0, 3).forEach((product, index) => {
            console.log(`Product ${index + 1}:`, {
                id: product.id,
                nombre: product.nombre,
                codigo_barras: product.codigo_barras,
                hasBarcode: !!product.codigo_barras
            });
        });

        // Check if any product has barcode
        const productsWithBarcode = products.filter(p => p.codigo_barras);
        console.log(`\nTotal products: ${products.length}`);
        console.log(`Products with barcode: ${productsWithBarcode.length}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();