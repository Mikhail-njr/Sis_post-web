/**
 * Sistema de Escaneo con Identificación de Sesión
 * 
 * Versión mejorada del barcode-scanner.html que detecta automáticamente
 * el ID de sesión desde la URL y valida el formato del código antes de enviar.
 * 
 * Características:
 * - Detección automática de ID de sesión
 * - Validación robusta de formatos EAN-8 y EAN-13
 * - Notificaciones visuales de éxito/error
 * - Cierre automático de ventana
 */

// Espacio de nombres para evitar conflictos
window.BarcodeScannerSession = (function() {
    'use strict';

    // Configuración
    const CONFIG = {
        VALIDATION_REGEX: /^(?:\d{8}|\d{13})$/, // EAN-8 o EAN-13
        NOTIFICATION_DURATION: 2000
    };

    // Estado interno
    let currentSessionId = null;
    let scanner = null;
    let isScanning = false;

    /**
     * Obtiene el ID de sesión de la URL
     */
    function getSessionIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sessionId');
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
     * Muestra una notificación en la interfaz
     */
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, CONFIG.NOTIFICATION_DURATION);
        }
    }

    /**
     * Envía el código de barras al window.opener con ID de sesión
     */
    function sendBarcode(barcode) {
        if (!currentSessionId) {
            console.warn('⚠️ No se encontró ID de sesión. No se enviará el código.');
            showNotification('Error: No se detectó sesión de escaneo', 'error');
            return;
        }

        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage({
                    sessionId: currentSessionId,
                    barcode: barcode
                }, '*');
                
                console.log(`📤 Código enviado a sesión ${currentSessionId}: ${barcode}`);
                showNotification(`Código escaneado: ${barcode}`, 'success');
                
                // Cerrar ventana después de un breve retraso
                setTimeout(() => {
                    window.close();
                }, 1000);
                
            } catch (error) {
                console.error('❌ Error enviando código:', error);
                showNotification('Error al enviar el código', 'error');
            }
        } else {
            console.warn('⚠️ No se encontró ventana padre o está cerrada');
            showNotification('Error: No se puede comunicar con la ventana principal', 'error');
        }
    }

    /**
     * Inicia el escaneo
     */
    function startScanning() {
        if (isScanning) {
            console.log('🔄 Escaneo ya en progreso');
            return;
        }

        isScanning = true;
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Obtener ID de sesión
        currentSessionId = getSessionIdFromUrl();
        if (currentSessionId) {
            console.log(`🎯 Sesión detectada: ${currentSessionId}`);
            showNotification(`Sesión: ${currentSessionId}`, 'info');
        } else {
            console.warn('⚠️ No se detectó ID de sesión en la URL');
            showNotification('Advertencia: No se detectó sesión', 'warning');
        }

        // Iniciar cámara
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function(stream) {
                video.srcObject = stream;
                video.play();
                
                scanner = setInterval(function() {
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Intentar decodificar
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        if (code) {
                            clearInterval(scanner);
                            isScanning = false;
                            
                            const validation = validateBarcode(code.data);
                            
                            if (validation.valid) {
                                sendBarcode(validation.barcode);
                            } else {
                                showNotification(validation.error, 'error');
                                // Volver a iniciar el escaneo después de un retraso
                                setTimeout(() => {
                                    startScanning();
                                }, 2000);
                            }
                        }
                    }
                }, 100);
            })
            .catch(function(err) {
                console.error('❌ Error accediendo a la cámara:', err);
                showNotification('Error al acceder a la cámara', 'error');
            });
    }

    /**
     * Detiene el escaneo
     */
    function stopScanning() {
        if (scanner) {
            clearInterval(scanner);
            scanner = null;
        }
        isScanning = false;
        
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    }

    /**
     * Inicializa el escáner
     */
    function init() {
        // Verificar si hay ID de sesión
        currentSessionId = getSessionIdFromUrl();
        
        if (currentSessionId) {
            console.log(`🎯 Barcode Scanner Session iniciado para sesión: ${currentSessionId}`);
            document.getElementById('session-info').textContent = `Sesión: ${currentSessionId}`;
        } else {
            console.warn('⚠️ No se detectó ID de sesión. Escáner en modo genérico.');
            document.getElementById('session-info').textContent = 'Modo: Escáner genérico (sin sesión)';
            document.getElementById('session-info').style.color = '#ffc107';
        }

        // Iniciar escaneo automáticamente
        startScanning();

        // Manejar cierre de ventana
        window.addEventListener('beforeunload', function() {
            stopScanning();
        });

        // Botón de cancelar
        const cancelButton = document.getElementById('cancel-btn');
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                stopScanning();
                window.close();
            });
        }
    }

    // API pública
    return {
        init,
        startScanning,
        stopScanning,
        validateBarcode,
        showNotification,
        sendBarcode
    };

})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Barcode Scanner Session cargado');
    DashboardScanFix.init();
});