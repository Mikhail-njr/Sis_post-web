// Funciones para el manejo del cierre de caja
// Archivo: cierre-caja-functions.js

console.log('✅ cierre-caja-functions.js cargado correctamente');

/**
 * Función para calcular el cierre de caja
 * Llama al endpoint /api/close-register-preview y muestra los resultados
 */
async function calculateCloseRegister() {
    console.log('🔄 Calculando cierre de caja...');

    try {
        // Obtener valores del formulario
        const dineroInicial = parseFloat(document.getElementById('cierreDineroInicial').value) || 0;
        const fechaEspecifica = document.getElementById('cierreFechaEspecifica').value;

        // Validar que se haya ingresado dinero inicial
        if (dineroInicial <= 0) {
            document.getElementById('cierre-validation-message').textContent = 'Por favor ingrese un monto de dinero inicial válido (mayor a 0).';
            document.getElementById('cierre-validation-message').style.display = 'block';
            return;
        }

        // Ocultar mensaje de validación si existe
        document.getElementById('cierre-validation-message').style.display = 'none';

        // Mostrar indicador de carga
        showLoadingIndicator('Calculando cierre de caja...', '💰');

        // Preparar headers con autenticación
        const headers = { 'Content-Type': 'application/json' };
        

        // Preparar datos para el request
        const requestData = {
            dinero_inicial: dineroInicial
        };

        if (fechaEspecifica) {
            requestData.fecha = fechaEspecifica;
        }

        // Llamar al endpoint de preview
        const data = await window.ApiClient.apiRequest('/close-register-preview', {
            method: 'POST',
            body: requestData
        });

        // Ocultar indicador de carga
        hideLoadingIndicator();

        // Mostrar resultados en el modal
        showCierreResults(data);

        console.log('✅ Cierre de caja calculado exitosamente');

    } catch (error) {
        console.error('❌ Error calculando cierre:', error);
        hideLoadingIndicator();

        // Mostrar error en el mensaje de validación
        document.getElementById('cierre-validation-message').textContent = 'Error al calcular el cierre: ' + error.message;
        document.getElementById('cierre-validation-message').style.display = 'block';
        document.getElementById('cierre-validation-message').style.color = '#dc3545';
    }
}

/**
 * Función para mostrar los resultados del cálculo del cierre en el modal
 */
function showCierreResults(data) {
    // Mostrar sección de resultados y ocultar sección de entrada
    document.getElementById('cierre-input-section').style.display = 'none';
    document.getElementById('cierre-results-section').style.display = 'block';
    
    // Mostrar datos básicos
    document.getElementById('cierre-inicial').textContent = `${data.dinero_inicial.toFixed(2)}`;
    document.getElementById('cierre-total').textContent = `${data.total_ventas.toFixed(2)}`;
    document.getElementById('cierre-esperado').textContent = `${data.total_esperado.toFixed(2)}`;
    document.getElementById('cierre-diferencia').textContent = `${data.diferencia.toFixed(2)}`;
    document.getElementById('cierre-cantidad').textContent = data.cantidad_ventas;
    document.getElementById('cierre-fecha').textContent = new Date(data.fecha_cierre).toLocaleString();
    
    // Mapear nombres de métodos de pago a español
    const methodNames = {
        'efectivo': 'Efectivo',
        'cash': 'Efectivo',
        'efectivo_': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'credit': 'Tarjeta',
        'debito': 'Débito',
        'debit': 'Débito',
        'transferencia': 'Transferencia',
        'transfer': 'Transferencia',
        'cuenta_corriente': 'Cuenta Corriente',
        'account': 'Cuenta Corriente'
    };
    
    // Mostrar detalles por método de pago si están disponibles
    if (data.payment_totals && Object.keys(data.payment_totals).length > 0) {
        const paymentDetailsContainer = document.getElementById('cierre-payment-details');
        paymentDetailsContainer.innerHTML = '';
        
        // Crear elementos para cada método de pago
        for (const [method, amount] of Object.entries(data.payment_totals)) {
            // Ignorar campos que no son métodos de pago
            if (method === 'total_pagado' || method === 'vuelto' || method === '__total' || method.includes('total')) continue;
            
            // Verificar que amount sea un objeto con propiedad total
            let amountValue = 0;
            if (typeof amount === 'object' && amount !== null && amount.total !== undefined) {
                amountValue = parseFloat(amount.total) || 0;
            } else if (typeof amount === 'number') {
                amountValue = amount;
            }
            
            const paymentItem = document.createElement('div');
            paymentItem.style.display = 'flex';
            paymentItem.style.justifyContent = 'space-between';
            paymentItem.style.padding = '10px';
            paymentItem.style.background = '#3a3a3a';
            paymentItem.style.borderRadius = '6px';
            paymentItem.style.marginBottom = '8px';
            
            const paymentMethod = document.createElement('span');
            const methodName = methodNames[method.toLowerCase()] || method;
            paymentMethod.textContent = `${methodName}:`;
            paymentMethod.style.fontWeight = '500';
            
            const paymentAmount = document.createElement('span');
            paymentAmount.textContent = `${amountValue.toFixed(2)}`;
            paymentAmount.style.fontWeight = 'bold';
            paymentAmount.style.color = '#4caf50';
            
            paymentItem.appendChild(paymentMethod);
            paymentItem.appendChild(paymentAmount);
            paymentDetailsContainer.appendChild(paymentItem);
        }
        
        // Mostrar el contenedor de detalles de pago
        document.getElementById('cierre-payment-details-section').style.display = 'block';
        
        // Mostrar vuelto si está disponible
        if (data.payment_totals.vuelto !== undefined) {
            const vueltoValue = data.payment_totals.vuelto;
            document.getElementById('cierre-vuelto').textContent = `${parseFloat(vueltoValue?.total || vueltoValue || 0).toFixed(2)}`;
            document.getElementById('cierre-vuelto-section').style.display = 'block';
        } else {
            document.getElementById('cierre-vuelto-section').style.display = 'none';
        }
        
        // Mostrar total pagado si está disponible
        if (data.payment_totals.total_pagado !== undefined) {
            const totalPagadoItem = document.createElement('div');
            totalPagadoItem.style.display = 'flex';
            totalPagadoItem.style.justifyContent = 'space-between';
            totalPagadoItem.style.padding = '12px';
            totalPagadoItem.style.background = '#4a4a4a';
            totalPagadoItem.style.borderRadius = '6px';
            totalPagadoItem.style.marginTop = '10px';
            totalPagadoItem.style.border = '2px solid #4caf50';
            
            const totalLabel = document.createElement('span');
            totalLabel.textContent = 'Total Pagado:';
            totalLabel.style.fontWeight = 'bold';
            
            const totalValue = document.createElement('span');
            const totalPagadoValue = data.payment_totals.total_pagado;
            totalValue.textContent = `${parseFloat(totalPagadoValue?.total || totalPagadoValue || 0).toFixed(2)}`;
            totalValue.style.fontWeight = 'bold';
            totalValue.style.color = '#4caf50';
            
            totalPagadoItem.appendChild(totalLabel);
            totalPagadoItem.appendChild(totalValue);
            paymentDetailsContainer.appendChild(totalPagadoItem);
        }
    } else {
        // Ocultar el contenedor de detalles de pago si no hay datos
        document.getElementById('cierre-payment-details-section').style.display = 'none';
        document.getElementById('cierre-vuelto-section').style.display = 'none';
    }
    
    // Actualizar botones para permitir confirmación o nuevo cálculo
    const buttonGroup = document.querySelector('#cierreModal .button-group');
    buttonGroup.innerHTML = `
        <button type="button" class="btn btn-primary" onclick="confirmCierreCaja()">✅ Confirmar Cierre</button>
        <button type="button" class="btn btn-secondary" onclick="resetCierreModal()">🔄 Nuevo Cálculo</button>
    `;
    
    // Guardar datos temporalmente para confirmación
    window.tempCierreData = data;
    localStorage.setItem('tempCierreData', JSON.stringify(data));
    
    console.log('📊 Resultados del cierre mostrados');
}

/**
 * Función para confirmar y guardar el cierre de caja
 */
let isConfirmingCierre = false; // Variable de estado para prevenir múltiples clics

async function confirmCierreCaja() {
     // Prevenir múltiples clics
     if (isConfirmingCierre) {
         console.log('⏳ Cierre de caja ya está en proceso');
         return;
     }

     console.log('🔍 Intentando obtener datos previos de cierre:', window.tempCierreData);
     const data = window.tempCierreData;
     console.log('📊 Datos obtenidos para confirmación:', data);

    try {
        isConfirmingCierre = true;
        showLoadingIndicator('Confirmando cierre de caja...', '💰');
        
        // Deshabilitar el botón de confirmación para prevenir clics adicionales
        const confirmButton = document.querySelector('#cierreModal .button-group .btn-primary');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = '⏳ Procesando...';
        }

        // Preparar headers con autenticación
        const headers = { 'Content-Type': 'application/json' };
        

        // Validar que los datos necesarios estén presentes
        if (!data ||
            data.dinero_inicial === undefined ||
            data.total_ventas === undefined ||
            data.total_esperado === undefined) {
            console.error('❌ Error: Datos incompletos para confirmar cierre. Datos recibidos:', data);
            throw new Error('Datos de cierre de caja incompletos. Los datos deben incluir dinero_inicial, total_ventas y total_esperado.');
        }

        // Preparar datos para confirmar el cierre
        const confirmData = {
            fecha: data.fecha_cierre,
            fecha_cierre: data.fecha_cierre,
            dinero_inicial: data.dinero_inicial,
            total_ventas: data.total_ventas,
            total_esperado: data.total_esperado,
            diferencia: data.diferencia,
            cantidad_ventas: data.cantidad_ventas,
            tipo_cierre: data.tipo_cierre || 'normal',
            notas: data.notas || ''
        };

        // Llamar al endpoint de confirmación
        const result = await window.ApiClient.apiRequest('/close-register-confirm', {
            method: 'POST',
            body: confirmData
        });

        // Ocultar indicador de carga
        hideLoadingIndicator();

        // Cerrar modal y mostrar éxito
        closeCierreModal();
        showAlert('✅ Cierre de caja confirmado y registrado exitosamente', 'success');

        // Recargar datos del dashboard para actualizar estadísticas
        fetchAndDisplayData();

        console.log('✅ Cierre de caja confirmado:', result);

    } catch (error) {
        console.error('❌ Error confirmando cierre:', error);
        hideLoadingIndicator();

        // Resetear estado y re-habilitar botón para permitir reintento
        isConfirmingCierre = false;
        const confirmButton = document.querySelector('#cierreModal .button-group .btn-primary');
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = '✅ Confirmar Cierre';
        }

        showAlert('❌ Error al confirmar el cierre: ' + error.message, 'error');
        // Mostrar alerta de error en la interfaz
    }
}

/**
 * Función para cerrar el modal de cierre de caja
 */
function closeCierreModal() {
    console.log('🔒 Cerrando modal de cierre de caja');
    // Limpiar datos temporales
    window.tempCierreData = null;
    localStorage.removeItem('tempCierreData');
    console.log('✅ Datos temporales de cierre limpiados');

    // Ocultar el modal
    document.getElementById('cierreModal').classList.remove('show');

    // Resetear el modal a su estado inicial
    resetCierreModal();
}

/**
 * Función para resetear el modal de cierre a su estado inicial
 */
function resetCierreModal() {
    // Resetear estado de confirmación para permitir nuevos intentos
    isConfirmingCierre = false;

    // Mostrar sección de entrada y ocultar resultados
    document.getElementById('cierre-input-section').style.display = 'block';
    document.getElementById('cierre-results-section').style.display = 'none';

    // Limpiar campos del formulario
    document.getElementById('cierreDineroInicial').value = '';
    document.getElementById('cierreFechaEspecifica').value = '';

    // Ocultar mensaje de validación
    document.getElementById('cierre-validation-message').style.display = 'none';

    // Resetear botones
    const buttonGroup = document.querySelector('#cierreModal .button-group');
    buttonGroup.innerHTML = `
        <button type="button" class="btn btn-primary" onclick="calculateCloseRegister()">Calcular Cierre</button>
        <button type="button" class="btn btn-secondary" onclick="closeCierreModal()">Cancelar</button>
    `;
}

/**
 * Función para abrir el modal de cierre de caja
 */
function openCierreModal() {
    console.log('🔓 Abriendo modal de cierre de caja');

    // Resetear el modal a su estado inicial
    resetCierreModal();

    // Mostrar el modal
    document.getElementById('cierreModal').classList.add('show');
}

// Exportar funciones para uso global
window.calculateCloseRegister = calculateCloseRegister;
window.closeCierreModal = closeCierreModal;
window.confirmCierreCaja = confirmCierreCaja;
window.resetCierreModal = resetCierreModal;
window.openCierreModal = openCierreModal;
