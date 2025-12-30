const http = require('http');

const testData = {
    cliente_id: 1, // Asumiendo que existe un cliente con ID 1
    items: [
        {
            producto_id: 1, // Asumiendo que existe un producto con ID 1
            cantidad: 2,
            precio_unitario: 25
        },
        {
            producto_id: 2, // Asumiendo que existe un producto con ID 2
            cantidad: 1,
            precio_unitario: 50
        }
    ],
    fecha_vencimiento: null,
    descripcion: 'Prueba de cargo con productos asociados'
};

const data = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ventas/cuenta-corriente',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': 'Basic ' + Buffer.from('admin:pos123').toString('base64')
    }
};

console.log('Enviando petición de prueba a /api/ventas/cuenta-corriente...');
console.log('Datos:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Respuesta:', body);

        try {
            const response = JSON.parse(body);
            if (response.success) {
                console.log('✅ Prueba exitosa!');
                console.log('Cuenta corriente ID:', response.cuenta_id);
                console.log('Nuevo saldo:', response.nuevo_saldo);
                console.log('Productos registrados:', response.productos_registrados);
                console.log('Deuda creada:', response.deuda_creada);
                if (response.deuda_id) {
                    console.log('Deuda ID:', response.deuda_id);
                }
            } else {
                console.log('❌ Error en la respuesta:', response.error);
            }
        } catch (e) {
            console.log('❌ Error parseando respuesta JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error en la petición:', error.message);
    console.log('Asegúrate de que el servidor esté corriendo en http://localhost:3000');
});

req.write(data);
req.end();