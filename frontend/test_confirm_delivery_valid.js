// Test automatizado para simular la confirmación de entrega con cantidades válidas
// Ejecutar en la consola del navegador en la página del sistema

async function testConfirmDeliveryWithValidData() {
    // Esperar a que el modal y los productos estén cargados
    openConfirmDeliveryModal(183); // Usa un ID de pedido válido para tu entorno
    await new Promise(r => setTimeout(r, 1000));
    // Simular cantidades recibidas mayores a 0
    document.querySelectorAll('.order-item .received-quantity').forEach(input => {
        input.value = 1;
        input.dispatchEvent(new Event('input'));
    });
    // Simular click en el botón de confirmar
    const btn = document.querySelector('#confirmDeliveryModal .btn-primary');
    if (btn) {
        btn.click();
        console.log('✅ Test: Se hizo click en Confirmar Llegada y Crear Lotes');
    } else {
        console.error('❌ No se encontró el botón de confirmar en el modal');
    }
}

testConfirmDeliveryWithValidData();
