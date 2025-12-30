// Script para diagnosticar el error 500 en /api/ventas/cuenta-corriente

const fetch = require('node-fetch');

async function testCuentaCorriente() {
    try {
        console.log('🔍 Probando endpoint /api/ventas/cuenta-corriente...');

        // Datos de prueba usando IDs reales de la BD
        const testData = {
            cliente_id: 29, // Cliente existente: Ana
            items: [
                {
                    producto_id: 336, // Producto existente: Agua Mineral Villavicencio Sin Gas 1.5L
                    cantidad: 1,
                    precio_unitario: 1200 // Precio real del producto
                }
            ]
        };

        console.log('📤 Enviando datos:', JSON.stringify(testData, null, 2));

        const response = await fetch('http://localhost:3000/api/ventas/cuenta-corriente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:pos123').toString('base64')
            },
            body: JSON.stringify(testData)
        });

        console.log('📥 Status:', response.status);
        console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            return;
        }

        const result = await response.json();
        console.log('✅ Success response:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('💥 Error en la prueba:', error);
    }
}

// Ejecutar la prueba
testCuentaCorriente();