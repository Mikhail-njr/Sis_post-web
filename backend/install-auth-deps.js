const fs = require('fs');
const path = require('path');

console.log('📦 Instalando dependencias para el sistema de autenticación...\n');

// Verificar si package.json existe
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson = {};

if (fs.existsSync(packageJsonPath)) {
    try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log('✅ package.json encontrado');
    } catch (error) {
        console.error('❌ Error leyendo package.json:', error.message);
        process.exit(1);
    }
} else {
    console.log('⚠️  package.json no encontrado, creando uno nuevo');
    packageJson = {
        "name": "sistema-pos",
        "version": "1.0.0",
        "description": "Sistema POS con autenticación basada en base de datos",
        "main": "server.js",
        "scripts": {
            "start": "node server.js",
            "dev": "nodemon server.js"
        },
        "dependencies": {},
        "devDependencies": {}
    };
}

// Dependencias necesarias para el sistema de autenticación
const authDependencies = {
    'bcrypt': '^5.1.1',
    'express': '^4.18.2'
};

// Verificar si las dependencias ya están instaladas
const currentDeps = packageJson.dependencies || {};
const missingDeps = [];

Object.keys(authDependencies).forEach(dep => {
    if (!currentDeps[dep] || currentDeps[dep] !== authDependencies[dep]) {
        missingDeps.push(`${dep}@${authDependencies[dep]}`);
    }
});

if (missingDeps.length === 0) {
    console.log('✅ Todas las dependencias de autenticación ya están instaladas');
} else {
    console.log('📦 Dependencias faltantes:', missingDeps.join(', '));
    
    // Actualizar package.json
    missingDeps.forEach(depString => {
        const [depName, depVersion] = depString.split('@');
        currentDeps[depName] = depVersion;
    });
    
    packageJson.dependencies = currentDeps;
    
    try {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json actualizado');
    } catch (error) {
        console.error('❌ Error actualizando package.json:', error.message);
        process.exit(1);
    }
    
    // Intentar instalar las dependencias
    const { execSync } = require('child_process');
    
    try {
        console.log('🔄 Instalando dependencias...');
        execSync('npm install', { stdio: 'inherit', cwd: __dirname });
        console.log('✅ Dependencias instaladas exitosamente');
    } catch (error) {
        console.error('❌ Error instalando dependencias:', error.message);
        console.log('\n💡 Puedes intentar instalar manualmente:');
        missingDeps.forEach(dep => {
            console.log(`   npm install ${dep}`);
        });
        process.exit(1);
    }
}

console.log('\n🎉 Instalación completada exitosamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Ejecuta: node backend/setup-users.js');
console.log('2. Esto creará las tablas de usuarios y creará el usuario admin por defecto');
console.log('3. Usuario por defecto: admin / Contraseña: pos123');