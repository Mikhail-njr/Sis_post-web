// Script de diagnóstico para el bloque de pago en efectivo
// Copia y pega este script en la consola del navegador cuando estés en http://localhost:3000/

console.log('=== DIAGNÓSTICO DEL BLOQUE DE EFECTIVO ===');

// 1. Verificar si el bloque de métodos de pago existe
const paymentMethods = document.querySelectorAll('.payment-method');
console.log('Total métodos de pago encontrados:', paymentMethods.length);

// 2. Verificar si el bloque de efectivo existe
const efectivoDiv = document.getElementById('efectivo-payment-method');
console.log('Bloque de efectivo (por ID):', efectivoDiv);

// 3. Verificar si el input de efectivo existe
const efectivoInput = document.getElementById('efectivo-amount');
console.log('Input de efectivo:', efectivoInput);

// 4. Verificar si el botón MAX de efectivo existe
const efectivoMaxBtn = document.getElementById('efectivo-max');
console.log('Botón MAX de efectivo:', efectivoMaxBtn);

// 5. Buscar el bloque de efectivo por texto
const efectivoByText = Array.from(paymentMethods).find(div => 
    div.textContent.toLowerCase().includes('efectivo')
);
console.log('Bloque de efectivo (por texto):', efectivoByText);

// 6. Verificar el contenedor de métodos de pago
const paymentMethodsContainer = document.querySelector('.payment-methods');
console.log('Contenedor de métodos de pago:', paymentMethodsContainer);

// 7. Verificar si las funciones están expuestas
console.log('Función ensureEfectivoBlockVisible:', typeof window.ensureEfectivoBlockVisible);
console.log('Función createEfectivoBlock:', typeof window.createEfectivoBlock);
console.log('Función diagnoseDOM:', typeof window.diagnoseDOM);

// 8. Intentar asegurar que el bloque esté visible
if (typeof window.ensureEfectivoBlockVisible === 'function') {
    console.log('Ejecutando ensureEfectivoBlockVisible...');
    window.ensureEfectivoBlockVisible();
} else {
    console.log('❌ Función ensureEfectivoBlockVisible no encontrada');
}

// 9. Diagnosticar nuevamente después de la corrección
if (typeof window.diagnoseDOM === 'function') {
    console.log('Ejecutando diagnoseDOM...');
    window.diagnoseDOM();
}

// 10. Probar la funcionalidad del bloque de efectivo
if (efectivoDiv) {
    console.log('Probando clic en el bloque de efectivo...');
    efectivoDiv.click();
    
    setTimeout(() => {
        const inputVisible = efectivoInput && efectivoInput.style.display !== 'none';
        const maxBtnVisible = efectivoMaxBtn && efectivoMaxBtn.style.display !== 'none';
        
        console.log('Input de efectivo visible después del clic:', inputVisible);
        console.log('Botón MAX de efectivo visible después del clic:', maxBtnVisible);
        
        if (inputVisible && maxBtnVisible) {
            console.log('✅ EL BLOQUE DE EFECTIVO ESTÁ FUNCIONANDO CORRECTAMENTE');
        } else {
            console.log('❌ El bloque de efectivo no está respondiendo correctamente');
        }
    }, 100);
} else {
    console.log('❌ No se puede probar la funcionalidad porque el bloque no existe');
}

console.log('=== FIN DEL DIAGNÓSTICO ===');

// Funciones útiles para el usuario
console.log('\n=== FUNCIONES ÚTILES ===');
console.log('Para diagnosticar el DOM: window.diagnoseDOM()');
console.log('Para asegurar el bloque: window.ensureEfectivoBlockVisible()');
console.log('Para crear el bloque: window.createEfectivoBlock()');