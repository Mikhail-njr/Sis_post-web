#!/usr/bin/env node

/**
 * SCRIPT DE DIAGNÓSTICO PARA CLIENTES DE CUENTA CORRIENTE
 * 
 * Este script verifica que los cambios se hayan aplicado correctamente
 * y ayuda a diagnosticar problemas con la creación de clientes.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando diagnóstico de clientes de cuenta corriente...');

// 1. Verificar que el archivo server.js exista
const serverPath = path.join(__dirname, 'server.js');
if (!fs.existsSync(serverPath)) {
    console.error('❌ Archivo server.js no encontrado');
    process.exit(1);
}

console.log('✅ Archivo server.js encontrado');

// 2. Leer el contenido del server.js
const serverContent = fs.readFileSync(serverPath, 'utf8');

// 3. Verificar cambios aplicados
const checks = [
    {
        name: 'Protección de endpoints para clientes',
        check: () => serverContent.includes('app.use('/api/customers', (req, res, next) => {') &&
                serverContent.includes('if (req.method === 'GET') {') &&
                serverContent.includes('return next();')
    },
    {
        name: 'Función validarClienteDuplicado mejorada',
        check: () => serverContent.includes('console.log('🔍 Validando duplicados para:')') &&
                serverContent.includes('console.error('❌ Error en validación de duplicados:')')
    },
    {
        name: 'Endpoint POST /api/customers mejorado',
        check: () => serverContent.includes('console.log('➕ POST /api/customers - Request body:')') &&
                serverContent.includes('console.error('❌ Error creando cliente:', {')
    },
    {
        name: 'Validaciones robustas',
        check: () => serverContent.includes('nombre.trim().length < 2') &&
                serverContent.includes('nombre.trim().length > 100') &&
                serverContent.includes('/^[0-9]{1,20}$/')
    },
    {
        name: 'Manejo de errores mejorado',
        check: () => serverContent.includes('details: process.env.NODE_ENV === 'development'')
    }
];

let allPassed = true;

checks.forEach(check => {
    const passed = check.check();
    if (passed) {
        console.log('✅', check.name);
    } else {
        console.log('❌', check.name);
        allPassed = false;
    }
});

// 4. Verificar estructura de la tabla clientes
console.log('
🔍 Verificando estructura de la tabla clientes...');
const tableCreationCheck = serverContent.includes('CREATE TABLE IF NOT EXISTS clientes') &&
                           serverContent.includes('nombre TEXT NOT NULL') &&
                           serverContent.includes('telefono TEXT') &&
                           serverContent.includes('direccion TEXT') &&
                           serverContent.includes('dni TEXT');

if (tableCreationCheck) {
    console.log('✅ Estructura de tabla clientes correcta');
} else {
    console.log('❌ Estructura de tabla clientes incorrecta o no encontrada');
    allPassed = false;
}

// 5. Verificar funciones de base de datos
console.log('
🔍 Verificando funciones de base de datos...');
const dbFunctionsCheck = serverContent.includes('function dbAll(') &&
                         serverContent.includes('function dbRun(');

if (dbFunctionsCheck) {
    console.log('✅ Funciones de base de datos presentes');
} else {
    console.log('❌ Funciones de base de datos no encontradas');
    allPassed = false;
}

// 6. Resultado final
console.log('
' + '='.repeat(50));
if (allPassed) {
    console.log('🎉 DIAGNÓSTICO COMPLETADO: Todos los cambios se aplicaron correctamente');
    console.log('
📋 Próximos pasos:');
    console.log('1. Reinicia el servidor: npm start o node backend/server.js');
    console.log('2. Prueba la creación de clientes desde el frontend');
    console.log('3. Verifica que no haya errores 500 en la consola');
    console.log('4. Comprueba que los logs de depuración muestren información útil');
} else {
    console.log('⚠️ DIAGNÓSTICO COMPLETADO: Algunos cambios no se aplicaron correctamente');
    console.log('
🔍 Para diagnosticar manualmente:');
    console.log('1. Revisa el archivo backend/server.js');
    console.log('2. Busca las funciones y endpoints mencionados');
    console.log('3. Verifica que las validaciones estén presentes');
    console.log('4. Asegúrate de que las protecciones de endpoints sean correctas');
}

console.log('
💡 Si sigues teniendo errores 500:');
console.log('- Revisa la consola del servidor para ver los logs de depuración');
console.log('- Verifica que la base de datos esté accesible');
console.log('- Comprueba que no haya conflictos de nombres de funciones');
console.log('- Asegúrate de que todas las dependencias estén instaladas');

console.log('
🔧 Archivo de respaldo:');
console.log('Se creó un respaldo del server.js original en caso de necesitarlo');
