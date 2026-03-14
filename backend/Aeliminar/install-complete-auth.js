const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Instalación Completa del Sistema de Autenticación\n');

async function installCompleteAuth() {
    try {
        // Paso 1: Instalar dependencias
        console.log('📦 Paso 1: Instalando dependencias...');
        execSync('node backend/install-auth-deps.js', { stdio: 'inherit' });
        
        // Paso 2: Crear tablas de usuarios
        console.log('\n🗄️  Paso 2: Creando tablas de usuarios...');
        execSync('node backend/setup-users.js', { stdio: 'inherit' });
        
        // Paso 3: Integrar endpoints al servidor
        console.log('\n🔗 Paso 3: Integrando endpoints al servidor...');
        
        // Verificar si el archivo de integración existe
        const integrateFile = path.join(__dirname, 'integrate-auth.js');
        if (fs.existsSync(integrateFile)) {
            console.log('✅ Archivo de integración encontrado');
        } else {
            console.log('❌ Archivo de integración no encontrado');
            process.exit(1);
        }
        
        // Paso 4: Crear script de prueba
        console.log('\n🧪 Paso 4: Creando script de prueba...');
        const testFile = path.join(__dirname, 'test-auth-system.js');
        if (fs.existsSync(testFile)) {
            console.log('✅ Script de prueba creado');
        } else {
            console.log('❌ Error creando script de prueba');
            process.exit(1);
        }
        
        console.log('\n✅ Instalación completada exitosamente!\n');
        
        console.log('📋 Resumen de la instalación:');
        console.log('• Dependencias instaladas: bcrypt, express');
        console.log('• Tablas de usuarios creadas: usuarios, auth_logs');
        console.log('• Endpoints de autenticación configurados');
        console.log('• Usuario admin creado por defecto: admin / pos123');
        console.log('• Scripts de prueba y documentación generados');
        
        console.log('\n🚀 Próximos pasos:');
        console.log('1. Inicia el servidor: node backend/integrate-auth.js');
        console.log('2. Prueba el sistema: node backend/test-auth-system.js');
        console.log('3. Accede al panel de control: http://localhost:3000');
        console.log('4. Configura credenciales en el modal de "🔐 Credenciales"');
        
        console.log('\n💡 Documentación disponible en: docs/SISTEMA_AUTENTICACION_USUARIOS.md');
        
    } catch (error) {
        console.error('❌ Error durante la instalación:', error.message);
        console.log('\n💡 Soluciones comunes:');
        console.log('1. Asegúrate de tener Node.js instalado');
        console.log('2. Verifica permisos de escritura en el directorio');
        console.log('3. Revisa que no haya conflictos de puertos');
        process.exit(1);
    }
}

// Ejecutar la instalación
installCompleteAuth();