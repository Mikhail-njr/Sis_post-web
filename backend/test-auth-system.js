const axios = require('axios');

// Configuración de la API
const API_BASE = 'http://localhost:3000';

// Credenciales de prueba
const TEST_CREDENTIALS = {
    admin: { username: 'admin', password: 'pos123' },
    cajero: { username: 'cajero', password: 'cajero123' },
    invitado: { username: 'invitado', password: 'invitado123' }
};

async function testAuthSystem() {
    console.log('🧪 Probando Sistema de Autenticación\n');

    try {
        // 1. Probar login exitoso
        console.log('1. Probando login exitoso...');
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            username: TEST_CREDENTIALS.admin.username,
            password: TEST_CREDENTIALS.admin.password
        });
        
        console.log('✅ Login exitoso:', loginResponse.data);
        const token = loginResponse.data.token;

        // 2. Probar perfil con autenticación
        console.log('\n2. Probando perfil con autenticación...');
        const profileResponse = await axios.get(`${API_BASE}/api/auth/profile`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:${TEST_CREDENTIALS.admin.password}`).toString('base64')}`
            }
        });
        console.log('✅ Perfil obtenido:', profileResponse.data);

        // 3. Probar cambio de contraseña
        console.log('\n3. Probando cambio de contraseña...');
        const changePasswordResponse = await axios.post(`${API_BASE}/api/auth/change-password`, {
            currentPassword: TEST_CREDENTIALS.admin.password,
            newPassword: 'nueva123'
        }, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:${TEST_CREDENTIALS.admin.password}`).toString('base64')}`
            }
        });
        console.log('✅ Contraseña cambiada:', changePasswordResponse.data);

        // 4. Probar login con nueva contraseña
        console.log('\n4. Probando login con nueva contraseña...');
        const newLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            username: TEST_CREDENTIALS.admin.username,
            password: 'nueva123'
        });
        console.log('✅ Login con nueva contraseña exitoso:', newLoginResponse.data);

        // 5. Probar gestión de usuarios (requiere admin)
        console.log('\n5. Probando gestión de usuarios...');
        const usersResponse = await axios.get(`${API_BASE}/api/users`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:nueva123`).toString('base64')}`
            }
        });
        console.log('✅ Usuarios listados:', usersResponse.data);

        // 6. Probar creación de nuevo usuario
        console.log('\n6. Probando creación de usuario...');
        const newUserResponse = await axios.post(`${API_BASE}/api/users`, {
            username: 'testuser',
            password: 'test123',
            nombre_completo: 'Usuario de Prueba',
            email: 'test@example.com',
            rol: 'cajero'
        }, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:nueva123`).toString('base64')}`
            }
        });
        console.log('✅ Usuario creado:', newUserResponse.data);

        // 7. Probar login del nuevo usuario
        console.log('\n7. Probando login del nuevo usuario...');
        const testUserLogin = await axios.post(`${API_BASE}/api/auth/login`, {
            username: 'testuser',
            password: 'test123'
        });
        console.log('✅ Login del nuevo usuario exitoso:', testUserLogin.data);

        // 8. Probar intentos fallidos (bloqueo)
        console.log('\n8. Probando intentos fallidos (bloqueo)...');
        try {
            await axios.post(`${API_BASE}/api/auth/login`, {
                username: 'testuser',
                password: 'contraseña-incorrecta'
            });
        } catch (error) {
            console.log('✅ Intento fallido bloqueado:', error.response.data);
        }

        // 9. Probar logs de autenticación
        console.log('\n9. Probando logs de autenticación...');
        const logsResponse = await axios.get(`${API_BASE}/api/auth-logs`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:nueva123`).toString('base64')}`
            }
        });
        console.log('✅ Logs obtenidos:', logsResponse.data.logs.length, 'registros');

        // 10. Probar cambio de credenciales (admin)
        console.log('\n10. Probando cambio de credenciales (admin)...');
        const changeCredentialsResponse = await axios.put(`${API_BASE}/api/credentials`, {
            currentUsername: TEST_CREDENTIALS.admin.username,
            currentPassword: 'nueva123',
            newUsername: 'admin-modificado',
            newPassword: 'admin123'
        }, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TEST_CREDENTIALS.admin.username}:nueva123`).toString('base64')}`
            }
        });
        console.log('✅ Credenciales cambiadas:', changeCredentialsResponse.data);

        console.log('\n🎉 Todas las pruebas del sistema de autenticación fueron exitosas!');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.response?.data || error.message);
        console.log('\n💡 Para solucionar errores:');
        console.log('1. Asegúrate de que el servidor esté corriendo');
        console.log('2. Verifica que las tablas de usuarios estén creadas');
        console.log('3. Confirma que el usuario admin exista');
        console.log('4. Revisa las credenciales por defecto');
    }
}

// Ejecutar las pruebas
testAuthSystem();