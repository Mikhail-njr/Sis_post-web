// Debug script to test a single sale
const API_BASE = 'http://localhost:3000/api';

async function debugSale() {
    const authHeader = 'Basic ' + btoa('admin:pos123');

    // Get products
    const productsResponse = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': authHeader }
    });
    const products = await productsResponse.json();
    console.log('Products fetched:', products.length);

    const availableProducts = products.filter(p => p.stock > 0);
    console.log('Available products:', availableProducts.length);

    // Use the exact same data as the failing performance test
    const saleData = {
        items: [
            { id: 671, nombre: "Desinfectante", cantidad: 3, precio: 850, descuento_porcentaje: 0 },
            { id: 686, nombre: "Pappardelle", cantidad: 1, precio: 2100, descuento_porcentaje: 0 }
        ],
        paymentMethod: "debito"
    };

    console.log('Sale data:', JSON.stringify(saleData, null, 2));

    // Try the sale
    try {
        const saleResponse = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(saleData)
        });

        console.log('Response status:', saleResponse.status);
        console.log('Response headers:', Object.fromEntries(saleResponse.headers.entries()));

        const responseText = await saleResponse.text();
        console.log('Response body:', responseText);

        if (saleResponse.ok) {
            console.log('SUCCESS!');
        } else {
            console.log('FAILED!');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
}

debugSale();