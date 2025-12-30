/**
 * Test para verificar las correcciones del escáner de códigos de barras
 * Prueba permisos de cámara, presets y manejo de video
 */

console.log('=== Test de Correcciones del Escáner ===');

// Test 1: Verificar que los presets existen
console.log('Test 1: Verificando presets de cámara...');
if (typeof CAMERA_PRESETS !== 'undefined') {
    const presets = Object.keys(CAMERA_PRESETS);
    console.log('✅ Presets disponibles:', presets);

    if (presets.includes('small-barcodes')) {
        console.log('✅ Preset "small-barcodes" encontrado');
        console.log('Configuración:', JSON.stringify(CAMERA_PRESETS['small-barcodes'], null, 2));
    } else {
        console.log('❌ Preset "small-barcodes" no encontrado');
    }
} else {
    console.log('❌ CAMERA_PRESETS no definido');
}

// Test 2: Verificar funciones de permiso
console.log('\nTest 2: Verificando funciones de permisos...');
if (typeof requestCameraPermission === 'function') {
    console.log('✅ Función requestCameraPermission existe');
} else {
    console.log('❌ Función requestCameraPermission no encontrada');
}

if (typeof checkCameraSupport === 'function') {
    console.log('✅ Función checkCameraSupport existe');
} else {
    console.log('❌ Función checkCameraSupport no encontrada');
}

// Test 3: Verificar configuración por defecto
console.log('\nTest 3: Verificando configuración por defecto...');
if (typeof loadCameraConfig === 'function') {
    console.log('✅ Función loadCameraConfig existe');
    // Simular carga de configuración
    if (typeof cameraConfig !== 'undefined') {
        console.log('✅ cameraConfig existe');
        console.log('Preset actual:', cameraConfig.preset);
    }
} else {
    console.log('❌ Función loadCameraConfig no encontrada');
}

// Test 4: Verificar soporte de navegador
console.log('\nTest 4: Verificando soporte del navegador...');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✅ getUserMedia soportado');
} else {
    console.log('❌ getUserMedia no soportado');
}

if (navigator.permissions && navigator.permissions.query) {
    console.log('✅ Permissions API soportada');
} else {
    console.log('❌ Permissions API no soportada');
}

// Test 5: Verificar ZXing
console.log('\nTest 5: Verificando ZXing...');
if (typeof ZXing !== 'undefined') {
    console.log('✅ ZXing cargado');
} else {
    console.log('❌ ZXing no cargado');
}

console.log('\n=== Test Completado ===');
console.log('Para probar completamente:');
console.log('1. Abre barcode-scanner.html en un navegador');
console.log('2. Verifica que aparezca el prompt de permisos');
console.log('3. Confirma que la cámara se active sin pantalla negra');
console.log('4. Prueba el preset "Códigos Muy Pequeños"');