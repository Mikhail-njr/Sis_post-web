const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCierresMultiples() {
    console.log('🧪 Probando funcionalidad de cierres múltiples por día...\n');

    try {
        // 1. Verificar estado inicial
        console.log('1️⃣ Verificando estado inicial...');
        const initialStatus = await axios.get(`${BASE_URL}/api/check-pending-closures`);
        console.log('Estado inicial:', initialStatus.data);

        // 2. Crear preview del primer cierre
        console.log('\n2️⃣ Creando preview del primer cierre...');
        const preview1 = await axios.post(`${BASE_URL}/api/close-register-preview`, {
            dinero_inicial: 100,
            fecha: new Date().toISOString().split('T')[0]
        });
        console.log('Preview 1:', {
            numero_cierre_propuesto: preview1.data.numero_cierre_propuesto,
            cierres_existentes: preview1.data.cierres_existentes.length
        });

        // 3. Confirmar primer cierre
        console.log('\n3️⃣ Confirmando primer cierre...');
        const confirm1 = await axios.post(`${BASE_URL}/api/close-register-confirm`, {
            fecha: new Date().toISOString(),
            fecha_cierre: new Date().toISOString().split('T')[0],
            dinero_inicial: 100,
            total: preview1.data.total,
            total_esperado: preview1.data.total_esperado,
            diferencia: preview1.data.diferencia,
            cantidad_ventas: preview1.data.cantidad_ventas,
            tipo_cierre: 'normal'
        });
        console.log('Cierre 1 confirmado:', confirm1.data);

        // 4. Crear preview del segundo cierre
        console.log('\n4️⃣ Creando preview del segundo cierre...');
        const preview2 = await axios.post(`${BASE_URL}/api/close-register-preview`, {
            dinero_inicial: 50,
            fecha: new Date().toISOString().split('T')[0]
        });
        console.log('Preview 2:', {
            numero_cierre_propuesto: preview2.data.numero_cierre_propuesto,
            cierres_existentes: preview2.data.cierres_existentes.length,
            ultimo_cierre_fecha_hora: preview2.data.ultimo_cierre_fecha_hora
        });

        // 5. Confirmar segundo cierre
        console.log('\n5️⃣ Confirmando segundo cierre...');
        const confirm2 = await axios.post(`${BASE_URL}/api/close-register-confirm`, {
            fecha: new Date().toISOString(),
            fecha_cierre: new Date().toISOString().split('T')[0],
            dinero_inicial: 50,
            total: preview2.data.total,
            total_esperado: preview2.data.total_esperado,
            diferencia: preview2.data.diferencia,
            cantidad_ventas: preview2.data.cantidad_ventas,
            tipo_cierre: 'normal'
        });
        console.log('Cierre 2 confirmado:', confirm2.data);

        // 6. Verificar historial de cierres
        console.log('\n6️⃣ Verificando historial de cierres...');
        const cierres = await axios.get(`${BASE_URL}/api/cierres`);
        console.log('Cierres registrados:', cierres.data.length);
        cierres.data.slice(0, 2).forEach((cierre, index) => {
            console.log(`  Cierre ${index + 1}:`, {
                fecha_cierre: cierre.fecha_cierre,
                numero_cierre_dia: cierre.numero_cierre_dia,
                fecha_hora_cierre: cierre.fecha_hora_cierre,
                total_ventas: cierre.total_ventas
            });
        });

        // 7. Verificar estado final
        console.log('\n7️⃣ Verificando estado final...');
        const finalStatus = await axios.get(`${BASE_URL}/api/check-pending-closures`);
        console.log('Estado final:', finalStatus.data);

        console.log('\n✅ Prueba completada exitosamente!');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
    }
}

// Ejecutar prueba
testCierresMultiples();