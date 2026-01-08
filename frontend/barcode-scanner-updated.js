/**
 * @fileoverview Actualización del módulo de escaneo de códigos de barras
 * Integración con el nuevo sistema de comunicación con identificación específica
 * @author Sistema POS
 */

// Variable global para almacenar el ID de sesión
let currentSessionId = null;

// Detectar y almacenar el ID de sesión de la URL al cargar
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSessionId = urlParams.get('session_id');
    
    if (currentSessionId) {
        console.log(`[${currentSessionId}] Sesión de escaneo iniciada`);
        // Actualizar UI para mostrar que está en modo de sesión
        updateScannerUIForSession(currentSessionId);
    } else {
        console.log('Escáner iniciado sin sesión específica (modo legacy)');
    }
});

/**
 * Actualiza la UI del escáner para mostrar el modo de sesión
 * @param {string} sessionId - ID de la sesión
 */
function updateScannerUIForSession(sessionId) {
    // Agregar indicador de sesión en la UI
    const header = document.querySelector('h1, h2, h3') || document.body;
    if (header) {
        const sessionIndicator = document.createElement('div');
        sessionIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #17a2b8;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1000;
        `;
        sessionIndicator.textContent = `Sesión: ${sessionId.substring(0, 15)}...`;
        header.parentNode.insertBefore(sessionIndicator, header.nextSibling);
    }
}

/**
 * Función actualizada para enviar código de barras con identificación de sesión
 * @param {string} barcode - Código de barras escaneado
 */
function sendScannedBarcode(barcode) {
    // Validar el código de barras antes de enviar
    if (!barcode || typeof barcode !== 'string') {
        console.warn('Código de barras inválido para envío:', barcode);
        return;
    }
    
    // Validar formato EAN-8 o EAN-13
    const barcodeRegex = /^(?:\d{8}|\d{13})$/;
    if (!barcodeRegex.test(barcode)) {
        console.warn('Formato de código de barras no válido (se espera EAN-8 o EAN-13):', barcode);
        return;
    }
    
    // Enviar mensaje al window.opener con identificación de sesión
    if (window.opener && !window.opener.closed) {
        const message = {
            type: 'barcode',
            session_id: currentSessionId,
            barcode: barcode,
            timestamp: Date.now(),
            source: 'barcode-scanner'
        };
        
        window.opener.postMessage(message, '*');
        
        console.log(`[${currentSessionId || 'unknown'}] Código de barras enviado: ${barcode}`);
        
        // Mostrar confirmación visual
        showScanConfirmation(barcode);
        
        // Cerrar ventana después de un breve delay para permitir el procesamiento
        if (currentSessionId) {
            setTimeout(() => {
                window.close();
            }, 1000);
        }
    } else {
        console.error(`[${currentSessionId || 'unknown'}] No se pudo enviar el código: ventana principal no disponible`);
        
        // Mostrar error al usuario
        showScanError('No se pudo enviar el código. La ventana principal no está disponible.');
    }
}

/**
 * Muestra confirmación visual del escaneo exitoso
 * @param {string} barcode - Código de barras escaneado
 */
function showScanConfirmation(barcode) {
    // Crear notificación de éxito
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        animation: slideDown 0.3s ease-out;
    `;
    notification.innerHTML = `
        <strong>✅ Escaneo Exitoso</strong><br>
        <small>Código: ${barcode}</small>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 2 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}

/**
 * Muestra error de escaneo
 * @param {string} message - Mensaje de error
 */
function showScanError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        animation: slideDown 0.3s ease-out;
    `;
    notification.innerHTML = `
        <strong>❌ Error</strong><br>
        <small>${message}</small>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * Maneja el cierre de la ventana
 */
function handleWindowClose() {
    if (currentSessionId) {
        console.log(`[${currentSessionId}] Ventana de escaneo cerrada`);
        
        // Notificar a la ventana principal sobre el cierre (opcional)
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
                type: 'scan_window_closed',
                session_id: currentSessionId,
                timestamp: Date.now()
            }, '*');
        }
    }
}

// Escuchar el cierre de la ventana
window.addEventListener('beforeunload', handleWindowClose);

// Exponer la función global para compatibilidad con el sistema legacy
window.sendScannedBarcode = sendScannedBarcode;

console.log('✅ Sistema de escaneo actualizado con soporte para sesiones');