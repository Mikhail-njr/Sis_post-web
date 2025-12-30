// Script de prueba para el nuevo endpoint simplificado de clientes con cuenta corriente
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testNuevoEndpoint() {
    console.log('🧪 Probando nuevo endpoint /clientes/cuenta-corriente...\n');

    try {
        // Probar el nuevo endpoint simplificado
        console.log('📡 Consultando clientes con cuenta corriente...');
        const response = await fetch(`${API_BASE}/clientes/cuenta-corriente`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ Respuesta exitosa:');
        console.log('📊 Total de clientes:', data.total);
        console.log('👥 Clientes encontrados:', data.clientes.length);

        if (data.clientes.length > 0) {
            console.log('\n📋 Detalles de clientes:');
            data.clientes.forEach((cliente, index) => {
                console.log(`${index + 1}. ${cliente.nombre} (ID: ${cliente.id})`);
                console.log(`   📞 Teléfono: ${cliente.telefono || 'N/A'}`);
                console.log(`   🆔 DNI: ${cliente.dni || 'N/A'}`);
                console.log(`   💰 Saldo pendiente: $${cliente.saldo_pendiente || 0}`);
                console.log(`   📄 Cantidad de deudas: ${cliente.cantidad_deudas || 0}`);
                console.log('');
            });
        } else {
            console.log('ℹ️ No hay clientes con cuenta corriente activa');
        }

        console.log('✅ Prueba completada exitosamente');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

// Ejecutar la prueba
testNuevoEndpoint();