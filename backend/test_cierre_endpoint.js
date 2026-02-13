const http = require('http');

// Datos para la solicitud
const data = JSON.stringify({
    dinero_inicial: 100
});

// Opciones de la solicitud
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/close-register-preview',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

// Realizar la solicitud
const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    res.on('data', (chunk) => {
        console.log('Response Body:');
        console.log(chunk.toString());
    });
    
    res.on('end', () => {
        console.log('Request completed successfully');
    });
});

// Manejar errores
req.on('error', (err) => {
    console.error('Error:', err);
});

// Enviar los datos
req.write(data);
req.end();
