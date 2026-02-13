// Script de prueba para validar el sistema de cambio de credenciales

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testChangeCredentials() {
    console.log('🧪 Iniciando pruebas del sistema de cambio de credenciales...\n');

    // 1. Probar autenticación con credenciales actuales
    console.log('1. Probando autenticación con credenciales actuales...');
    try {
        const authResponse = await axios.get(`${API_BASE}/auth-test`, {
            auth: {
                username: 'admin',
                password: 'pos123'
            }
        });
        console.log('✅ Autenticación exitosa:', authResponse.data);
    } catch (error) {
        console.log('❌ Error de autenticación:', error.response?.data || error.message);
        return;
    }

    // 2. Probar cambio de credenciales
    console.log('\n2. Probando cambio de credenciales...');
    try {
        const changeResponse = await axios.post(`${API_BASE}/change-credentials`, {
            newUsername: 'admin',
            newPassword: 'BKDLMG'
        }, {
            auth: {
                username: 'admin',
                password: 'pos123'
            }
        });
        console.log('✅ Cambio de credenciales exitoso:', changeResponse.data);
    } catch (error) {
        console.log('❌ Error al cambiar credenciales:', error.response?.data || error.message);
        return;
    }

    // 3. Probar autenticación con nuevas credenciales
    console.log('\n3. Probando autenticación con nuevas credenciales...');
    try {
        const newAuthResponse = await axios.get(`${API_BASE}/auth-test`, {
            auth: {
                username: 'admin',
                password: 'BKDLMG'
            }
        });
        console.log('✅ Autenticación con nuevas credenciales exitosa:', newAuthResponse.data);
    } catch (error) {
        console.log('❌ Error de autenticación con nuevas credenciales:', error.response?.data || error.message);
        return;
    }

    // 4. Probar que las credenciales antiguas ya no funcionan
    console.log('\n4. Probando que las credenciales antiguas ya no funcionan...');
    try {
        await axios.get(`${API_BASE}/auth-test`, {
            auth: {
                username: 'admin',
                password: 'pos123'
            }
        });
        console.log('❌ ERROR: Las credenciales antiguas siguen funcionando');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Las credenciales antiguas fueron correctamente invalidadas');
        } else {
            console.log('❌ Error inesperado:', error.response?.data || error.message);
        }
    }

    // 5. Probar validación de datos
    console.log('\n5. Probando validación de datos...');
    
    // Intentar cambiar a un usuario igual
    try {
        await axios.post(`${API_BASE}/change-credentials`, {
            newUsername: 'admin',
            newPassword: 'BKDLMG'
        }, {
            auth: {
                username: 'admin',
                password: 'BKDLMG'
            }
        });
        console.log('❌ ERROR: Debería rechazar usuario igual');
    } catch (error) {
        console.log('✅ Validación de usuario igual:', error.response?.data?.error || error.message);
    }

    // Intentar cambiar con contraseña corta
    try {
        await axios.post(`${API_BASE}/change-credentials`, {
            newUsername: 'admin2',
            newPassword: '12'
        }, {
            auth: {
                username: 'admin',
                password: 'BKDLMG'
            }
        });
        console.log('❌ ERROR: Debería rechazar contraseña corta');
    } catch (error) {
        console.log('✅ Validación de contraseña corta:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 Pruebas completadas exitosamente!');
}

// Ejecutar pruebas
testChangeCredentials().catch(console.error);