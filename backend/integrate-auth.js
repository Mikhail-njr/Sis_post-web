const express = require('express');
const path = require('path');

// Importar los endpoints de autenticación
const authEndpoints = require('./auth-endpoints');
const credentialsEndpoints = require('./credentials-endpoints');
const usersEndpoints = require('./users-endpoints');

// Crear una aplicación Express para probar los endpoints
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde el directorio actual
app.use(express.static(path.join(__dirname)));

// Montar los endpoints de autenticación
app.use('/', authEndpoints);
app.use('/', credentialsEndpoints);
app.use('/', usersEndpoints);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send(`
        <h1>Sistema de Autenticación POS</h1>
        <p>Endpoints disponibles:</p>
        <ul>
            <li>POST /api/auth/login - Iniciar sesión</li>
            <li>POST /api/auth/change-password - Cambiar contraseña</li>
            <li>GET /api/auth/profile - Obtener perfil</li>
            <li>PUT /api/auth/profile - Actualizar perfil</li>
            <li>GET /api/credentials - Obtener credenciales (admin)</li>
            <li>PUT /api/credentials - Cambiar credenciales (admin)</li>
            <li>GET /api/users - Listar usuarios (admin)</li>
            <li>POST /api/users - Crear usuario (admin)</li>
            <li>PUT /api/users/:id - Actualizar usuario (admin)</li>
            <li>DELETE /api/users/:id - Eliminar usuario (admin)</li>
            <li>GET /api/auth-logs - Ver logs (admin)</li>
        </ul>
    `);
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de autenticación iniciado en http://localhost:${PORT}`);
    console.log('📋 Endpoints de autenticación cargados exitosamente');
    console.log('\n💡 Para probar el sistema:');
    console.log('1. Asegúrate de tener las tablas de usuarios creadas');
    console.log('2. Crea el usuario admin por defecto');
    console.log('3. Prueba los endpoints con las credenciales: admin / pos123');
});