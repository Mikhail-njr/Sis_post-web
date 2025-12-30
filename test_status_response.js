// Script para probar la nueva funcionalidad de estados de productos
const http = require('http');

function testProductStatus() {
    const API_BASE = 'localhost';
    const PORT = 3000;

    console.log('🧪 Probando respuesta de producto con estado...\n');

    // Probar con el código de barras del Cif (que debería estar sin stock inicialmente)
    const barcode = '7791290795778';
    console.log(`🔍 Probando código de barras: ${barcode}`);

    const options = {
        hostname: API_BASE,
        port: PORT,
        path: `/api/products/search-by-barcode/${barcode}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';

        console.log(`📡 Estado HTTP: ${res.statusCode}`);

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log(`📦 Respuesta:`, JSON.stringify(jsonData, null, 2));

                if (jsonData.found) {
                    console.log(`✅ Producto encontrado: ${jsonData.product.nombre}`);
                    console.log(`📊 Estado: ${jsonData.status}`);
                    console.log(`💬 Mensaje: ${jsonData.status_message}`);

                    if (jsonData.status === 'sin_stock') {
                        console.log('🎯 ¡Éxito! El producto se reporta como sin stock');
                    } else if (jsonData.status === 'vencido') {
                        console.log('🎯 ¡Éxito! El producto se reporta como vencido');
                    } else if (jsonData.status === 'available') {
                        console.log('🎯 ¡Éxito! El producto está disponible');
                    }
                } else {
                    console.log('❌ Producto no encontrado');
                }
            } catch (parseError) {
                console.error('❌ Error parseando respuesta JSON:', parseError.message);
                console.log('📄 Respuesta cruda:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error en la petición HTTP:', error.message);
    });

    req.setTimeout(5000, () => {
        console.error('❌ Timeout en la petición HTTP');
        req.destroy();
    });

    req.end();
}

testProductStatus();