const axios = require('axios');

async function testCierresEndpoint() {
    try {
        const response = await axios.get('http://localhost:3000/api/cierres');

        console.log('✅ Respuesta exitosa:');
        console.log(`📊 Total de cierres: ${response.data.length}`);
        console.log('🔍 Últimos 3 cierres:');
        response.data.slice(0, 3).forEach((cierre, index) => {
            console.log(`  ${index + 1}. Fecha: ${cierre.fecha_cierre} | Cierre #${cierre.numero_cierre_dia}`);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('🔍 Detalles del error:', error.response.data);
            console.error('📊 Estado:', error.response.status);
        }
        if (error.stack) {
            console.error('📋 Stack trace:', error.stack);
        }
    }
}

testCierresEndpoint();
