/**
 * @fileoverview Módulo de escaneo de códigos de barras con QuaggaJS
 * @author Sistema POS
 */

// Variables globales para el escáner
let isScanning = false;
let lastScannedCode = null;
let scanTimeout = null;
let debugMessages = [];
let originalConsoleLog = null;
let originalConsoleError = null;
let originalConsoleWarn = null;

// Variables para producto pendiente (esperando confirmación)
let pendingProduct = null;
let pendingQuantity = 1;

// Variables para cantidad pre-escaneo
let preScanQuantity = 1;

// Variables para configuración de cámara
let cameraConfig = {
    preset: 'standard',
    constraints: {}
};

// Variables para WebSocket
let wsConnection = null;
let isWsConnected = false;
let wsReconnectTimeout = null;
let wsPingInterval = null;

// Variables para control de fallos de cámara
let cameraFailureCount = 0;
let maxCameraFailures = 3;
let manualFallbackEnabled = false;

// Variables para control de alerts (removidas para permitir múltiples alertas)

// Presets de configuración de cámara
const CAMERA_PRESETS = {
    standard: {
        name: 'Estándar',
        constraints: {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 15 },
                facingMode: 'environment'
            }
        }
    },
    'high-res': {
        name: 'Alta Resolución',
        constraints: {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
                facingMode: 'environment'
            }
        }
    },
    'close-focus': {
        name: 'Foco Cercano',
        constraints: {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 15 },
                facingMode: 'environment',
                focusMode: { ideal: 'manual' },
                focusDistance: { ideal: 0.1 } // ~10cm
            }
        }
    },
    'high-zoom': {
        name: 'Zoom Alto',
        constraints: {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 15 },
                facingMode: 'environment',
                zoom: { ideal: 2.0 }
            }
        }
    },
    'mobile-opt': {
        name: 'Móvil Optimizado',
        constraints: {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
                facingMode: 'environment',
                focusMode: { ideal: 'manual' },
                focusDistance: { ideal: 0.15 }, // ~15cm
                zoom: { ideal: 1.5 }
            }
        }
    },
    'small-barcodes': {
        name: 'Códigos Pequeños',
        constraints: {
            video: {
                width: { ideal: 2560 },
                height: { ideal: 1440 },
                frameRate: { ideal: 30 },
                facingMode: 'environment',
                focusMode: { ideal: 'manual' },
                focusDistance: { ideal: 0.08 }, // ~8cm para códigos muy pequeños
                zoom: { ideal: 3.0 },
                exposureMode: { ideal: 'manual' },
                exposureCompensation: { ideal: 0.5 },
                whiteBalanceMode: { ideal: 'manual' }
            }
        }
    }
};

// Función para inicializar el panel de debug
function initDebugPanel() {
    // Guardar referencias originales de console
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    // Sobrescribir console methods para capturar mensajes
    console.log = function(...args) {
        addDebugMessage('log', args.join(' '));
        if (originalConsoleLog) originalConsoleLog.apply(console, args);
    };

    console.error = function(...args) {
        addDebugMessage('error', args.join(' '));
        if (originalConsoleError) originalConsoleError.apply(console, args);
    };

    console.warn = function(...args) {
        addDebugMessage('warn', args.join(' '));
        if (originalConsoleWarn) originalConsoleWarn.apply(console, args);
    };

    // Agregar información inicial del dispositivo
    addDebugMessage('info', '=== Información del dispositivo ===');
    addDebugMessage('info', 'User Agent: ' + navigator.userAgent);
    addDebugMessage('info', 'Protocolo: ' + window.location.protocol);
    addDebugMessage('info', 'Host: ' + window.location.host);
    addDebugMessage('info', 'Pantalla: ' + screen.width + 'x' + screen.height);
    addDebugMessage('info', 'Viewport: ' + window.innerWidth + 'x' + window.innerHeight);
    addDebugMessage('info', 'Touch points: ' + navigator.maxTouchPoints);
    addDebugMessage('info', 'Es móvil (regex): ' + /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    addDebugMessage('info', 'Es móvil (touch): ' + (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)));
    addDebugMessage('info', 'Es móvil (screen): ' + (screen.width < 768));
    addDebugMessage('info', 'Soporte getUserMedia: ' + !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    addDebugMessage('info', '================================');
}

// Función para agregar mensaje al panel de debug
function addDebugMessage(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const debugEntry = {
        timestamp,
        type,
        message
    };

    debugMessages.push(debugEntry);

    // Mantener solo los últimos 50 mensajes
    if (debugMessages.length > 50) {
        debugMessages = debugMessages.slice(-50);
    }

    updateDebugDisplay();
}

// Función para actualizar la visualización del debug
function updateDebugDisplay() {
    const debugContent = document.getElementById('debug-content');
    if (!debugContent) return;

    debugContent.innerHTML = debugMessages.map(entry => {
        let color = '#666';
        switch (entry.type) {
            case 'error': color = '#dc3545'; break;
            case 'warn': color = '#ffc107'; break;
            case 'info': color = '#17a2b8'; break;
            case 'log': color = '#28a745'; break;
        }
        return `<div style="margin: 2px 0; color: ${color}; font-size: 11px;">
            <span style="color: #999;">[${entry.timestamp}]</span>
            <span style="color: ${color};">[${entry.type.toUpperCase()}]</span>
            ${entry.message}
        </div>`;
    }).join('');

    // Auto-scroll al final
    debugContent.scrollTop = debugContent.scrollHeight;
}

// Función para mostrar/ocultar panel de debug
function toggleDebugPanel() {
    const panel = document.getElementById('debug-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Función para cargar configuración de cámara guardada
function loadCameraConfig() {
    try {
        const saved = localStorage.getItem('barcode-scanner-config');
        if (saved) {
            const parsed = JSON.parse(saved);
            cameraConfig = { ...cameraConfig, ...parsed };
            addDebugMessage('info', `Configuración cargada: ${cameraConfig.preset}`);
        } else {
            // Configuración por defecto basada en el dispositivo - optimizada para códigos pequeños
            const isMobile = isMobileDevice();
            cameraConfig.preset = isMobile ? 'small-barcodes' : 'close-focus';
            addDebugMessage('info', `Configuración por defecto optimizada para códigos pequeños: ${cameraConfig.preset} (dispositivo móvil: ${isMobile})`);
        }
    } catch (error) {
        addDebugMessage('error', `Error cargando configuración: ${error.message}`);
        cameraConfig.preset = 'standard';
    }
}

// Función para guardar configuración de cámara
function saveCameraConfig() {
    try {
        localStorage.setItem('barcode-scanner-config', JSON.stringify(cameraConfig));
        addDebugMessage('info', `Configuración guardada: ${cameraConfig.preset}`);
    } catch (error) {
        addDebugMessage('error', `Error guardando configuración: ${error.message}`);
    }
}

// Función para obtener restricciones de video según preset
function getVideoConstraints(preset = null) {
    const selectedPreset = preset || cameraConfig.preset;
    const presetConfig = CAMERA_PRESETS[selectedPreset];

    if (!presetConfig) {
        addDebugMessage('warn', `Preset desconocido: ${selectedPreset}, usando 'standard'`);
        return CAMERA_PRESETS.standard.constraints.video;
    }

    // Filtrar restricciones no soportadas por el navegador
    const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    const filteredConstraints = {};

    Object.keys(presetConfig.constraints.video).forEach(key => {
        if (supportedConstraints[key]) {
            filteredConstraints[key] = presetConfig.constraints.video[key];
        } else {
            addDebugMessage('warn', `Restricción no soportada: ${key}`);
        }
    });

    addDebugMessage('info', `Restricciones aplicadas para ${selectedPreset}: ${JSON.stringify(filteredConstraints)}`);
    return filteredConstraints;
}

// Función para mostrar modal de configuración
function showCameraConfigModal() {
    const modal = document.getElementById('camera-config-modal');
    if (!modal) return;

    // Marcar el preset actual
    const radios = modal.querySelectorAll('input[name="camera-preset"]');
    radios.forEach(radio => {
        radio.checked = radio.value === cameraConfig.preset;
    });

    modal.style.display = 'flex';
    addDebugMessage('info', 'Modal de configuración mostrado');
}

// Función para ocultar modal de configuración
function hideCameraConfigModal() {
    const modal = document.getElementById('camera-config-modal');
    if (modal) {
        modal.style.display = 'none';
        addDebugMessage('info', 'Modal de configuración ocultado');
    }
}

// Función para aplicar configuración seleccionada
function applyCameraConfig() {
    const selectedRadio = document.querySelector('input[name="camera-preset"]:checked');
    if (!selectedRadio) {
        updateScannerStatus('❌ Selecciona una configuración', 'error');
        return;
    }

    const newPreset = selectedRadio.value;
    if (newPreset === cameraConfig.preset) {
        updateScannerStatus('✅ Configuración ya aplicada', 'success');
        hideCameraConfigModal();
        return;
    }

    // Actualizar configuración
    cameraConfig.preset = newPreset;
    cameraConfig.constraints = getVideoConstraints(newPreset);

    // Guardar configuración
    saveCameraConfig();

    // Aplicar cambios si está escaneando
    if (isScanning) {
        updateScannerStatus(`🔄 Aplicando configuración: ${CAMERA_PRESETS[newPreset].name}...`, 'scanning');

        // Reiniciar escaneo con nueva configuración
        setTimeout(async () => {
            await stopScanning();
            setTimeout(() => {
                startScanning();
            }, 500);
        }, 500);
    } else {
        updateScannerStatus(`✅ Configuración aplicada: ${CAMERA_PRESETS[newPreset].name}`, 'success');
    }

    hideCameraConfigModal();
    addDebugMessage('info', `Configuración aplicada: ${newPreset}`);
}

// Función para resetear configuración
function resetCameraConfig() {
    cameraConfig.preset = 'standard';
    cameraConfig.constraints = {};

    // Limpiar localStorage
    try {
        localStorage.removeItem('barcode-scanner-config');
    } catch (error) {
        addDebugMessage('error', `Error limpiando configuración: ${error.message}`);
    }

    // Resetear selección en modal
    const standardRadio = document.querySelector('input[name="camera-preset"][value="standard"]');
    if (standardRadio) {
        standardRadio.checked = true;
    }

    updateScannerStatus('🔄 Configuración reseteada a valores por defecto', 'scanning');
    addDebugMessage('info', 'Configuración reseteada');
}

// Función para conectar al WebSocket
function connectWebSocket() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        return; // Ya conectado
    }

    // Determinar el tipo de cliente basado en el dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const clientType = isMobile ? 'mobile' : 'web';

    // Construir URL del WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?type=${clientType}`;

    addDebugMessage('info', `Conectando a WebSocket: ${wsUrl}`);

    try {
        wsConnection = new WebSocket(wsUrl);

        wsConnection.onopen = function(event) {
            isWsConnected = true;
            addDebugMessage('info', `WebSocket conectado como ${clientType}`);

            // Iniciar ping para mantener conexión viva
            wsPingInterval = setInterval(() => {
                if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                    wsConnection.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000); // Ping cada 30 segundos

            // Notificar conexión exitosa
            updateWebSocketStatus(true);
        };

        wsConnection.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                addDebugMessage('error', `Error procesando mensaje WebSocket: ${error.message}`);
            }
        };

        wsConnection.onclose = function(event) {
            isWsConnected = false;
            addDebugMessage('warn', `WebSocket desconectado (código: ${event.code}, razón: ${event.reason})`);

            // Limpiar intervalos
            if (wsPingInterval) {
                clearInterval(wsPingInterval);
                wsPingInterval = null;
            }

            updateWebSocketStatus(false);

            // Intentar reconectar después de 5 segundos
            if (!wsReconnectTimeout) {
                wsReconnectTimeout = setTimeout(() => {
                    wsReconnectTimeout = null;
                    addDebugMessage('info', 'Intentando reconectar WebSocket...');
                    connectWebSocket();
                }, 5000);
            }
        };

        wsConnection.onerror = function(error) {
            addDebugMessage('error', `Error en WebSocket: ${error}`);
            updateWebSocketStatus(false);
        };

    } catch (error) {
        addDebugMessage('error', `Error creando conexión WebSocket: ${error.message}`);
        updateWebSocketStatus(false);
    }
}

// Función para desconectar WebSocket
function disconnectWebSocket() {
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
    if (wsPingInterval) {
        clearInterval(wsPingInterval);
        wsPingInterval = null;
    }
    if (wsReconnectTimeout) {
        clearTimeout(wsReconnectTimeout);
        wsReconnectTimeout = null;
    }
    isWsConnected = false;
    updateWebSocketStatus(false);
}

// Función para actualizar el estado de conexión WebSocket en la UI
function updateWebSocketStatus(connected) {
    const statusElement = document.getElementById('websocket-status');
    if (statusElement) {
        statusElement.className = connected ? 'websocket-connected' : 'websocket-disconnected';
        statusElement.innerHTML = connected ? '🔗 WebSocket Conectado' : '🔌 WebSocket Desconectado';
    }
}

// Función para manejar mensajes WebSocket
function handleWebSocketMessage(message) {
    addDebugMessage('info', `Mensaje WebSocket recibido: ${message.type}`);

    switch (message.type) {
        case 'welcome':
            addDebugMessage('info', `Mensaje de bienvenida: ${message.message}`);
            break;

        case 'barcode_received':
            // Solo para clientes web: código recibido desde móvil
            if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                console.log(`📡 [WEB CLIENTE] Código recibido desde móvil vía WebSocket: ${message.barcode}`);
                addDebugMessage('info', `Código recibido desde móvil: ${message.barcode}`);
                updateScannerStatus(`📱 Código recibido desde móvil: ${message.barcode}`, 'success');

                // Procesar el código automáticamente
                console.log(`📡 [WEB CLIENTE] Iniciando búsqueda automática del producto...`);
                searchProductByBarcode(message.barcode);
            }
            break;

        case 'barcode_ack':
            // Confirmación de recepción del código (para móviles)
            addDebugMessage('info', `Código confirmado: ${message.barcode}`);
            updateScannerStatus(`✅ Código enviado correctamente: ${message.barcode}`, 'success');
            break;

        case 'client_disconnected':
            addDebugMessage('info', `Cliente desconectado: ${message.client_type}`);
            break;

        case 'pong':
            // Respuesta a ping - conexión viva
            break;

        case 'status':
            addDebugMessage('info', `Estado del sistema - Móviles: ${message.mobile_clients}, Web: ${message.web_clients}`);
            break;

        case 'error':
            addDebugMessage('error', `Error desde servidor: ${message.message}`);
            updateScannerStatus(`❌ Error del servidor: ${message.message}`, 'error');
            break;

        default:
            addDebugMessage('warn', `Tipo de mensaje desconocido: ${message.type}`);
    }
}

// Función para enviar código escaneado vía WebSocket
function sendBarcodeViaWebSocket(barcode) {
    if (!isWsConnected || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        addDebugMessage('warn', 'WebSocket no conectado, no se puede enviar código');
        return false;
    }

    try {
        const message = {
            type: 'barcode_scanned',
            barcode: barcode,
            timestamp: new Date().toISOString()
        };

        wsConnection.send(JSON.stringify(message));
        addDebugMessage('info', `Código enviado vía WebSocket: ${barcode}`);
        return true;
    } catch (error) {
        addDebugMessage('error', `Error enviando código vía WebSocket: ${error.message}`);
        return false;
    }
}

// Importar utilidades de códigos de barras
// Nota: En el navegador, este archivo se carga como módulo o se incluye directamente
// Para compatibilidad, mantenemos las funciones locales pero recomendamos usar el módulo shared

// Función para mostrar estado del escáner
function updateScannerStatus(message, type = 'scanning') {
    const statusDiv = document.getElementById('scanner-status');
    if (statusDiv) {
        statusDiv.className = `scanner-status status-${type}`;
        statusDiv.innerHTML = message;
    } else {
        console.warn('Elemento scanner-status no encontrado en el DOM');
    }

    // Mostrar/ocultar ayuda según el tipo de error
    const helpDiv = document.getElementById('camera-help');
    if (helpDiv) {
        if (type === 'error' && message.includes('cámara')) {
            helpDiv.style.display = 'block';
        } else {
            helpDiv.style.display = 'none';
        }
    }
}

// Función para mostrar mensaje de error con opciones de recuperación
function showErrorWithRecovery(message, recoveryOptions = []) {
    const statusDiv = document.getElementById('scanner-status');
    statusDiv.className = 'scanner-status status-error';

    let html = `<div>${message}</div>`;

    if (recoveryOptions.length > 0) {
        html += '<div style="margin-top: 10px; font-size: 14px;">';
        html += '<strong>Opciones de recuperación:</strong><br>';
        recoveryOptions.forEach(option => {
            html += `• ${option}<br>`;
        });
        html += '</div>';
    }

    // Agregar botón para reintentar
    html += '<div style="margin-top: 15px;">';
    html += '<button onclick="retryCameraAccess()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">🔄 Reintentar</button>';
    html += '<button onclick="document.getElementById(\'camera-help\').style.display=\'block\'" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">❓ Ayuda</button>';
    html += '</div>';

    statusDiv.innerHTML = html;
}

// Función para reintentar acceso a cámara
function retryCameraAccess() {
    selectedDeviceId = null; // Resetear selección de dispositivo
    updateScannerStatus('🔄 Reintentando acceso a cámara...', 'scanning');

    // Pequeño delay antes de reintentar
    setTimeout(() => {
        startScanning();
    }, 1000);
}

// Función para mostrar/ocultar ayuda
function toggleHelp() {
    const helpDiv = document.getElementById('camera-help');
    helpDiv.style.display = helpDiv.style.display === 'none' ? 'block' : 'none';
}

// Función para mostrar notificación personalizada (reemplaza alert)
function showCustomAlert(message, type = 'warning') {
    // Generar ID único para la alerta
    const alertId = 'custom-alert-' + Date.now();

    // Calcular posición top basada en alertas existentes
    const existingAlerts = document.querySelectorAll('[id^="custom-alert-"]');
    let maxBottom = 10; // Margen inicial desde arriba
    existingAlerts.forEach(alert => {
        const rect = alert.getBoundingClientRect();
        const bottom = rect.top + rect.height;
        if (bottom > maxBottom) maxBottom = bottom;
    });
    const top = maxBottom + 10;

    // Definir colores según el tipo
    let background, color, border;
    switch (type) {
        case 'success':
            background = '#d4edda';
            color = '#155724';
            border = '#c3e6cb';
            break;
        case 'error':
            background = '#f8d7da';
            color = '#721c24';
            border = '#f5c6cb';
            break;
        case 'warning':
        default:
            background = '#fff3cd';
            color = '#856404';
            border = '#ffeaa7';
            break;
    }

    // Crear elemento de notificación
    const alertDiv = document.createElement('div');
    alertDiv.id = alertId;
    alertDiv.style.cssText = `
        position: fixed;
        top: ${top}px;
        left: 50%;
        transform: translateX(-50%);
        background: ${background};
        color: ${color};
        border: 1px solid ${border};
        border-radius: 8px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        text-align: center;
        font-weight: bold;
        animation: slideDown 0.3s ease-out;
    `;

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${message}</span>
            <button onclick="dismissCustomAlert('${alertId}')" style="
                background: none;
                border: none;
                color: inherit;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
            ">×</button>
        </div>
    `;

    // Agregar estilos de animación si no existen
    if (!document.getElementById('custom-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-alert-styles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(alertDiv);

    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        dismissCustomAlert(alertId);
    }, 4000);
}

// Función para descartar la alerta personalizada
function dismissCustomAlert(alertId) {
    const alertDiv = document.getElementById(alertId);
    if (alertDiv) {
        alertDiv.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
            // Reposicionar las alertas restantes
            repositionAlerts();
        }, 300);
    }
}

// Función para reposicionar alertas después de cerrar una
function repositionAlerts() {
    const alerts = document.querySelectorAll('[id^="custom-alert-"]');
    let currentTop = 20;
    alerts.forEach(alert => {
        alert.style.top = currentTop + 'px';
        currentTop += alert.offsetHeight + 10;
    });
}

// Función para reproducir un beep de confirmación
function playBeep() {
    try {
        // Usar Web Audio API para generar un beep
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configurar el beep: frecuencia 800Hz, duración 200ms
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);

        addDebugMessage('info', 'Beep de confirmación reproducido');
    } catch (error) {
        addDebugMessage('warn', `No se pudo reproducir beep: ${error.message}`);
        // Fallback: intentar con un audio simple si existe
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeO1fLOfCsFJHfH8N2QQAoUXrTp66hVFApGn+DY=');
            audio.play().catch(e => addDebugMessage('warn', `Fallback audio failed: ${e.message}`));
        } catch (fallbackError) {
            addDebugMessage('warn', `Fallback audio también falló: ${fallbackError.message}`);
        }
    }
}

// Función para mostrar resultado del producto con entrada de cantidad mejorada
function showProductResult(product, lote, barcode) {
    const resultDiv = document.getElementById('product-result');

    let stockStatus = '';
    if (lote.estado_vencimiento === 'vencido') {
        stockStatus = `<span style="color: #dc3545;">⚠️ PRODUCTO VENCIDO (${lote.dias_para_vencer} días)</span>`;
    } else if (lote.estado_vencimiento === 'proximo_vencer') {
        stockStatus = `<span style="color: #ffc107;">⚠️ VENCE PRONTO (${lote.dias_para_vencer} días)</span>`;
    } else {
        stockStatus = `<span style="color: #28a745;">✅ VIGENTE</span>`;
    }

    resultDiv.innerHTML = `
        <h3>✅ Producto Encontrado - ${product.nombre}</h3>
        <div class="product-details">
            <div class="product-detail">
                <label>Código:</label>
                <span>${product.codigo}</span>
            </div>
            <div class="product-detail">
                <label>Precio Unitario:</label>
                <span>$${parseFloat(product.precio).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="product-detail">
                <label>Stock Disponible:</label>
                <span>${product.stock_disponible} unidades</span>
            </div>
            <div class="product-detail">
                <label>Lote:</label>
                <span>${lote.numero_lote}</span>
            </div>
            <div class="product-detail">
                <label>Vencimiento:</label>
                <span>${new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR')}</span>
            </div>
            <div class="product-detail">
                <label>Estado:</label>
                <span>${stockStatus}</span>
            </div>
        </div>


        <div style="text-align: center; margin-top: 20px;">
            <div style="font-size: 14px; color: #666; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                ✅ Producto agregado automáticamente al carrito con ${pendingQuantity} unidades<br>
                💡 Escanea el mismo código nuevamente para agregar ${preScanQuantity} unidades más
            </div>
        </div>
    `;

    resultDiv.style.display = 'block';

    // Enfocar el input de cantidad
    setTimeout(() => {
        const quantityInput = document.getElementById('product-quantity');
        if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();

            // Agregar event listener para actualizar el botón cuando cambie la cantidad
            quantityInput.addEventListener('input', updateAddToCartButton);
            quantityInput.addEventListener('change', updateAddToCartButton);
        }
    }, 100);
}

// Función para mostrar confirmación de escaneo automático
function showScanConfirmation(productName, quantity) {
    const resultDiv = document.getElementById('product-result');

    resultDiv.innerHTML = `
        <h3>✅ Producto Agregado</h3>
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 16px; margin-bottom: 10px;">
                <strong>${productName}</strong>
            </div>
            <div style="font-size: 14px; color: #28a745; margin-bottom: 15px;">
                ✅ ${quantity} unidades agregadas al carrito
            </div>
            <div style="font-size: 12px; color: #666;">
                💡 Escanea el mismo código para agregar ${preScanQuantity} unidades más
            </div>
        </div>
    `;

    resultDiv.style.display = 'block';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        resultDiv.style.display = 'none';
        if (!isScanning) {
            startScanning();
        }
    }, 3000);
}

// Función para mostrar información de producto sin stock o vencido
function showProductStatusInfo(product, status, statusMessage) {
    const resultDiv = document.getElementById('product-result');

    let statusColor = '#dc3545'; // Rojo para error
    let statusIcon = '⚠️';

    if (status === 'sin_stock') {
        statusColor = '#ffc107'; // Amarillo para sin stock
        statusIcon = '📦';
    } else if (status === 'vencido') {
        statusColor = '#dc3545'; // Rojo para vencido
        statusIcon = '⏰';
    }

    resultDiv.innerHTML = `
        <h3 style="color: ${statusColor};">${statusIcon} ${statusMessage}</h3>
        <div class="product-details">
            <div class="product-detail">
                <label>Producto:</label>
                <span><strong>${product.nombre}</strong></span>
            </div>
            <div class="product-detail">
                <label>Código:</label>
                <span>${product.codigo}</span>
            </div>
            <div class="product-detail">
                <label>Precio:</label>
                <span>$${parseFloat(product.precio).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="product-detail">
                <label>Stock Disponible:</label>
                <span style="color: ${statusColor}; font-weight: bold;">${product.stock_disponible} unidades</span>
            </div>
            <div class="product-detail">
                <label>Categoría:</label>
                <span>${product.categoria || 'Sin categoría'}</span>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 14px; color: #666;">
                ${statusIcon} Este producto no puede ser agregado al carrito en este momento<br>
                <small>El mensaje se ocultará automáticamente en 5 segundos o al escanear otro código</small>
            </div>
        </div>
    `;

    resultDiv.style.display = 'block';
}


// Función para ajustar la cantidad pre-escaneo
function adjustPreScanQuantity(delta) {
    const quantityInput = document.getElementById('pre-scan-quantity');
    if (!quantityInput) return;

    const currentValue = parseInt(quantityInput.value) || 1;
    const newValue = Math.max(1, Math.min(99, currentValue + delta));

    quantityInput.value = newValue;
    preScanQuantity = newValue;
}

// Función para actualizar la cantidad pre-escaneo desde el input
function updatePreScanQuantity() {
    const quantityInput = document.getElementById('pre-scan-quantity');
    if (!quantityInput) return;

    const quantity = parseInt(quantityInput.value) || 1;

    // Validar límites
    if (quantity < 1) {
        quantityInput.value = 1;
        preScanQuantity = 1;
    } else if (quantity > 99) {
        quantityInput.value = 99;
        preScanQuantity = 99;
    } else {
        preScanQuantity = quantity;
    }
}


// Función para buscar producto por código de barras
async function searchProductByBarcode(barcode) {
    // Si se abrió desde una ventana padre (como el formulario de agregar producto), enviar el código de barras de vuelta
    if (window.opener) {
        updateScannerStatus(`✅ Código capturado: ${barcode}`, 'success');
        window.opener.postMessage({ barcode: barcode }, '*');
        // Cerrar la ventana después de un breve delay
        setTimeout(() => {
            window.close();
        }, 1000);
        return;
    }

    try {
        console.log(`🔍 [WEB CLIENTE] Iniciando búsqueda de producto para código: ${barcode}`);
        updateScannerStatus('<div class="loading-spinner"></div>Buscando producto...', 'scanning');

        const apiUrl = `${window.location.protocol}//${window.location.host}/api/products/search-by-barcode/${barcode}`;
        console.log(`🔍 [WEB CLIENTE] Realizando petición a: ${apiUrl}`);
        addDebugMessage('info', `Realizando fetch a: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                // Agregar autenticación si está disponible
                ...(authCredentials ? {
                    'Authorization': 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password)
                } : {})
            }
        });

        console.log(`🔍 [WEB CLIENTE] Respuesta del servidor - Status: ${response.status}, OK: ${response.ok}`);
        addDebugMessage('info', `Respuesta del servidor - Status: ${response.status}, OK: ${response.ok}`);

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                addDebugMessage('error', `Respuesta de error del servidor: ${errorText}`);
            } catch (e) {
                addDebugMessage('error', `No se pudo leer respuesta de error: ${e.message}`);
            }

            if (response.status === 404) {
                throw new Error('Producto no existe');
            } else if (response.status === 400) {
                throw new Error('Código de barras inválido');
            } else {
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json();
        console.log(`🔍 [WEB CLIENTE] Datos recibidos del servidor: ${JSON.stringify(data).substring(0, 200)}...`);
        addDebugMessage('info', `Datos recibidos del servidor: ${JSON.stringify(data).substring(0, 200)}...`);

        if (data.found) {
            console.log(`🔍 [WEB CLIENTE] Producto encontrado: ${data.product.nombre} (ID: ${data.product.id}) - Estado: ${data.status}`);

            // Verificar el estado del producto
            if (data.status === 'available') {
                updateScannerStatus('✅ Producto encontrado exitosamente', 'success');
                showCustomAlert('✅ Producto encontrado y disponible', 'success');

                // Verificar si hay un producto pendiente
                if (pendingProduct) {
                    // Si el código escaneado es el mismo que el producto pendiente, incrementar cantidad
                    if (pendingProduct.id === data.product.id) {
                        // Incrementar cantidad usando la cantidad pre-escaneo (máximo 99 para evitar cantidades excesivas)
                        if (pendingQuantity < 99) {
                            const newQuantity = Math.min(99, pendingQuantity + preScanQuantity);
                            const added = newQuantity - pendingQuantity;
                            pendingQuantity = newQuantity;
                            updateScannerStatus(`✅ Cantidad incrementada: +${added} unidades (${pendingQuantity} total) de "${pendingProduct.nombre}"`, 'success');

                            // Agregar automáticamente al carrito sin mostrar modal
                            addPendingProductToCart();

                            // Mostrar confirmación breve
                            showScanConfirmation(pendingProduct.nombre, added);
                        } else {
                            updateScannerStatus(`⚠️ Cantidad máxima alcanzada (99). Usa "Cantidad Múltiple" para valores mayores.`, 'error');
                        }

                        return;
                    } else {
                        // Si es un código diferente, agregar el producto pendiente al carrito y mostrar el nuevo
                        addPendingProductToCart();
                        updateScannerStatus(`✅ Producto anterior agregado. Nuevo producto encontrado.`, 'success');
                    }
                }

                // Establecer el nuevo producto como pendiente
                pendingProduct = data.product;
                pendingProduct.lote = data.lote;
                pendingProduct.barcode = data.barcode;
                pendingQuantity = preScanQuantity;

                // Agregar automáticamente al carrito sin mostrar modal
                addPendingProductToCart();

                // Mostrar confirmación breve
                showScanConfirmation(data.product.nombre, pendingQuantity);
            } else {
                // Producto encontrado pero con estado especial (sin stock o vencido)
                let statusMessage = '';
                let statusType = 'error';
                let alertMessage = '';

                if (data.status === 'sin_stock') {
                    statusMessage = `⚠️ ${data.product.nombre} - SIN STOCK`;
                    statusType = 'error';
                    alertMessage = `¡ALERTA! El producto "${data.product.nombre}" no tiene stock disponible.`;
                } else if (data.status === 'vencido') {
                    statusMessage = `⚠️ ${data.product.nombre} - PRODUCTO VENCIDO`;
                    statusType = 'error';
                    alertMessage = `¡ALERTA! El producto "${data.product.nombre}" está vencido y no puede ser vendido.`;
                }

                // Mostrar alerta personalizada (no bloqueante)
                if (alertMessage) {
                    showCustomAlert(alertMessage, 'error');
                }

                updateScannerStatus(statusMessage, statusType);

                // Mostrar información del producto sin stock/vencido
                showProductStatusInfo(data.product, data.status, data.status_message);

                // Limpiar cualquier producto pendiente
                clearPendingProduct();

                // El mensaje se mantendrá por 5 segundos o hasta el próximo escaneo
                setTimeout(() => {
                    // Ocultar información del producto
                    document.getElementById('product-result').style.display = 'none';
                    if (!isScanning) {
                        updateScannerStatus('🔍 Listo para escanear', 'scanning');
                    }
                }, 5000);

                return;
            }
        } else {
            console.log(`🔍 [WEB CLIENTE] Producto NO encontrado para código: ${barcode}`);
            throw new Error('Producto no encontrado');
        }

    } catch (error) {
        console.error('🔍 [WEB CLIENTE] Error buscando producto:', error);
        console.log(`🔍 [WEB CLIENTE] Error en búsqueda: ${error.message}`);
        addDebugMessage('error', `Error en búsqueda de producto: ${error.message}`);

        // Log additional error details
        if (error.name) addDebugMessage('error', `Error name: ${error.name}`);
        if (error.stack) addDebugMessage('error', `Error stack: ${error.stack}`);

        // Mostrar alerta personalizada para códigos no encontrados
        if (error.message && error.message.includes('Producto no existe')) {
            showCustomAlert(`❌ ${error.message}`, 'error');
        }

        updateScannerStatus(`❌ ${error.message}`, 'error');

        // Ocultar resultado anterior si existe
        document.getElementById('product-result').style.display = 'none';

        // Permitir escanear de nuevo después de un error
        setTimeout(() => {
            if (!isScanning) {
                updateScannerStatus('🔍 Listo para escanear', 'scanning');
            }
        }, 3000);
    }
}

// Función para agregar producto pendiente al carrito
function addPendingProductToCart() {
    if (!pendingProduct) return;

    const quantity = pendingQuantity;

    // Verificar si el carrito existe (viene de index.html)
    if (typeof cart === 'undefined') {
        // Si no estamos en la página principal, redirigir
        if (confirm(`Producto "${pendingProduct.nombre}" encontrado. ¿Deseas ir a la página principal para agregarlo al carrito?`)) {
            // Guardar el producto en sessionStorage para recuperarlo después
            sessionStorage.setItem('scannedProduct', JSON.stringify({
                id: pendingProduct.id,
                nombre: pendingProduct.nombre,
                precio: pendingProduct.precio,
                codigo: pendingProduct.codigo,
                quantity: quantity,
                timestamp: Date.now()
            }));
            window.location.href = 'index.html';
        }
        return;
    }

    // Agregar al carrito existente
    const existingItem = cart.find(item => item.id === pendingProduct.id);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: pendingProduct.id,
            nombre: pendingProduct.nombre,
            precio: pendingProduct.precio,
            codigo: pendingProduct.codigo,
            quantity: quantity
        });
    }

    // Actualizar UI del carrito si existe la función
    if (typeof updateCart === 'function') {
        updateCart();
    }

    updateScannerStatus(`✅ "${pendingProduct.nombre}" (${quantity} unidades) agregado al carrito`, 'success');

    // Limpiar producto pendiente
    clearPendingProduct();

    // Ocultar resultado después de 2 segundos
    setTimeout(() => {
        document.getElementById('product-result').style.display = 'none';
        if (!isScanning) {
            startScanning();
        }
    }, 2000);
}

// Función para cancelar producto pendiente
function cancelPendingProduct() {
    updateScannerStatus('❌ Producto cancelado', 'error');

    // Limpiar producto pendiente
    clearPendingProduct();

    // Ocultar resultado después de 1 segundo
    setTimeout(() => {
        document.getElementById('product-result').style.display = 'none';
        if (!isScanning) {
            startScanning();
        }
    }, 1000);
}

// Función para limpiar producto pendiente
function clearPendingProduct() {
    pendingProduct = null;
    pendingQuantity = preScanQuantity;
}

// Función para agregar producto escaneado al carrito (legacy - mantener por compatibilidad)
function addScannedProductToCart(productId, productName, price, productCode) {
    // Verificar si el carrito existe (viene de index.html)
    if (typeof cart === 'undefined') {
        // Si no estamos en la página principal, redirigir
        if (confirm(`Producto "${productName}" encontrado. ¿Deseas ir a la página principal para agregarlo al carrito?`)) {
            // Guardar el producto en sessionStorage para recuperarlo después
            sessionStorage.setItem('scannedProduct', JSON.stringify({
                id: productId,
                nombre: productName,
                precio: price,
                codigo: productCode,
                timestamp: Date.now()
            }));
            window.location.href = 'index.html';
        }
        return;
    }

    // Agregar al carrito existente
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            nombre: productName,
            precio: price,
            codigo: productCode,
            quantity: 1
        });
    }

    // Actualizar UI del carrito si existe la función
    if (typeof updateCart === 'function') {
        updateCart();
    }

    updateScannerStatus(`✅ "${productName}" agregado al carrito`, 'success');

    // No ocultar automáticamente - la confirmación se oculta sola
}

// Variables globales para ZXing
let codeReader = null;
let isZXingInitialized = false;
let selectedDeviceId = null;

// Función para inicializar ZXing
async function initZXing() {
    if (isZXingInitialized) return true;

    // Verificar si ZXing está disponible en el scope global
    if (typeof window.ZXing === 'undefined') {
        addDebugMessage('error', '❌ ZXing no está disponible. El script no se cargó correctamente.');
        // updateScannerStatus('❌ Error: ZXing no se pudo cargar', 'error');
        return false;
    }

    try {
        // Inicializar ZXing
        codeReader = new window.ZXing.BrowserMultiFormatReader();
        isZXingInitialized = true;
        addDebugMessage('info', 'ZXing inicializado correctamente');
        return true;
    } catch (error) {
        addDebugMessage('error', `Error inicializando ZXing: ${error.message}`);
        updateScannerStatus('❌ Error: ZXing no se pudo inicializar', 'error');
        return false;
    }
}

// Función para obtener la mejor cámara disponible
async function getBestCameraDevice() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        addDebugMessage('info', `Cámaras disponibles: ${videoDevices.length}`);

        if (videoDevices.length === 0) {
            return null;
        }

        // En móviles, preferir la cámara trasera (environment)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // Buscar cámara trasera
            const backCamera = videoDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            );

            if (backCamera) {
                addDebugMessage('info', `Seleccionada cámara trasera: ${backCamera.label}`);
                return backCamera.deviceId;
            }
        }

        // Si no hay preferencia móvil o no se encontró trasera, usar la primera disponible
        addDebugMessage('info', `Seleccionada primera cámara disponible: ${videoDevices[0].label}`);
        return videoDevices[0].deviceId;

    } catch (error) {
        addDebugMessage('error', `Error obteniendo dispositivos de cámara: ${error.message}`);
        return null;
    }
}

// Función para solicitar permisos de cámara explícitamente
async function requestCameraPermission() {
    try {
        updateScannerStatus('🔐 Solicitando permisos de cámara...', 'scanning');

        // Solicitar permiso explícitamente con un stream temporal
        const permissionStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });

        // Liberar el stream inmediatamente después de obtener permiso
        permissionStream.getTracks().forEach(track => track.stop());

        addDebugMessage('info', 'Permiso de cámara concedido exitosamente');
        return true;
    } catch (error) {
        addDebugMessage('error', `Error solicitando permiso de cámara: ${error.name}`);

        if (error.name === 'NotAllowedError') {
            updateScannerStatus('❌ Permiso de cámara denegado. Haz clic en "Permitir" cuando aparezca el mensaje.', 'error');
        } else if (error.name === 'NotFoundError') {
            updateScannerStatus('❌ No se encontró cámara en el dispositivo', 'error');
        } else if (error.name === 'NotReadableError') {
            updateScannerStatus('❌ La cámara está siendo usada por otra aplicación', 'error');
        } else {
            updateScannerStatus(`❌ Error de cámara: ${error.message}`, 'error');
        }

        return false;
    }
}

// Función para verificar compatibilidad y permisos de cámara
async function checkCameraSupport() {
    // Verificar si estamos en HTTPS, localhost, o ngrok tunnel (permitir HTTP para ngrok)
    const isSecure = window.location.protocol === 'https:' ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('ngrok');

    if (!isSecure && window.location.protocol !== 'http:') {
        updateScannerStatus('⚠️ Para usar la cámara, accede con HTTPS, localhost, o ngrok', 'error');
        return false;
    }

    // Verificar soporte de getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateScannerStatus('❌ Tu navegador no soporta acceso a cámara', 'error');
        return false;
    }

    // Inicializar ZXing
    if (!await initZXing()) {
        updateScannerStatus('❌ Error inicializando biblioteca de escaneo', 'error');
        return false;
    }

    // Solicitar permisos explícitamente antes de continuar
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
        return false;
    }

    addDebugMessage('info', 'Verificación completa de soporte de cámara exitosa');
    return true;
}

// Función mejorada para detectar dispositivos móviles
function isMobileDevice() {
    // Combinar múltiples indicadores para mejor detección
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouchScreen = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    const smallScreen = screen.width < 768;
    const viewportSmall = window.innerWidth < 768;

    // Solo considerar móvil si cumple múltiples criterios
    const isMobile = userAgentMobile && hasTouchScreen && (smallScreen || viewportSmall);

    addDebugMessage('info', `Detección móvil - UA: ${userAgentMobile}, Touch: ${hasTouchScreen}, Screen: ${smallScreen}, Viewport: ${viewportSmall} = ${isMobile}`);

    return isMobile;
}

// Función para iniciar el escaneo con ZXing
async function startScanning() {
    // Detectar si es dispositivo móvil con mejor precisión
    const isMobile = isMobileDevice();

    addDebugMessage('info', `Iniciando escaneo con ZXing - Detectado como móvil: ${isMobile}`);

    // Solo forzar modo manual en móviles pequeños, permitir escaneo en tablets/desktop
    if (isMobile && screen.width < 600) {
        addDebugMessage('info', 'Forzando modo manual para dispositivo móvil pequeño');
        // En móviles pequeños, deshabilitar escaneo automático y dirigir al ingreso manual
        updateScannerStatus('📱 En dispositivos móviles pequeños, usa el ingreso manual abajo para mejor experiencia.', 'error');
        const manualSection = document.querySelector('.manual-input');
        if (manualSection) {
            manualSection.style.border = '3px solid #28a745';
            manualSection.style.background = '#d4edda';
            manualSection.scrollIntoView({ behavior: 'smooth' });
            // Enfocar el campo de entrada
            const inputField = document.getElementById('manual-barcode');
            if (inputField) {
                setTimeout(() => inputField.focus(), 500);
            }
        }
        return;
    }

    if (isScanning) return;

    // Verificar compatibilidad primero
    const cameraSupported = await checkCameraSupport();
    if (!cameraSupported) {
        return;
    }

    isScanning = true;
    lastScannedCode = null;

    // Ocultar resultado anterior
    document.getElementById('product-result').style.display = 'none';

    updateScannerStatus('🔍 Solicitando acceso a cámara...', 'scanning');

    addDebugMessage('info', 'Dispositivo móvil detectado: ' + isMobile);
    addDebugMessage('info', 'User Agent: ' + navigator.userAgent);
    addDebugMessage('info', 'Protocolo: ' + window.location.protocol);
    addDebugMessage('info', 'Host: ' + window.location.host);

    try {
        // Configurar ZXing para usar la cámara
        const videoElement = document.querySelector('#scanner-video');

        if (!videoElement) {
            throw new Error('Elemento de video no encontrado');
        }

        addDebugMessage('info', `Elemento video encontrado: ${videoElement.id}`);
        addDebugMessage('info', `Dimensiones del elemento: ${videoElement.offsetWidth}x${videoElement.offsetHeight}`);

        // Asegurar atributos críticos para el video y configuración óptima
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.setAttribute('autoplay', 'true');
        videoElement.setAttribute('muted', 'true');
        videoElement.setAttribute('controls', 'false');
        videoElement.style.display = 'block';
        videoElement.style.width = '100%';
        videoElement.style.height = 'auto';
        videoElement.style.minHeight = '300px';
        videoElement.style.objectFit = 'contain';
        videoElement.style.backgroundColor = '#000';
        videoElement.style.border = '2px solid #007bff';

        addDebugMessage('info', 'Atributos del video configurados');

        // Limpiar cualquier stream anterior
        if (videoElement.srcObject) {
            addDebugMessage('info', 'Limpiando stream anterior');
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        // Forzar recarga del elemento video para evitar problemas de cache
        videoElement.load();
        addDebugMessage('info', 'Video element reloaded');

        // Mostrar controles
        document.getElementById('start-scan-btn').style.display = 'none';
        document.getElementById('stop-scan-btn').style.display = 'inline-block';

        updateScannerStatus('🔍 Iniciando escaneo...', 'scanning');

        // Seleccionar la mejor cámara disponible
        if (!selectedDeviceId) {
            selectedDeviceId = await getBestCameraDevice();
        }

        // Aplicar configuración de video personalizada
        const videoConstraints = getVideoConstraints();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, ...videoConstraints },
                audio: false
            });

            // Aplicar restricciones al stream si es necesario
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && videoTrack.applyConstraints) {
                await videoTrack.applyConstraints(videoConstraints);
                addDebugMessage('info', 'Restricciones aplicadas al stream de video');
            }

            // Asignar el stream al elemento video con manejo de errores mejorado
            try {
                addDebugMessage('info', 'Asignando stream al elemento video...');
                videoElement.srcObject = stream;
                addDebugMessage('info', `Stream asignado exitosamente: ${cameraConfig.preset}`);

                // Verificar que el stream tenga tracks
                const videoTracks = stream.getVideoTracks();
                addDebugMessage('info', `Tracks de video en stream: ${videoTracks.length}`);

                if (videoTracks.length > 0) {
                    const track = videoTracks[0];
                    addDebugMessage('info', `Configuración del track: ${JSON.stringify(track.getSettings())}`);
                    addDebugMessage('info', `Restricciones del track: ${JSON.stringify(track.getConstraints())}`);
                }

                // Esperar a que el video esté listo con mejor manejo
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        addDebugMessage('error', 'Timeout esperando video ready - estado actual: ' +
                            `readyState=${videoElement.readyState}, ` +
                            `videoWidth=${videoElement.videoWidth}, ` +
                            `videoHeight=${videoElement.videoHeight}`);
                        reject(new Error('Timeout esperando video ready'));
                    }, 10000); // Aumentado a 10 segundos

                    const onLoadedMetadata = () => {
                        clearTimeout(timeout);
                        addDebugMessage('info', `Video metadata loaded: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                        addDebugMessage('info', `Ready state: ${videoElement.readyState}`);
                        resolve();
                    };

                    const onError = (error) => {
                        clearTimeout(timeout);
                        addDebugMessage('error', `Error loading video: ${error}`);
                        reject(new Error(`Error loading video: ${error}`));
                    };

                    // Limpiar event listeners previos
                    videoElement.onloadedmetadata = null;
                    videoElement.onerror = null;

                    videoElement.onloadedmetadata = onLoadedMetadata;
                    videoElement.onerror = onError;

                    // Si ya está listo, resolver inmediatamente
                    if (videoElement.readyState >= 1) {
                        addDebugMessage('info', 'Video ya estaba listo, resolviendo inmediatamente');
                        onLoadedMetadata();
                    }
                });

                // Intentar reproducir el video con mejor manejo
                try {
                    addDebugMessage('info', 'Intentando reproducir video...');
                    const playPromise = videoElement.play();

                    if (playPromise !== undefined) {
                        await playPromise;
                        addDebugMessage('info', 'Video playback started successfully');
                        addDebugMessage('info', `Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                        addDebugMessage('info', `Video element dimensions: ${videoElement.offsetWidth}x${videoElement.offsetHeight}`);
                    } else {
                        addDebugMessage('warn', 'Play promise undefined - video may autoplay');
                    }
                } catch (playError) {
                    addDebugMessage('error', `Error starting video playback: ${playError.name} - ${playError.message}`);

                    // Intentar solución alternativa para móviles
                    if (isMobile) {
                        addDebugMessage('info', 'Intentando solución móvil: mostrar mensaje de interacción requerida');
                        updateScannerStatus('⚠️ Toca la pantalla para activar la cámara', 'error');

                        // Agregar event listener para reintentar al tocar
                        const retryPlay = async () => {
                            try {
                                await videoElement.play();
                                addDebugMessage('info', 'Video playback exitoso después de interacción');
                                updateScannerStatus('🔍 Escaneando... Apunta al código de barras', 'scanning');
                                videoElement.removeEventListener('touchstart', retryPlay);
                                videoElement.removeEventListener('click', retryPlay);
                            } catch (retryError) {
                                addDebugMessage('error', `Error en reintento: ${retryError.message}`);
                            }
                        };

                        videoElement.addEventListener('touchstart', retryPlay, { once: true });
                        videoElement.addEventListener('click', retryPlay, { once: true });
                    } else {
                        // Para desktop, mostrar opciones de solución
                        showErrorWithRecovery(
                            '❌ Error reproduciendo video',
                            [
                                '🔄 Haz clic en "Reintentar" para intentarlo nuevamente',
                                '⚙️ Verifica que no haya otras aplicaciones usando la cámara',
                                '🌐 Intenta con otro navegador (Chrome recomendado)',
                                '📝 Usa la opción de ingreso manual abajo'
                            ]
                        );
                    }
                }

            } catch (streamError) {
                addDebugMessage('error', `Error asignando stream al video: ${streamError.message}`);
                throw streamError;
            }
        } catch (constraintError) {
            addDebugMessage('warn', `Error aplicando restricciones, usando configuración básica: ${constraintError.message}`);
            // Fallback a configuración básica
        }

        // Esperar a que el video esté completamente listo antes de iniciar ZXing
        await new Promise((resolve, reject) => {
            const checkVideoReady = () => {
                if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    addDebugMessage('info', `Video listo para ZXing: ${videoElement.videoWidth}x${videoElement.videoHeight}, readyState: ${videoElement.readyState}`);
                    resolve();
                } else {
                    addDebugMessage('info', `Esperando video... readyState: ${videoElement.readyState}, dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                }
            };

            // Verificar inmediatamente
            checkVideoReady();

            // Si no está listo, esperar eventos
            if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
                const onLoadedData = () => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    checkVideoReady();
                    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
                        resolve();
                    } else {
                        reject(new Error('Video no se cargó correctamente después de loadeddata'));
                    }
                };

                const onError = (error) => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    reject(new Error(`Error cargando video: ${error}`));
                };

                const timeout = setTimeout(() => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    reject(new Error('Timeout esperando video listo para ZXing'));
                }, 5000);

                videoElement.addEventListener('loadeddata', onLoadedData);
                videoElement.addEventListener('error', onError);
            }
        });

        // Verificar que el video element esté completamente preparado
        if (!videoElement || !videoElement.srcObject) {
            throw new Error('Video element no está preparado correctamente para ZXing');
        }

        addDebugMessage('info', 'Iniciando ZXing decodeFromVideoDevice...');

        // Iniciar el escaneo con ZXing con manejo de errores mejorado
        try {
            await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
                if (result) {
                    const code = result.getText();

                    // Validar que sea EAN-8 o EAN-13 válido
                    if (!isValidBarcode(code)) {
                        console.log('Código detectado pero no es EAN-8 o EAN-13 válido:', code);
                        return;
                    }

                    // Para desktop: permitir escaneos del mismo código para incrementar cantidad
                    // Solo evitar escaneos duplicados en móvil con WebSocket
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                    if (isMobile && isWsConnected) {
                        // En móvil con WebSocket: evitar duplicados
                        if (lastScannedCode === code) {
                            return;
                        }
                    }

                    lastScannedCode = code;

                    // Limpiar timeout anterior
                    if (scanTimeout) {
                        clearTimeout(scanTimeout);
                    }

                    console.log('Código EAN detectado:', code);
                    addDebugMessage('info', `Código detectado: ${code}`);

                    // Reproducir beep de confirmación
                    playBeep();

                    if (isMobile && isWsConnected) {
                        // En móvil: enviar vía WebSocket
                        console.log(`📱 [TELÉFONO] Código detectado: ${code} - Enviando vía WebSocket`);
                        addDebugMessage('info', `Enviando código desde móvil vía WebSocket: ${code}`);
                        const sent = sendBarcodeViaWebSocket(code);

                        if (sent) {
                            console.log(`📱 [TELÉFONO] Código enviado exitosamente vía WebSocket: ${code}`);
                            updateScannerStatus(`📤 Código enviado: ${code}`, 'success');

                            // No detener escaneo - permitir escanear múltiples códigos
                            // Resetear lastScannedCode después de un tiempo
                            scanTimeout = setTimeout(() => {
                                console.log(`📱 [TELÉFONO] Timeout completado - listo para nuevo escaneo`);
                                lastScannedCode = null;
                                if (!isScanning) {
                                    updateScannerStatus('🔍 Listo para escanear otro código', 'scanning');
                                }
                            }, 3000);
                        } else {
                            console.log(`📱 [TELÉFONO] ERROR enviando código vía WebSocket: ${code}`);
                            updateScannerStatus(`❌ Error enviando código: ${code}`, 'error');
                            // Detener escaneo en caso de error
                            await stopScanning();
                        }
                    } else {
                        // En desktop: procesar localmente (permitir múltiples escaneos del mismo código)
                        console.log(`💻 [DESKTOP] Procesando código localmente: ${code}`);
                        addDebugMessage('info', `Procesando código localmente: ${code}`);

                        // Buscar el producto (no detener escaneo)
                        searchProductByBarcode(code);

                        // Resetear lastScannedCode después de un tiempo para permitir re-escaneo
                        scanTimeout = setTimeout(() => {
                            console.log(`💻 [DESKTOP] Timeout completado - listo para nuevo escaneo`);
                            lastScannedCode = null;
                            if (!isScanning) {
                                updateScannerStatus('🔍 Listo para escanear otro código', 'scanning');
                            }
                        }, 1000); // Más corto para desktop para permitir incrementos rápidos
                    }
                }

                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error('Error durante el escaneo:', err);
                    addDebugMessage('error', `Error de escaneo: ${err.message}`);

                    // Si es el error específico de setAttribute, intentar solución
                    if (err.message && err.message.includes('setAttribute')) {
                        addDebugMessage('error', 'Error de setAttribute detectado - intentando recuperación automática');
                        // Intentar resetear el video element
                        try {
                            videoElement.load();
                            setTimeout(() => {
                                if (isScanning) {
                                    updateScannerStatus('🔄 Recuperando de error de video...', 'scanning');
                                }
                            }, 1000);
                        } catch (resetError) {
                            addDebugMessage('error', `Error en recuperación: ${resetError.message}`);
                        }
                    }
                }
            });

            addDebugMessage('info', 'ZXing decodeFromVideoDevice iniciado exitosamente');
    
            // Resetear contador de fallos en caso de éxito
            cameraFailureCount = 0;
            addDebugMessage('info', 'Contador de fallos de cámara reseteado por éxito');
        } catch (zxingError) {
            addDebugMessage('error', `Error iniciando ZXing: ${zxingError.message}`);
            console.error('Error iniciando ZXing:', zxingError);

            // Incrementar contador de fallos
            cameraFailureCount++;
            addDebugMessage('warn', `Contador de fallos de cámara: ${cameraFailureCount}/${maxCameraFailures}`);

            // Manejo específico del error de setAttribute
            if (zxingError.message && zxingError.message.includes('setAttribute')) {
                updateScannerStatus('❌ Error preparando elemento de video. Intenta recargar la página.', 'error');
                addDebugMessage('error', 'Error de setAttribute en prepareVideoElement - posible problema de compatibilidad');
            } else {
                updateScannerStatus(`❌ Error iniciando escáner: ${zxingError.message}`, 'error');
            }

            // Verificar si activar fallback automático
            if (cameraFailureCount >= maxCameraFailures && !manualFallbackEnabled) {
                manualFallbackEnabled = true;
                addDebugMessage('warn', `Activando fallback automático después de ${cameraFailureCount} fallos`);
                enableManualFallback();
            }

            // Detener escaneo en caso de error crítico
            isScanning = false;
            document.getElementById('start-scan-btn').style.display = 'inline-block';
            document.getElementById('stop-scan-btn').style.display = 'none';
            return;
        }

        addDebugMessage('info', 'ZXing escaneo iniciado correctamente');

        // Verificar que el video se esté mostrando correctamente con intervalo mejorado
        let checkVideoAttempts = 0;
        const checkVideoInterval = setInterval(() => {
            if (videoElement) {
                const computedStyle = window.getComputedStyle(videoElement);
                const videoInfo = {
                    elementDimensions: `${videoElement.offsetWidth} x ${videoElement.offsetHeight}`,
                    videoDimensions: `${videoElement.videoWidth} x ${videoElement.videoHeight}`,
                    readyState: videoElement.readyState,
                    paused: videoElement.paused,
                    ended: videoElement.ended,
                    currentTime: videoElement.currentTime,
                    srcObject: !!videoElement.srcObject,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    hasStream: !!(videoElement.srcObject && videoElement.srcObject.getVideoTracks().length > 0)
                };

                addDebugMessage('info', `Estado del video (intento ${checkVideoAttempts + 1}): ${JSON.stringify(videoInfo)}`);

                // Verificar si el video está funcionando
                const isVideoWorking = videoElement.videoWidth > 0 &&
                                      videoElement.videoHeight > 0 &&
                                      !videoElement.paused &&
                                      videoElement.readyState >= 2;

                if (isVideoWorking) {
                    clearInterval(checkVideoInterval);
                    addDebugMessage('info', `✅ Video funcionando correctamente: ${videoElement.videoWidth} x ${videoElement.videoHeight}`);
                    updateScannerStatus('🔍 Escaneando... Apunta al código de barras', 'scanning');
                } else if (checkVideoAttempts++ > 15) { // Aumentado a 15 intentos (7.5 segundos)
                    clearInterval(checkVideoInterval);
                    addDebugMessage('error', `❌ Video no funciona después de ${checkVideoAttempts} intentos`);

                    // Diagnóstico detallado del problema
                    const diagnosis = diagnoseVideoProblem(videoElement, isMobile);
                    addDebugMessage('error', `Diagnóstico: ${diagnosis.message}`);

                    // Intentar soluciones automáticas
                    if (diagnosis.canFix) {
                        addDebugMessage('info', 'Intentando solución automática...');
                        const fixed = tryAutoFixVideo(videoElement, diagnosis, isMobile);
                        if (fixed) {
                            addDebugMessage('info', 'Solución automática aplicada, reintentando...');
                            setTimeout(() => {
                                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                                    updateScannerStatus('🔍 Escaneando... Apunta al código de barras', 'scanning');
                                } else {
                                    showVideoErrorSolution(diagnosis, isMobile);
                                }
                            }, 2000);
                            return;
                        }
                    }

                    // Mostrar mensaje de error con soluciones
                    showVideoErrorSolution(diagnosis, isMobile);
                }
            } else {
                clearInterval(checkVideoInterval);
                addDebugMessage('error', 'Elemento video no encontrado durante verificación');
            }
        }, 500);

    } catch (error) {
        console.error('Error accediendo a cámara:', error);
        let errorMessage = '❌ Error al acceder a la cámara';
        let recoveryOptions = [];

        if (error.name === 'NotAllowedError') {
            errorMessage = '❌ Permiso de cámara denegado';
            recoveryOptions = [
                '🔄 Haz clic en "Reintentar" para solicitar permisos nuevamente',
                '⚙️ Ve a configuración del navegador > Privacidad > Cámara > Permitir',
                '🔄 Recarga la página e intenta nuevamente',
                '📝 Usa la opción de ingreso manual abajo como alternativa'
            ];
        } else if (error.name === 'NotFoundError') {
            errorMessage = '❌ No se encontró cámara en el dispositivo';
            recoveryOptions = [
                '📷 Conecta una cámara externa o webcam',
                '🔍 Verifica que la cámara no esté siendo usada por otra aplicación',
                '📱 Si usas móvil, verifica que la app de cámara no esté abierta',
                '📝 Usa la opción de ingreso manual abajo'
            ];
        } else if (error.name === 'NotReadableError') {
            errorMessage = '❌ La cámara está siendo usada por otra aplicación';
            recoveryOptions = [
                '❌ Cierra otras aplicaciones que usen la cámara (Zoom, Meet, etc.)',
                '⏳ Espera unos segundos y haz clic en "Reintentar"',
                '🔄 Reinicia el navegador si el problema persiste',
                '📝 Usa la opción de ingreso manual como alternativa'
            ];
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '❌ Configuración de cámara no soportada';
            recoveryOptions = [
                '⚙️ Cambia la configuración de cámara en el botón "Configuración"',
                '🌐 Intenta con un navegador diferente (Chrome recomendado)',
                '⬆️ Actualiza tu navegador a la versión más reciente',
                '📝 Usa la opción de ingreso manual'
            ];
        } else if (error.name === 'AbortError') {
            errorMessage = '❌ Acceso a cámara cancelado';
            recoveryOptions = [
                '🔄 Haz clic en "Reintentar" para intentarlo nuevamente',
                '⚠️ Asegúrate de hacer clic en "Permitir" cuando aparezca el mensaje',
                '📝 Usa la opción de ingreso manual si el problema persiste'
            ];
        } else {
            errorMessage = `❌ Error inesperado: ${error.message}`;
            recoveryOptions = [
                '🔄 Recarga la página e intenta nuevamente',
                '🌐 Verifica que estés usando HTTPS o localhost',
                '📝 Usa la opción de ingreso manual como alternativa',
                '🐛 Revisa el panel de debug para más información'
            ];
        }

        addDebugMessage('error', `Error de cámara: ${error.name} - ${error.message}`);
        showErrorWithRecovery(errorMessage, recoveryOptions);
        isScanning = false;

        // Reiniciar controles
        document.getElementById('start-scan-btn').style.display = 'inline-block';
        document.getElementById('start-mobile-scan-btn').style.display = 'inline-block';
        document.getElementById('stop-scan-btn').style.display = 'none';
    }
}

// Función para detener el escaneo
async function stopScanning() {
    if (!isScanning) return;

    isScanning = false;

    try {
        if (codeReader) {
            await codeReader.reset();
            addDebugMessage('info', 'ZXing escaneo detenido');
        }
    } catch (error) {
        addDebugMessage('error', `Error deteniendo escaneo: ${error.message}`);
    }

    updateScannerStatus('⏹️ Escaneo detenido', 'scanning');

    // Reiniciar controles
    document.getElementById('start-scan-btn').style.display = 'inline-block';
    document.getElementById('start-mobile-scan-btn').style.display = 'inline-block';
    document.getElementById('stop-scan-btn').style.display = 'none';

    // Limpiar producto pendiente cuando se detiene el escaneo
    if (pendingProduct) {
        addDebugMessage('info', 'Producto pendiente limpiado al detener escaneo');
        clearPendingProduct();
        document.getElementById('product-result').style.display = 'none';
    }
}

// Función para iniciar escaneo móvil flexible con ZXing
async function startMobileScanning() {
    if (isScanning) return;

    // Verificar compatibilidad
    const cameraSupported = await checkCameraSupport();
    if (!cameraSupported) {
        return;
    }

    isScanning = true;
    lastScannedCode = null;

    // Ocultar resultado anterior
    document.getElementById('product-result').style.display = 'none';

    updateScannerStatus('🔍 Iniciando escaneo móvil flexible...', 'scanning');

    addDebugMessage('info', 'Iniciando escaneo móvil flexible con ZXing - aceptará cualquier código detectado');

    try {
        // Configurar ZXing para usar la cámara con configuración flexible
        const videoElement = document.querySelector('#scanner-video');

        if (!videoElement) {
            throw new Error('Elemento de video no encontrado');
        }

        // Mostrar controles
        document.getElementById('start-scan-btn').style.display = 'none';
        document.getElementById('start-mobile-scan-btn').style.display = 'none';
        document.getElementById('stop-scan-btn').style.display = 'inline-block';

        updateScannerStatus('🔍 Escaneando... Apunta al código (cualquier formato aceptado)', 'scanning');

        // Seleccionar la mejor cámara disponible
        if (!selectedDeviceId) {
            selectedDeviceId = await getBestCameraDevice();
        }

        // Aplicar configuración de video personalizada
        const videoConstraints = getVideoConstraints();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, ...videoConstraints },
                audio: false
            });

            // Aplicar restricciones al stream si es necesario
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && videoTrack.applyConstraints) {
                await videoTrack.applyConstraints(videoConstraints);
                addDebugMessage('info', 'Restricciones aplicadas al stream de video móvil');
            }

            videoElement.srcObject = stream;
            addDebugMessage('info', `Configuración móvil aplicada: ${cameraConfig.preset}`);
        } catch (constraintError) {
            addDebugMessage('warn', `Error aplicando restricciones móviles, usando configuración básica: ${constraintError.message}`);
            // Fallback a configuración básica
        }

        // Esperar a que el video esté completamente listo antes de iniciar ZXing
        await new Promise((resolve, reject) => {
            const checkVideoReady = () => {
                if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    addDebugMessage('info', `Video móvil listo para ZXing: ${videoElement.videoWidth}x${videoElement.videoHeight}, readyState: ${videoElement.readyState}`);
                    resolve();
                } else {
                    addDebugMessage('info', `Esperando video móvil... readyState: ${videoElement.readyState}, dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                }
            };

            // Verificar inmediatamente
            checkVideoReady();

            // Si no está listo, esperar eventos
            if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
                const onLoadedData = () => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    checkVideoReady();
                    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
                        resolve();
                    } else {
                        reject(new Error('Video móvil no se cargó correctamente después de loadeddata'));
                    }
                };

                const onError = (error) => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    reject(new Error(`Error cargando video móvil: ${error}`));
                };

                const timeout = setTimeout(() => {
                    videoElement.removeEventListener('loadeddata', onLoadedData);
                    videoElement.removeEventListener('error', onError);
                    reject(new Error('Timeout esperando video móvil listo para ZXing'));
                }, 5000);

                videoElement.addEventListener('loadeddata', onLoadedData);
                videoElement.addEventListener('error', onError);
            }
        });

        // Verificar que el video element esté completamente preparado
        if (!videoElement || !videoElement.srcObject) {
            throw new Error('Video element móvil no está preparado correctamente para ZXing');
        }

        addDebugMessage('info', 'Iniciando ZXing decodeFromVideoDevice para móvil...');

        // Iniciar el escaneo con ZXing con manejo de errores mejorado
        try {
            await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
                if (result) {
                    const code = result.getText();

                    // Aceptar cualquier código detectado (no validar EAN-13 estricto)
                    if (!code || code.length === 0) {
                        return;
                    }

                    // Evitar detecciones duplicadas en rápida sucesión para móvil
                    if (lastScannedCode === code) {
                        return;
                    }

                    lastScannedCode = code;

                    console.log('Código detectado (móvil flexible):', code);
                    addDebugMessage('info', `Código detectado: ${code}`);

                    // Reproducir beep de confirmación
                    playBeep();

                    // Intentar enviar vía WebSocket primero
                    console.log(`📱 [TELÉFONO FLEXIBLE] Código detectado: ${code} - Intentando enviar vía WebSocket`);
                    if (isWsConnected) {
                        const sent = sendBarcodeViaWebSocket(code);
                        if (sent) {
                            console.log(`📱 [TELÉFONO FLEXIBLE] Código enviado exitosamente vía WebSocket: ${code}`);
                            updateScannerStatus(`📤 Código enviado vía WebSocket: ${code}`, 'success');
                        } else {
                            // Fallback: colocar en input manual
                            console.log(`📱 [TELÉFONO FLEXIBLE] ERROR enviando vía WebSocket, usando fallback manual: ${code}`);
                            updateScannerStatus(`⚠️ Error enviando código, colocado en campo manual: ${code}`, 'error');
                            const manualInput = document.getElementById('manual-barcode');
                            if (manualInput) {
                                manualInput.value = code;
                                manualInput.focus();
                                manualInput.select();
                            }
                        }
                    } else {
                        // Sin WebSocket: colocar en input manual
                        console.log(`📱 [TELÉFONO FLEXIBLE] Sin WebSocket conectado, colocando en campo manual: ${code}`);
                        const manualInput = document.getElementById('manual-barcode');
                        if (manualInput) {
                            manualInput.value = code;
                            manualInput.focus();
                            manualInput.select();
                        }
                        updateScannerStatus(`✅ Código detectado y colocado en campo manual: ${code}`, 'success');
                    }

                    // No detener el escaneo automáticamente - permitir detectar múltiples códigos
                    // El usuario puede hacer clic en "Buscar" cuando esté listo

                    // Limpiar timeout anterior si existe
                    if (scanTimeout) {
                        clearTimeout(scanTimeout);
                    }

                    // Resetear lastScannedCode después de un tiempo para permitir re-escaneo del mismo código
                    scanTimeout = setTimeout(() => {
                        lastScannedCode = null;
                        if (!isScanning) {
                            updateScannerStatus('🔍 Listo para escanear otro código', 'scanning');
                        }
                    }, 3000);
                }

                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error('Error durante el escaneo móvil:', err);
                    addDebugMessage('error', `Error de escaneo móvil: ${err.message}`);

                    // Si es el error específico de setAttribute, intentar solución
                    if (err.message && err.message.includes('setAttribute')) {
                        addDebugMessage('error', 'Error de setAttribute detectado en móvil - intentando recuperación automática');
                        // Intentar resetear el video element
                        try {
                            videoElement.load();
                            setTimeout(() => {
                                if (isScanning) {
                                    updateScannerStatus('🔄 Recuperando de error de video móvil...', 'scanning');
                                }
                            }, 1000);
                        } catch (resetError) {
                            addDebugMessage('error', `Error en recuperación móvil: ${resetError.message}`);
                        }
                    }
                }
            });

            addDebugMessage('info', 'ZXing decodeFromVideoDevice móvil iniciado exitosamente');

            // Resetear contador de fallos en caso de éxito
            cameraFailureCount = 0;
            addDebugMessage('info', 'Contador de fallos de cámara móvil reseteado por éxito');
        } catch (zxingError) {
            addDebugMessage('error', `Error iniciando ZXing móvil: ${zxingError.message}`);
            console.error('Error iniciando ZXing móvil:', zxingError);

            // Incrementar contador de fallos
            cameraFailureCount++;
            addDebugMessage('warn', `Contador de fallos de cámara móvil: ${cameraFailureCount}/${maxCameraFailures}`);

            // Manejo específico del error de setAttribute
            if (zxingError.message && zxingError.message.includes('setAttribute')) {
                updateScannerStatus('❌ Error preparando elemento de video móvil. Intenta recargar la página.', 'error');
                addDebugMessage('error', 'Error de setAttribute en prepareVideoElement móvil - posible problema de compatibilidad');
            } else {
                updateScannerStatus(`❌ Error iniciando escáner móvil: ${zxingError.message}`, 'error');
            }

            // Verificar si activar fallback automático
            if (cameraFailureCount >= maxCameraFailures && !manualFallbackEnabled) {
                manualFallbackEnabled = true;
                addDebugMessage('warn', `Activando fallback automático después de ${cameraFailureCount} fallos`);
                enableManualFallback();
            }

            // Detener escaneo en caso de error crítico
            isScanning = false;
            document.getElementById('start-scan-btn').style.display = 'inline-block';
            document.getElementById('start-mobile-scan-btn').style.display = 'inline-block';
            document.getElementById('stop-scan-btn').style.display = 'none';
            return;
        }

        addDebugMessage('info', 'ZXing escaneo móvil iniciado correctamente');

        // Verificar que el video se esté mostrando
        setTimeout(() => {
            if (videoElement && videoElement.videoWidth > 0) {
                updateScannerStatus('🔍 Escaneando... Apunta al código (cualquier formato aceptado)', 'scanning');
            } else {
                updateScannerStatus('⚠️ Cámara activada pero sin imagen. Intenta refrescar la página.', 'error');
            }
        }, 1500);

    } catch (error) {
        console.error('Error accediendo a cámara para escaneo móvil:', error);
        let errorMessage = '❌ Error al acceder a la cámara';
        let recoveryOptions = [];

        if (error.name === 'NotAllowedError') {
            errorMessage = '❌ Permiso de cámara denegado';
            recoveryOptions = [
                'Toca "Permitir" cuando aparezca el mensaje del navegador',
                'Ve a Ajustes > Privacidad > Cámara y habilita el acceso',
                'Recarga la página e intenta nuevamente'
            ];
        } else if (error.name === 'NotFoundError') {
            errorMessage = '❌ No se encontró cámara en el dispositivo móvil';
            recoveryOptions = [
                'Verifica que tu dispositivo tenga cámara',
                'Cierra otras apps que puedan estar usando la cámara',
                'Usa la opción de ingreso manual abajo'
            ];
        } else if (error.name === 'NotReadableError') {
            errorMessage = '❌ La cámara está siendo usada por otra aplicación';
            recoveryOptions = [
                'Cierra otras aplicaciones que usen la cámara',
                'Reinicia tu dispositivo móvil',
                'Espera unos segundos y reintenta'
            ];
        } else {
            errorMessage = `❌ Error en dispositivo móvil: ${error.message}`;
            recoveryOptions = [
                'Recarga la página e intenta nuevamente',
                'Verifica que tengas una conexión estable',
                'Usa la opción de ingreso manual como alternativa'
            ];
        }

        addDebugMessage('error', `Error de cámara móvil: ${error.message}`);
        showErrorWithRecovery(errorMessage, recoveryOptions);
        isScanning = false;

        // Reiniciar controles
        document.getElementById('start-scan-btn').style.display = 'inline-block';
        document.getElementById('stop-scan-btn').style.display = 'none';
    }
}

// Función para búsqueda manual
function manualSearch() {
    const barcodeInput = document.getElementById('manual-barcode');
    const code = barcodeInput.value.trim();

    if (!code) {
        updateScannerStatus('❌ Ingresa un código de barras', 'error');
        return;
    }

    // Si se abrió desde una ventana padre, no validar EAN-13 estricto, solo enviar el código
    if (window.opener) {
        updateScannerStatus(`✅ Código capturado: ${code}`, 'success');
        window.opener.postMessage({ barcode: code }, '*');
        barcodeInput.value = '';
        // Cerrar la ventana después de un breve delay
        setTimeout(() => {
            window.close();
        }, 1000);
        return;
    }

    if (!isValidBarcode(code)) {
        updateScannerStatus('❌ El código debe ser un EAN-8 (8 dígitos) o EAN-13 (13 dígitos) válido', 'error');
        return;
    }

    // Detener escaneo si está activo
    if (isScanning) {
        stopScanning();
    }

    searchProductByBarcode(code);
    barcodeInput.value = '';
}

// Global error handler para capturar errores de extensiones del navegador
window.addEventListener('error', function(event) {
    // Ignorar errores relacionados con source maps de extensiones
    if (event.filename && event.filename.includes('.map') && event.message && event.message.includes('JSON.parse')) {
        console.warn('Ignorando error de source map de extensión del navegador:', event.message);
        event.preventDefault();
        return false;
    }

    // Log otros errores pero no prevenirlos
    console.error('Error global capturado:', event.error);
});

// Handler para errores de promesas no manejadas
window.addEventListener('unhandledrejection', function(event) {
    // Ignorar rechazos relacionados con source maps
    if (event.reason && event.reason.message && event.reason.message.includes('JSON.parse')) {
        console.warn('Ignorando promesa rechazada de source map:', event.reason.message);
        event.preventDefault();
        return false;
    }

    console.error('Promesa no manejada:', event.reason);
});

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar panel de debug
    initDebugPanel();

    // Cargar configuración de cámara
    loadCameraConfig();

    // Verificar si ZXing está disponible
    if (typeof ZXing === 'undefined') {
        // updateScannerStatus('❌ Error: ZXing no se pudo cargar', 'error');
        addDebugMessage('error', 'ZXing no está disponible');
        return;
    }

    addDebugMessage('info', 'ZXing cargado correctamente');

    // Conectar al WebSocket
    connectWebSocket();

    // Configurar botones
    document.getElementById('start-scan-btn').addEventListener('click', startScanning);
    document.getElementById('start-mobile-scan-btn').addEventListener('click', startMobileScanning);
    document.getElementById('stop-scan-btn').addEventListener('click', stopScanning);
    document.getElementById('manual-search-btn').addEventListener('click', manualSearch);
    document.getElementById('help-btn').addEventListener('click', toggleHelp);
    document.getElementById('debug-btn').addEventListener('click', toggleDebugPanel);

    // Configurar botones de configuración de cámara
    document.getElementById('camera-config-btn').addEventListener('click', showCameraConfigModal);
    document.getElementById('apply-config-btn').addEventListener('click', applyCameraConfig);
    document.getElementById('reset-config-btn').addEventListener('click', resetCameraConfig);
    document.getElementById('close-config-btn').addEventListener('click', hideCameraConfigModal);

    // Cerrar modal al hacer clic fuera
    document.getElementById('camera-config-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideCameraConfigModal();
        }
    });

    // Permitir búsqueda manual con Enter
    document.getElementById('manual-barcode').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            manualSearch();
        }
    });

    // Cargar credenciales de autenticación si existen
    loadAuthFromStorage();

    // Verificar si hay un producto escaneado guardado
    const scannedProduct = sessionStorage.getItem('scannedProduct');
    if (scannedProduct) {
        try {
            const product = JSON.parse(scannedProduct);
            // Verificar que no haya expirado (5 minutos máximo)
            if (Date.now() - product.timestamp < 5 * 60 * 1000) {
                updateScannerStatus(`📦 Producto pendiente: ${product.nombre}`, 'success');
                setTimeout(() => {
                    showProductResult(
                        { id: product.id, nombre: product.nombre, precio: product.precio, codigo: product.codigo, stock_disponible: 1 },
                        { numero_lote: 'N/A', fecha_vencimiento: new Date().toISOString().split('T')[0], estado_vencimiento: 'vigente', dias_para_vencer: 30 },
                        'MANUAL'
                    );
                }, 1000);
            }
            sessionStorage.removeItem('scannedProduct');
        } catch (e) {
            console.error('Error procesando producto escaneado guardado:', e);
            sessionStorage.removeItem('scannedProduct');
        }
    }

    // Mostrar aviso específico para móviles
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        const mobileNotice = document.getElementById('mobile-notice');
        if (mobileNotice) {
            mobileNotice.style.display = 'block';
        }

        // Mejorar la sección de ingreso manual para móviles
        const manualSection = document.querySelector('.manual-input');
        if (manualSection) {
            manualSection.style.border = '2px solid #007bff';
            manualSection.style.background = '#f8f9ff';
            manualSection.innerHTML = `
                <h3>🔢 Ingreso Manual de Código</h3>
                <p style="color: #007bff; font-weight: bold;">💡 Recomendado para dispositivos móviles</p>
                <p>Ingresa el código EAN-13 que aparece en el producto:</p>
                <input type="text" id="manual-barcode" placeholder="Ejemplo: 12345678 o 1234567890123" maxlength="13" inputmode="numeric" pattern="[0-9]*">
                <button id="manual-search-btn" style="background: #007bff; color: white; font-weight: bold;">🔍 Buscar Producto</button>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    El código EAN-8 tiene 8 dígitos y EAN-13 tiene 13 dígitos numéricos.
                </p>
            `;
        }
    }

    // Inicializar estado - iniciar escaneo automáticamente
    // updateScannerStatus('🔍 Haz clic en "Iniciar Escaneo" para comenzar', 'scanning');
    // Iniciar escaneo automáticamente al cargar la página
    setTimeout(() => {
        startScanning();
    }, 1000);
});

// Función para diagnosticar problemas del video
function diagnoseVideoProblem(videoElement, isMobile) {
    const diagnosis = {
        problem: 'unknown',
        message: 'Problema desconocido',
        canFix: false,
        solutions: []
    };

    // Verificar si hay stream asignado
    if (!videoElement.srcObject) {
        diagnosis.problem = 'no_stream';
        diagnosis.message = 'No hay stream asignado al elemento video';
        diagnosis.canFix = false;
        diagnosis.solutions = [
            'Verificar que los permisos de cámara fueron concedidos',
            'Recargar la página e intentar nuevamente',
            'Verificar que la cámara no esté siendo usada por otra aplicación'
        ];
        return diagnosis;
    }

    // Verificar tracks de video
    const videoTracks = videoElement.srcObject.getVideoTracks();
    if (videoTracks.length === 0) {
        diagnosis.problem = 'no_video_tracks';
        diagnosis.message = 'El stream no contiene tracks de video';
        diagnosis.canFix = false;
        diagnosis.solutions = [
            'Verificar que el dispositivo tenga cámara',
            'Intentar con otra configuración de cámara',
            'Usar la opción de ingreso manual'
        ];
        return diagnosis;
    }

    // Verificar si el track está activo
    const videoTrack = videoTracks[0];
    if (!videoTrack.enabled) {
        diagnosis.problem = 'track_disabled';
        diagnosis.message = 'El track de video está deshabilitado';
        diagnosis.canFix = true;
        diagnosis.solutions = [
            'Rehabilitar el track de video',
            'Reinicializar la cámara'
        ];
        return diagnosis;
    }

    // Verificar dimensiones del video
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        diagnosis.problem = 'no_video_dimensions';
        diagnosis.message = 'El video no tiene dimensiones válidas';
        diagnosis.canFix = true;
        diagnosis.solutions = [
            'Esperar más tiempo a que el video se inicialice',
            'Forzar recarga del elemento video',
            'Verificar restricciones de video aplicadas'
        ];
        return diagnosis;
    }

    // Verificar si el video está pausado
    if (videoElement.paused) {
        diagnosis.problem = 'video_paused';
        diagnosis.message = 'El video está pausado';
        diagnosis.canFix = true;
        diagnosis.solutions = [
            'Intentar reproducir el video nuevamente',
            isMobile ? 'Tocar la pantalla para activar la reproducción' : 'Verificar políticas de autoplay'
        ];
        return diagnosis;
    }

    // Verificar estado de reproducción
    if (videoElement.readyState < 2) {
        diagnosis.problem = 'video_not_ready';
        diagnosis.message = `Video no está listo (readyState: ${videoElement.readyState})`;
        diagnosis.canFix = true;
        diagnosis.solutions = [
            'Esperar a que el video termine de cargar',
            'Verificar conexión de red',
            'Reinicializar el stream de video'
        ];
        return diagnosis;
    }

    // Verificar visibilidad del elemento
    const computedStyle = window.getComputedStyle(videoElement);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
        diagnosis.problem = 'element_hidden';
        diagnosis.message = 'El elemento video está oculto';
        diagnosis.canFix = true;
        diagnosis.solutions = [
            'Hacer visible el elemento video',
            'Verificar estilos CSS aplicados'
        ];
        return diagnosis;
    }

    diagnosis.message = 'Video parece estar funcionando, pero no se muestra imagen';
    diagnosis.canFix = false;
    diagnosis.solutions = [
        'Verificar que la cámara esté enfocada correctamente',
        'Limpiar lente de la cámara',
        'Intentar con otra configuración de video',
        'Usar la opción de ingreso manual'
    ];

    return diagnosis;
}

// Función para intentar arreglos automáticos
function tryAutoFixVideo(videoElement, diagnosis, isMobile) {
    let fixed = false;

    switch (diagnosis.problem) {
        case 'track_disabled':
            try {
                const videoTracks = videoElement.srcObject.getVideoTracks();
                videoTracks.forEach(track => {
                    track.enabled = true;
                });
                addDebugMessage('info', 'Track de video rehabilitado');
                fixed = true;
            } catch (error) {
                addDebugMessage('error', `Error rehabilitando track: ${error.message}`);
            }
            break;

        case 'video_paused':
            try {
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        addDebugMessage('info', 'Video reproducido automáticamente');
                    }).catch(error => {
                        addDebugMessage('error', `Error reproduciendo video: ${error.message}`);
                    });
                }
                fixed = true;
            } catch (error) {
                addDebugMessage('error', `Error en play(): ${error.message}`);
            }
            break;

        case 'element_hidden':
            try {
                videoElement.style.display = 'block';
                videoElement.style.visibility = 'visible';
                videoElement.style.opacity = '1';
                addDebugMessage('info', 'Elemento video hecho visible');
                fixed = true;
            } catch (error) {
                addDebugMessage('error', `Error haciendo visible el elemento: ${error.message}`);
            }
            break;

        case 'no_video_dimensions':
            try {
                // Forzar recarga del elemento
                videoElement.load();
                addDebugMessage('info', 'Elemento video recargado');
                fixed = true;
            } catch (error) {
                addDebugMessage('error', `Error recargando video: ${error.message}`);
            }
            break;
    }

    return fixed;
}

// Función para mostrar soluciones de error de video
function showVideoErrorSolution(diagnosis, isMobile) {
    const solutions = diagnosis.solutions || [];

    if (isMobile) {
        updateScannerStatus('📱 Problema con la cámara móvil. Usa ingreso manual.', 'error');
    } else {
        showErrorWithRecovery(
            `❌ ${diagnosis.message}`,
            solutions.concat([
                '🔄 Haz clic en "Reintentar" para intentarlo nuevamente',
                '⚙️ Cambia la configuración de cámara en el botón "Configuración"',
                '🌐 Intenta con otro navegador (Chrome recomendado)',
                '📝 Usa la opción de ingreso manual abajo'
            ])
        );
    }

    // Resaltar sección de ingreso manual
    const manualSection = document.querySelector('.manual-input');
    if (manualSection) {
        manualSection.style.border = '3px solid #ffc107';
        manualSection.style.background = '#fff3cd';
        manualSection.style.padding = '20px';
        manualSection.scrollIntoView({ behavior: 'smooth' });

        // Enfocar el campo de entrada
        const inputField = document.getElementById('manual-barcode');
        if (inputField) {
            setTimeout(() => inputField.focus(), 500);
        }
    }
}

// Función para fallback automático a modo manual después de múltiples fallos
function enableManualFallback() {
    addDebugMessage('info', 'Activando fallback automático a modo manual');

    // Ocultar controles de escaneo automático
    document.getElementById('start-scan-btn').style.display = 'none';
    document.getElementById('start-mobile-scan-btn').style.display = 'none';
    document.getElementById('stop-scan-btn').style.display = 'none';
    document.getElementById('camera-config-btn').style.display = 'none';

    // Mostrar mensaje de fallback
    updateScannerStatus('📝 Modo manual activado automáticamente. Ingresa códigos manualmente.', 'error');

    // Resaltar y enfocar la sección manual
    const manualSection = document.querySelector('.manual-input');
    if (manualSection) {
        manualSection.style.border = '3px solid #28a745';
        manualSection.style.background = '#d4edda';
        manualSection.style.padding = '20px';
        manualSection.scrollIntoView({ behavior: 'smooth' });

        // Agregar mensaje explicativo
        const existingH3 = manualSection.querySelector('h3');
        if (existingH3 && !existingH3.textContent.includes('FALLBACK')) {
            existingH3.innerHTML = '🔄 MODO MANUAL (Fallback Automático)';
            existingH3.style.color = '#155724';
        }

        // Enfocar el campo de entrada
        const inputField = document.getElementById('manual-barcode');
        if (inputField) {
            inputField.placeholder = 'Ingresa código EAN-8 o EAN-13 (modo fallback)';
            setTimeout(() => inputField.focus(), 500);
        }
    }

    // Agregar botón para intentar reactivar escaneo automático
    const controlsDiv = document.querySelector('.scanner-controls');
    if (controlsDiv) {
        const retryBtn = document.createElement('button');
        retryBtn.id = 'retry-auto-scan-btn';
        retryBtn.className = 'btn btn-info';
        retryBtn.innerHTML = '🔄 Reintentar Escaneo Automático';
        retryBtn.style.background = '#17a2b8';
        retryBtn.style.marginLeft = '10px';
        retryBtn.onclick = () => {
            // Resetear estado
            document.getElementById('start-scan-btn').style.display = 'inline-block';
            document.getElementById('start-mobile-scan-btn').style.display = 'inline-block';
            document.getElementById('camera-config-btn').style.display = 'inline-block';

            // Restaurar estilos de sección manual
            const manualSection = document.querySelector('.manual-input');
            if (manualSection) {
                manualSection.style.border = '1px solid #dee2e6';
                manualSection.style.background = '#f8f9fa';
                manualSection.style.padding = '15px';
                const h3 = manualSection.querySelector('h3');
                if (h3) {
                    h3.innerHTML = '🔢 Ingreso Manual';
                    h3.style.color = 'inherit';
                }
                const inputField = document.getElementById('manual-barcode');
                if (inputField) {
                    inputField.placeholder = 'Ingresa código EAN-8 o EAN-13';
                }
            }

            // Remover botón de retry
            retryBtn.remove();

            // Resetear estado del escáner - iniciar automáticamente
            // updateScannerStatus('🔍 Haz clic en "Iniciar Escaneo" para comenzar', 'scanning');
            // Iniciar escaneo automáticamente después de reintentar
            setTimeout(() => {
                startScanning();
            }, 500);
        };
        controlsDiv.appendChild(retryBtn);
    }
}

// Función de diagnóstico global para consola
window.diagnoseCamera = function() {
    console.log('🔍 === DIAGNÓSTICO DE CÁMARA ===');

    const videoElement = document.querySelector('#scanner-video');
    if (!videoElement) {
        console.error('❌ Elemento video no encontrado');
        return;
    }

    const diagnosis = diagnoseVideoProblem(videoElement, /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('📋 Diagnóstico:', diagnosis);

    // Mostrar información adicional
    console.log('📊 Información del video:', {
        dimensions: `${videoElement.offsetWidth}x${videoElement.offsetHeight}`,
        videoSize: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        srcObject: !!videoElement.srcObject,
        hasTracks: videoElement.srcObject ? videoElement.srcObject.getVideoTracks().length : 0
    });

    console.log('🔧 Soluciones sugeridas:', diagnosis.solutions);
    console.log('🔍 === FIN DIAGNÓSTICO ===');
};

// Limpiar al salir de la página
window.addEventListener('beforeunload', async function() {
    if (isScanning && codeReader) {
        try {
            await codeReader.reset();
        } catch (error) {
            console.error('Error limpiando ZXing:', error);
        }
    }
    // Desconectar WebSocket
    disconnectWebSocket();
});