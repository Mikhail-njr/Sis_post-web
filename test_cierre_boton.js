// Script de diagnóstico para el botón "Cerrar Caja"
// Ejecutar en la consola del navegador en http://localhost:3000/dashboard.html

console.log('🔍 DIAGNÓSTICO DEL BOTÓN "CERRAR CAJA"');
console.log('========================================');

// 1. Verificar que el script cierre-caja-functions.js se cargó
console.log('1. Verificación de carga de scripts:');
console.log('- cierre-caja-functions.js cargado:', typeof window.calculateCloseRegister === 'function');
console.log('- Función window.openCierreModal:', typeof window.openCierreModal === 'function');

// 2. Verificar que el botón existe
const closeRegisterBtn = document.getElementById('closeRegisterBtn');
console.log('2. Verificación del botón:');
console.log('- Botón existe:', !!closeRegisterBtn);
if (closeRegisterBtn) {
    console.log('- Texto del botón:', closeRegisterBtn.textContent);
    console.log('- Evento onclick:', closeRegisterBtn.onclick);
    console.log('- Atributo onclick:', closeRegisterBtn.getAttribute('onclick'));
}

// 3. Verificar que el modal existe
const cierreModal = document.getElementById('cierreModal');
console.log('3. Verificación del modal:');
console.log('- Modal existe:', !!cierreModal);
if (cierreModal) {
    console.log('- Clases del modal:', cierreModal.className);
    console.log('- Está visible:', cierreModal.classList.contains('show'));
}

// 4. Verificar funciones disponibles
console.log('4. Funciones disponibles en window:');
const cierreFunctions = Object.keys(window).filter(key =>
    key.toLowerCase().includes('cierre') ||
    key.toLowerCase().includes('modal') ||
    key === 'openCierreModal'
);
console.log('- Funciones relacionadas:', cierreFunctions);

// 5. Probar apertura manual del modal
console.log('5. Prueba de apertura manual:');
if (typeof window.openCierreModal === 'function') {
    console.log('✅ Función openCierreModal disponible, ejecutando...');
    try {
        window.openCierreModal();
        console.log('✅ Función ejecutada sin errores');
        setTimeout(() => {
            console.log('- Modal visible después de ejecutar:', cierreModal.classList.contains('show'));
        }, 100);
    } catch (error) {
        console.error('❌ Error al ejecutar openCierreModal:', error);
    }
} else {
    console.error('❌ Función openCierreModal no disponible');
}

// 6. Verificar si hay errores en el evento del botón
console.log('6. Prueba del evento del botón:');
if (closeRegisterBtn) {
    console.log('Haciendo clic en el botón...');
    try {
        closeRegisterBtn.click();
        setTimeout(() => {
            console.log('- Modal visible después del clic:', cierreModal.classList.contains('show'));
        }, 100);
    } catch (error) {
        console.error('❌ Error al hacer clic en el botón:', error);
    }
}

// 7. Verificar CSS del modal
console.log('7. Verificación de estilos CSS:');
if (cierreModal) {
    const computedStyle = window.getComputedStyle(cierreModal);
    console.log('- Display:', computedStyle.display);
    console.log('- Visibility:', computedStyle.visibility);
    console.log('- Z-index:', computedStyle.zIndex);
    console.log('- Position:', computedStyle.position);
}

console.log('========================================');
console.log('FIN DEL DIAGNÓSTICO');