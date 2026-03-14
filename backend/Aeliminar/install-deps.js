const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Instalando dependencias para el sistema de autenticación...');

// Verificar si package.json existe
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ No se encontró package.json. Creando uno básico...');
    
    const packageJson = {
        "name": "pos-backend",
        "version": "1.0.0",
        "description": "Backend para sistema POS con autenticación",
        "main": "server.js",
        "scripts": {
            "start": "node server.js",
            "dev": "nodemon server.js"
        },
        "dependencies": {
            "express": "^4.18.2",
            "sqlite3": "^5.1.6",
            "bcrypt": "^5.1.0",
            "cors": "^2.8.5",
            "compression": "^1.7.4",
            "ws": "^8.14.2",
            "express-basic-auth": "^1.2.1"
        },
        "devDependencies": {
            "nodemon": "^3.0.1"
        }
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json creado');
}

// Instalar dependencias
exec('npm install', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error instalando dependencias:', error);
        return;
    }
    
    if (stderr) {
        console.warn('⚠️  Advertencias durante la instalación:', stderr);
    }
    
    console.log('✅ Dependencias instaladas exitosamente');
    console.log('📦 Dependencias instaladas:');
    console.log('  - express: Framework web');
    console.log('  - sqlite3: Base de datos SQLite');
    console.log('  - bcrypt: Encriptación de contraseñas');
    console.log('  - cors: Cross-Origin Resource Sharing');
    console.log('  - compression: Compresión HTTP');
    console.log('  - ws: WebSockets');
    console.log('  - express-basic-auth: Autenticación básica');
    
    console.log('\n🔧 Próximos pasos:');
    console.log('1. Ejecuta: node setup-users.js (para crear la tabla de usuarios)');
    console.log('2. Actualiza el server.js para usar la nueva autenticación');
    console.log('3. Prueba el sistema de login');
});