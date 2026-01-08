/**
 * Sistema de Comunicación con Identificación Específica para Escaneo de Códigos de Barras
 * Solución para el conflicto entre múltiples sistemas de escaneo en el POS
 * 
 * @author Sistema POS
 * @version 1.0
 */

// Variable global para almacenar los listeners activos
let activeScanListeners = new Map();

/**
 * Genera un ID único para cada sesión de escaneo
 * @returns {string} ID único para la sesión de escaneo
 */
function generateScanSessionId(prefix = 'scan') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escucha mensajes de escaneo con validación de sesión
 * @param {string} sessionId - ID de la sesión de escaneo
 * @param {string} targetFieldId - ID del campo objetivo donde se insertará el código
 * @param {Function} callback - Callback opcional para manejar el código escaneado
 * @returns {Function} Función para eliminar el listener
 */
function createScanMessageListener(sessionId, targetFieldId, callback = null) {
    const messageHandler = function(event) {
        // Validar origen del mensaje
        if (!event.data || event.data.session_id !== sessionId) {
            return;
        }
        
        // Validar tipo de mensaje
        if (event.data.type !== 'barcode') {
            return;
        }
        
        const barcode = event.data.barcode;
        
        // Validar formato del código de barras
        if (!barcode || typeof barcode !== 'string') {
            console.warn(`[${sessionId}] Código de barras inválido:`, barcode);
            return;
        }
        
        // Validar formato EAN-8 o EAN-13
        const barcodeRegex = /^(?:\d{8}|\d{13})$/;
        if (!barcodeRegex.test(barcode)) {
            console.warn(`[${sessionId}] Formato de código de barras no válido (se espera EAN-8 o EAN-13):`, barcode);
            return;
        }
        
        // Procesar el código de barras
        processScannedBarcode(sessionId, barcode, targetFieldId, callback);
        
        // Eliminar el listener después de procesar el primer código válido
        window.removeEventListener('message', messageHandler);
        activeScanListeners.delete(sessionId);
    };
    
    // Registrar el listener activo
    activeScanListeners.set(sessionId, messageHandler);
    window.addEventListener('message', messageHandler);
    
    // Retornar función para eliminar manualmente el listener
    return function removeListener() {
        window.removeEventListener('message', messageHandler);
        activeScanListeners.delete(sessionId);
    };
}

/**
 * Procesa el código de barras escaneado
 * @param {string} sessionId - ID de la sesión de escaneo
 * @param {string} barcode - Código de barras escaneado
 * @param {string} targetFieldId - ID del campo objetivo
 * @param {Function} callback - Callback opcional
 */
function processScannedBarcode(sessionId, barcode, targetFieldId, callback) {
    console.log(`[${sessionId}] Código de barras procesado: ${barcode}`);
    
    // Rellenar el campo objetivo si existe
    const targetField = document.getElementById(targetFieldId);
    if (targetField) {
        targetField.value = barcode;
        targetField.focus();
        
        // Disparar evento de cambio para activar validaciones
        targetField.dispatchEvent(new Event('input', { bubbles: true }));
        targetField.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log(`[${sessionId}] Código agregado al campo: ${targetFieldId}`);
    } else {
        console.warn(`[${sessionId}] No se encontró el campo objetivo: ${targetFieldId}`);
    }
    
    // Ejecutar callback si existe
    if (typeof callback === 'function') {
        try {
            callback(barcode);
        } catch (error) {
            console.error(`[${sessionId}] Error en callback:`, error);
        }
    }
    
    // Cerrar ventanas de escaneo asociadas a esta sesión
    closeScanWindows(sessionId);
}

/**
 * Cierra ventanas de escaneo asociadas a una sesión
 * @param {string} sessionId - ID de la sesión de escaneo
 */
function closeScanWindows(sessionId) {
    // Buscar ventanas abiertas con el parámetro de sesión
    // Esta función puede ser extendida para manejar múltiples ventanas
    console.log(`[${sessionId}] Cerrando ventanas de escaneo...`);
}

/**
 * Abre una ventana de escaneo con identificación de sesión
 * @param {string} sessionId - ID de la sesión de escaneo
 * @param {string} targetFieldId - ID del campo objetivo
 * @param {Function} callback - Callback opcional
 * @returns {Window} Referencia a la ventana de escaneo
 */
function openScanWindow(sessionId, targetFieldId, callback = null) {
    // Crear listener para esta sesión
    const removeListener = createScanMessageListener(sessionId, targetFieldId, callback);
    
    // Abrir ventana de escaneo con parámetro de sesión
    const scannerUrl = `barcode-scanner.html?session_id=${sessionId}`;
    const scannerWindow = window.open(scannerUrl, '_blank', 'width=800,height=600');
    
    // Manejar cierre de ventana
    const checkWindowClosed = setInterval(() => {
        if (scannerWindow.closed) {
            clearInterval(checkWindowClosed);
            removeListener();
            console.log(`[${sessionId}] Ventana de escaneo cerrada`);
        }
    }, 1000);
    
    return scannerWindow;
}

// ========================================
// FUNCIONES ESPECÍFICAS PARA CADA MODAL
// ========================================

/**
 * Escaner para el modal de agregar producto
 */
function openBarcodeScannerForAddProduct() {
    const sessionId = generateScanSessionId('add-product');
    const targetFieldId = 'addBarcode';
    
    console.log(`[${sessionId}] Iniciando escaneo para agregar producto`);
    
    // Callback para manejar el código escaneado
    const callback = function(barcode) {
        // Validar disponibilidad del código (opcional)
        validateProductBarcode(barcode);
    };
    
    openScanWindow(sessionId, targetFieldId, callback);
}

/**
 * Escaner para el modal de editar producto
 */
function openBarcodeScannerForEditProduct() {
    const sessionId = generateScanSessionId('edit-product');
    const targetFieldId = 'editBarcode';
    
    console.log(`[${sessionId}] Iniciando escaneo para editar producto`);
    
    openScanWindow(sessionId, targetFieldId);
}

/**
 * Escaner para el modal de crear lote
 */
function openBarcodeScannerForLote() {
    const sessionId = generateScanSessionId('create-lote');
    const targetFieldId = 'loteBarcode';
    
    console.log(`[${sessionId}] Iniciando escaneo para crear lote`);
    
    // Callback para validar el código de barras del lote
    const callback = function(barcode) {
        validateLoteBarcode(barcode);
    };
    
    openScanWindow(sessionId, targetFieldId, callback);
}

/**
 * Escaner para el modal de editar lote
 */
function openBarcodeScannerForEditLote() {
    const sessionId = generateScanSessionId('edit-lote');
    const targetFieldId = 'editLoteBarcode';
    
    console.log(`[${sessionId}] Iniciando escaneo para editar lote`);
    
    // Callback para validar el código de barras del lote
    const callback = function(barcode) {
        validateEditLoteBarcode(barcode);
    };
    
    openScanWindow(sessionId, targetFieldId, callback);
}

// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================

/**
 * Valida el código de barras para agregar producto
 * @param {string} barcode - Código de barras a validar
 */
async function validateProductBarcode(barcode) {
    try {
        // Verificar si el código ya existe en la base de datos
        const response = await fetch(`${window.ApiClient.API_BASE}/products?barcode=${barcode}`);
        if (response.ok) {
            const products = await response.json();
            if (products && products.length > 0) {
                showBarcodeWarning('Código de barras ya existe', `El código ${barcode} ya está asignado al producto: ${products[0].nombre}`);
            }
        }
    } catch (error) {
        console.warn('No se pudo validar el código de barras:', error);
    }
}

/**
 * Valida el código de barras para lote
 * @param {string} barcode - Código de barras a validar
 */
async function validateLoteBarcode(barcode) {
    try {
        // Verificar si el código ya existe en lotes
        const response = await fetch(`${window.ApiClient.API_BASE}/lotes?barcode=${barcode}`);
        if (response.ok) {
            const lotes = await response.json();
            if (lotes && lotes.length > 0) {
                showBarcodeWarning('Código de barras ya existe', `El código ${barcode} ya está asignado al lote: ${lotes[0].numero_lote}`);
            }
        }
    } catch (error) {
        console.warn('No se pudo validar el código de barras del lote:', error);
    }
}

/**
 * Valida el código de barras para edición de lote
 * @param {string} barcode - Código de barras a validar
 */
async function validateEditLoteBarcode(barcode) {
    // Similar a validateLoteBarcode pero considerando el lote actual
    validateLoteBarcode(barcode);
}

/**
 * Muestra una advertencia sobre el código de barras
 * @param {string} title - Título de la advertencia
 * @param {string} message - Mensaje de la advertencia
 */
function showBarcodeWarning(title, message) {
    // Crear notificación de advertencia
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = `
        <strong>${title}</strong><br>
        <small>${message}</small>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// ========================================
// INTEGRACIÓN CON barcode-scanner.html
// ========================================

/**
 * Envia el código de barras escaneado con identificación de sesión
 * Esta función debe ser llamada desde barcode-scanner.html
 * @param {string} barcode - Código de barras escaneado
 */
function sendScannedBarcode(barcode) {
    // Obtener el ID de sesión de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (!sessionId) {
        console.error('No se encontró ID de sesión en la URL');
        return;
    }
    
    // Enviar mensaje al window.opener con identificación
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
            type: 'barcode',
            session_id: sessionId,
            barcode: barcode,
            timestamp: Date.now()
        }, '*');
        
        console.log(`[${sessionId}] Código de barras enviado: ${barcode}`);
    } else {
        console.error(`[${sessionId}] No se pudo enviar el código: ventana principal no disponible`);
    }
}

// ========================================
// FUNCIONES DE LIMPIEZA Y MANTENIMIENTO
// ========================================

/**
 * Limpia todos los listeners de escaneo activos
 */
function cleanupScanListeners() {
    activeScanListeners.forEach((listener, sessionId) => {
        window.removeEventListener('message', listener);
        console.log(`[${sessionId}] Listener limpiado`);
    });
    activeScanListeners.clear();
}

/**
 * Obtiene el estado de los listeners activos
 * @returns {Object} Información sobre los listeners activos
 */
function getActiveScanListeners() {
    return {
        count: activeScanListeners.size,
        sessions: Array.from(activeScanListeners.keys())
    };
}

// ========================================
// INICIALIZACIÓN
// ========================================

// Limpiar listeners al cargar la página
window.addEventListener('beforeunload', cleanupScanListeners);

// Exponer funciones globales
window.ScanSystem = {
    openScanWindow,
    createScanMessageListener,
    generateScanSessionId,
    cleanupScanListeners,
    getActiveScanListeners,
    sendScannedBarcode
};

console.log('✅ Sistema de escaneo con identificación cargado');