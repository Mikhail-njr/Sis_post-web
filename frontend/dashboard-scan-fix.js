/**
 * Sistema de Escaneo Mejorado para Dashboard POS
 * 
 * Solución para el problema de interferencias entre múltiples sistemas de escaneo
 * que compiten por los mismos mensajes de postMessage.
 * 
 * Características:
 * - Identificación única de sesiones de escaneo
 * - Validación robusta de formatos EAN-8 y EAN-13
 * - Comunicación aislada por sesión
 * - Auto-limpieza de listeners
 * - Notificaciones visuales de éxito/error
 */

// Espacio de nombres para evitar conflictos
window.DashboardScanFix = (function() {
    'use strict';

    // Configuración
    const CONFIG = {
        SESSION_TIMEOUT: 30000, // 30 segundos
        VALIDATION_REGEX: /^(?:\d{8}|\d{13})$/, // EAN-8 o EAN-13
        NOTIFICATION_DURATION: 3000
    };

    // Estado interno
    const state = {
        activeSessions: new Map(),
        currentSessionId: null,
        listeners: new Map()
    };

    /**
     * Genera un ID único para la sesión de escaneo
     */
    function generateSessionId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `scan_${timestamp}_${random}`;
    }

    /**
     * Valida el formato del código de barras
     */
    function validateBarcode(barcode) {
        if (!barcode || typeof barcode !== 'string') {
            return { valid: false, error: 'Código vacío o inválido' };
        }

        const cleanBarcode = barcode.trim();
        
        if (!CONFIG.VALIDATION_REGEX.test(cleanBarcode)) {
            return { 
                valid: false, 
                error: 'Formato inválido. Se requiere EAN-8 o EAN-13 (8 o 13 dígitos)' 
            };
        }

        // Validar checksum básico para EAN-8 y EAN-13
        if (!validateChecksum(cleanBarcode)) {
            return { 
                valid: false, 
                error: 'Checksum inválido. El código de barras parece incorrecto' 
            };
        }

        return { valid: true, barcode: cleanBarcode };
    }

    /**
     * Calcula y valida el checksum del código de barras (EAN-8/EAN-13)
     */
    function validateChecksum(barcode) {
        const digits = barcode.split('').map(d => parseInt(d, 10));
        const checkDigit = digits.pop(); // Último dígito es el checksum
        let sum = 0;

        // Calcular suma ponderada
        digits.forEach((digit, index) => {
            sum += digit * (index % 2 === 0 ? 1 : 3);
        });

        const calculatedCheck = (10 - (sum % 10)) % 10;
        return calculatedCheck === checkDigit;
    }

    /**
     * Crea una notificación visual
     */
    function showNotification(message, type = 'success') {
        // Crear contenedor de notificación si no existe
        let container = document.getElementById('scan-notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'scan-notifications-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(container);
        }

        // Crear notificación
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
            position: relative;
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;

        // Añadir animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${type === 'success' ? '✅ Escaneo Exitoso' : '❌ Error'}
            </div>
            <div>${message}</div>
        `;

        container.appendChild(notification);

        // Mostrar notificación
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Ocultar notificación después de un tiempo
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, CONFIG.NOTIFICATION_DURATION);
    }

    /**
     * Limpia listeners antiguos
     */
    function cleanupOldListeners() {
        const now = Date.now();
        const expiredSessions = [];

        state.listeners.forEach((listener, sessionId) => {
            const session = state.activeSessions.get(sessionId);
            if (!session || (now - session.createdAt) > CONFIG.SESSION_TIMEOUT) {
                expiredSessions.push(sessionId);
            }
        });

        expiredSessions.forEach(sessionId => {
            const listener = state.listeners.get(sessionId);
            if (listener) {
                window.removeEventListener('message', listener);
            }
            state.listeners.delete(sessionId);
            state.activeSessions.delete(sessionId);
        });
    }

    /**
     * Registra un listener para una sesión específica
     */
    function registerListener(sessionId, callback) {
        cleanupOldListeners();

        const listener = function(event) {
            // Validar origen del mensaje
            if (!event.data || event.data.sessionId !== sessionId) {
                return; // Ignorar mensajes que no sean de esta sesión
            }

            callback(event.data);
        };

        window.addEventListener('message', listener);
        state.listeners.set(sessionId, listener);
        state.activeSessions.set(sessionId, { createdAt: Date.now() });
    }

    /**
     * Elimina un listener específico
     */
    function removeListener(sessionId) {
        const listener = state.listeners.get(sessionId);
        if (listener) {
            window.removeEventListener('message', listener);
            state.listeners.delete(sessionId);
            state.activeSessions.delete(sessionId);
        }
    }

    /**
     * Abre el escáner para el modal de agregar producto
     */
    function openBarcodeScannerForAddProduct() {
        const sessionId = generateSessionId();
        state.currentSessionId = sessionId;

        // Abrir escáner con ID de sesión
        const scannerUrl = `barcode-scanner.html?sessionId=${sessionId}`;
        const scannerWindow = window.open(scannerUrl, 'barcodeScanner', 'width=800,height=600,scrollbars=yes,resizable=yes');

        // Registrar listener para esta sesión
        registerListener(sessionId, function(data) {
            if (data.barcode) {
                const validation = validateBarcode(data.barcode);
                
                if (validation.valid) {
                    // Rellenar el campo de código de barras
                    const barcodeInput = document.getElementById('addBarcode');
                    if (barcodeInput) {
                        barcodeInput.value = validation.barcode;
                        showNotification(`Código escaneado: ${validation.barcode}`, 'success');
                    } else {
                        showNotification('No se encontró el campo de código de barras', 'error');
                    }
                } else {
                    showNotification(validation.error, 'error');
                }

                // Cerrar ventana y limpiar
                if (scannerWindow && !scannerWindow.closed) {
                    scannerWindow.close();
                }
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        });

        // Manejar cierre de ventana
        const checkWindowClosed = setInterval(() => {
            if (scannerWindow && scannerWindow.closed) {
                clearInterval(checkWindowClosed);
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        }, 1000);
    }

    /**
     * Abre el escáner para el modal de crear lote
     */
    function openBarcodeScannerForLote() {
        const sessionId = generateSessionId();
        state.currentSessionId = sessionId;

        const scannerUrl = `barcode-scanner.html?sessionId=${sessionId}`;
        const scannerWindow = window.open(scannerUrl, 'barcodeScannerLote', 'width=800,height=600,scrollbars=yes,resizable=yes');

        registerListener(sessionId, function(data) {
            if (data.barcode) {
                const validation = validateBarcode(data.barcode);
                
                if (validation.valid) {
                    const barcodeInput = document.getElementById('loteBarcode');
                    if (barcodeInput) {
                        barcodeInput.value = validation.barcode;
                        showNotification(`Código de lote escaneado: ${validation.barcode}`, 'success');
                    } else {
                        showNotification('No se encontró el campo de código de barras del lote', 'error');
                    }
                } else {
                    showNotification(validation.error, 'error');
                }

                if (scannerWindow && !scannerWindow.closed) {
                    scannerWindow.close();
                }
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        });

        const checkWindowClosed = setInterval(() => {
            if (scannerWindow && scannerWindow.closed) {
                clearInterval(checkWindowClosed);
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        }, 1000);
    }

    /**
     * Abre el escáner para el modal de editar producto
     */
    function openBarcodeScannerForEditProduct() {
        const sessionId = generateSessionId();
        state.currentSessionId = sessionId;

        const scannerUrl = `barcode-scanner.html?sessionId=${sessionId}`;
        const scannerWindow = window.open(scannerUrl, 'barcodeScannerEditProduct', 'width=800,height=600,scrollbars=yes,resizable=yes');

        registerListener(sessionId, function(data) {
            if (data.barcode) {
                const validation = validateBarcode(data.barcode);
                
                if (validation.valid) {
                    const barcodeInput = document.getElementById('editBarcode');
                    if (barcodeInput) {
                        barcodeInput.value = validation.barcode;
                        showNotification(`Código editado escaneado: ${validation.barcode}`, 'success');
                    } else {
                        showNotification('No se encontró el campo de código de barras para edición', 'error');
                    }
                } else {
                    showNotification(validation.error, 'error');
                }

                if (scannerWindow && !scannerWindow.closed) {
                    scannerWindow.close();
                }
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        });

        const checkWindowClosed = setInterval(() => {
            if (scannerWindow && scannerWindow.closed) {
                clearInterval(checkWindowClosed);
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        }, 1000);
    }

    /**
     * Abre el escáner para el modal de editar lote
     */
    function openBarcodeScannerForEditLote() {
        const sessionId = generateSessionId();
        state.currentSessionId = sessionId;

        const scannerUrl = `barcode-scanner.html?sessionId=${sessionId}`;
        const scannerWindow = window.open(scannerUrl, 'barcodeScannerEditLote', 'width=800,height=600,scrollbars=yes,resizable=yes');

        registerListener(sessionId, function(data) {
            if (data.barcode) {
                const validation = validateBarcode(data.barcode);
                
                if (validation.valid) {
                    const barcodeInput = document.getElementById('editLoteBarcode');
                    if (barcodeInput) {
                        barcodeInput.value = validation.barcode;
                        showNotification(`Código de lote editado escaneado: ${validation.barcode}`, 'success');
                    } else {
                        showNotification('No se encontró el campo de código de barras del lote para edición', 'error');
                    }
                } else {
                    showNotification(validation.error, 'error');
                }

                if (scannerWindow && !scannerWindow.closed) {
                    scannerWindow.close();
                }
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        });

        const checkWindowClosed = setInterval(() => {
            if (scannerWindow && scannerWindow.closed) {
                clearInterval(checkWindowClosed);
                removeListener(sessionId);
                state.currentSessionId = null;
            }
        }, 1000);
    }

    /**
     * Escanea código de barras para lote (alias para compatibilidad)
     */
    function scanBarcodeForLote() {
        openBarcodeScannerForLote();
    }

    /**
     * Escanea código de barras para editar lote (alias para compatibilidad)
     */
    function scanBarcodeForEditLote() {
        openBarcodeScannerForEditLote();
    }

    // API pública
    return {
        // Funciones principales
        openBarcodeScannerForAddProduct,
        openBarcodeScannerForLote,
        openBarcodeScannerForEditProduct,
        openBarcodeScannerForEditLote,
        
        // Funciones de compatibilidad
        scanBarcodeForLote,
        scanBarcodeForEditLote,
        
        // Funciones de utilidad
        validateBarcode,
        showNotification,
        cleanupOldListeners
    };

})();

// Sobrescribir las funciones originales si existen
if (typeof window.openBarcodeScannerForAddProduct === 'function') {
    console.log('🔧 Sobrescribiendo openBarcodeScannerForAddProduct con versión mejorada');
    window.openBarcodeScannerForAddProduct = DashboardScanFix.openBarcodeScannerForAddProduct;
}

if (typeof window.openBarcodeScannerForLote === 'function') {
    console.log('🔧 Sobrescribiendo openBarcodeScannerForLote con versión mejorada');
    window.openBarcodeScannerForLote = DashboardScanFix.openBarcodeScannerForLote;
}

if (typeof window.openBarcodeScannerForEditProduct === 'function') {
    console.log('🔧 Sobrescribiendo openBarcodeScannerForEditProduct con versión mejorada');
    window.openBarcodeScannerForEditProduct = DashboardScanFix.openBarcodeScannerForEditProduct;
}

if (typeof window.openBarcodeScannerForEditLote === 'function') {
    console.log('🔧 Sobrescribiendo openBarcodeScannerForEditLote con versión mejorada');
    window.openBarcodeScannerForEditLote = DashboardScanFix.openBarcodeScannerForEditLote;
}

if (typeof window.scanBarcodeForLote === 'function') {
    console.log('🔧 Sobrescribiendo scanBarcodeForLote con versión mejorada');
    window.scanBarcodeForLote = DashboardScanFix.scanBarcodeForLote;
}

if (typeof window.scanBarcodeForEditLote === 'function') {
    console.log('🔧 Sobrescribiendo scanBarcodeForEditLote con versión mejorada');
    window.scanBarcodeForEditLote = DashboardScanFix.scanBarcodeForEditLote;
}

// Mensaje de confirmación
console.log('✅ Sistema de Escaneo Mejorado cargado exitosamente');
console.log('📋 Características activadas:');
console.log('   - Identificación única de sesiones');
console.log('   - Validación robusta de códigos EAN-8/EAN-13');
console.log('   - Comunicación aislada por sesión');
console.log('   - Auto-limpieza de listeners');
console.log('   - Notificaciones visuales de éxito/error');