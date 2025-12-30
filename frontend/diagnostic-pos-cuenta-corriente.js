/**
 * Script de diagnóstico para el POS - Cuenta Corriente
 * Este script se carga automáticamente en el POS y realiza validaciones
 * para detectar problemas con el manejo de pagos en cuenta corriente.
 */

(function() {
    'use strict';

    // Configuración
    const API_BASE = window.API_BASE || 'http://localhost:3000/api';
    const DEBUG = true;

    // Variables de estado
    let diagnosticResults = [];
    let isRunning = false;

    /**
     * Inicializa el script de diagnóstico
     */
    function init() {
        if (isRunning) {
            console.log('⚠️ Diagnóstico ya está en ejecución');
            return;
        }

        isRunning = true;
        console.log('🔍 Iniciando diagnóstico del POS - Cuenta Corriente...');

        // Ejecutar diagnósticos
        runDiagnostics();
    }

    /**
     * Ejecuta todos los diagnósticos
     */
    function runDiagnostics() {
        diagnosticResults = [];

        log('📋 Iniciando diagnóstico del POS - Cuenta Corriente');

        // Diagnóstico 1: Verificar conexión con el backend
        checkBackendConnection()
            .then(() => checkClientsEndpoint())
            .then(() => checkFrontendElements())
            .then(() => checkEventHandlers())
            .then(() => checkPaymentLogic())
            .then(() => generateReport())
            .catch(error => {
                log(`❌ Error en el diagnóstico: ${error.message}`, 'error');
                generateReport();
            });
    }

    /**
     * Diagnóstico 1: Verificar conexión con el backend
     */
    async function checkBackendConnection() {
        log('📡 Verificando conexión con el backend...');

        try {
            const response = await fetch(`${API_BASE}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                log('✅ Conexión con backend exitosa');
                diagnosticResults.push({
                    test: 'Conexión Backend',
                    status: 'success',
                    message: 'El backend está respondiendo correctamente'
                });
            } else {
                throw new Error(`Backend respondió con estado ${response.status}`);
            }
        } catch (error) {
            log(`❌ Error de conexión con backend: ${error.message}`, 'error');
            diagnosticResults.push({
                test: 'Conexión Backend',
                status: 'error',
                message: `No se puede conectar al backend: ${error.message}`
            });
        }
    }

    /**
     * Diagnóstico 2: Verificar endpoint de clientes
     */
    async function checkClientsEndpoint() {
        log('👥 Verificando endpoint de clientes...');

        try {
            const response = await fetch(`${API_BASE}/customers`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const clients = await response.json();
                log(`✅ Endpoint de clientes funciona. Clientes encontrados: ${clients.length}`);

                diagnosticResults.push({
                    test: 'Endpoint Clientes',
                    status: 'success',
                    message: `Se obtuvieron ${clients.length} clientes correctamente`
                });

                // Verificar si hay clientes con deudas
                const clientsWithDebts = clients.filter(client => client.deuda && client.deuda > 0);
                if (clientsWithDebts.length > 0) {
                    log(`✅ Se encontraron ${clientsWithDebts.length} clientes con deudas`);
                    diagnosticResults.push({
                        test: 'Clientes con Deudas',
                        status: 'success',
                        message: `Hay ${clientsWithDebts.length} clientes con deudas registradas`
                    });
                } else {
                    log('⚠️ No se encontraron clientes con deudas registradas');
                    diagnosticResults.push({
                        test: 'Clientes con Deudas',
                        status: 'warning',
                        message: 'No se encontraron clientes con deudas registradas'
                    });
                }
            } else {
                throw new Error(`Endpoint de clientes respondió con estado ${response.status}`);
            }
        } catch (error) {
            log(`❌ Error al verificar endpoint de clientes: ${error.message}`, 'error');
            diagnosticResults.push({
                test: 'Endpoint Clientes',
                status: 'error',
                message: `No se puede acceder al endpoint de clientes: ${error.message}`
            });
        }
    }

    /**
     * Diagnóstico 3: Verificar elementos del frontend
     */
    function checkFrontendElements() {
        log('🔍 Verificando elementos del frontend...');

        // Verificar si existe el checkbox de cuenta corriente
        const cuentaCorrienteCheckbox = document.querySelector('#cuentaCorriente');
        if (cuentaCorrienteCheckbox) {
            log('✅ Checkbox de cuenta corriente encontrado');
            diagnosticResults.push({
                test: 'Checkbox Cuenta Corriente',
                status: 'success',
                message: 'El checkbox de cuenta corriente está presente'
            });

            // Verificar si está deshabilitado inicialmente
            if (cuentaCorrienteCheckbox.disabled) {
                log('✅ Checkbox de cuenta corriente está deshabilitado inicialmente');
                diagnosticResults.push({
                    test: 'Estado Inicial Checkbox',
                    status: 'success',
                    message: 'El checkbox de cuenta corriente está deshabilitado inicialmente'
                });
            } else {
                log('⚠️ Checkbox de cuenta corriente no está deshabilitado inicialmente');
                diagnosticResults.push({
                    test: 'Estado Inicial Checkbox',
                    status: 'warning',
                    message: 'El checkbox de cuenta corriente no está deshabilitado inicialmente'
                });
            }
        } else {
            log('❌ No se encontró el checkbox de cuenta corriente');
            diagnosticResults.push({
                test: 'Checkbox Cuenta Corriente',
                status: 'error',
                message: 'No se encontró el checkbox de cuenta corriente en el DOM'
            });
        }

        // Verificar si existe el selector de cliente
        const clientSelect = document.querySelector('#clientSelect');
        if (clientSelect) {
            log('✅ Selector de cliente encontrado');
            diagnosticResults.push({
                test: 'Selector de Cliente',
                status: 'success',
                message: 'El selector de cliente está presente'
            });

            // Verificar si tiene opciones
            if (clientSelect.options.length > 0) {
                log(`✅ Selector de cliente tiene ${clientSelect.options.length} opciones`);
                diagnosticResults.push({
                    test: 'Opciones del Selector',
                    status: 'success',
                    message: `El selector de cliente tiene ${clientSelect.options.length} opciones`
                });
            } else {
                log('⚠️ Selector de cliente no tiene opciones');
                diagnosticResults.push({
                    test: 'Opciones del Selector',
                    status: 'warning',
                    message: 'El selector de cliente no tiene opciones'
                });
            }
        } else {
            log('❌ No se encontró el selector de cliente');
            diagnosticResults.push({
                test: 'Selector de Cliente',
                status: 'error',
                message: 'No se encontró el selector de cliente en el DOM'
            });
        }

        // Verificar si existe el botón de pago
        const payBtn = document.querySelector('#payBtn');
        if (payBtn) {
            log('✅ Botón de pago encontrado');
            diagnosticResults.push({
                test: 'Botón de Pago',
                status: 'success',
                message: 'El botón de pago está presente'
            });
        } else {
            log('❌ No se encontró el botón de pago');
            diagnosticResults.push({
                test: 'Botón de Pago',
                status: 'error',
                message: 'No se encontró el botón de pago en el DOM'
            });
        }

        // Verificar si existe el carrito
        const cartItems = document.querySelector('#cartItems');
        if (cartItems) {
            log('✅ Contenedor del carrito encontrado');
            diagnosticResults.push({
                test: 'Contenedor del Carrito',
                status: 'success',
                message: 'El contenedor del carrito está presente'
            });
        } else {
            log('❌ No se encontró el contenedor del carrito');
            diagnosticResults.push({
                test: 'Contenedor del Carrito',
                status: 'error',
                message: 'No se encontró el contenedor del carrito en el DOM'
            });
        }
    }

    /**
     * Diagnóstico 4: Verificar manejadores de eventos
     */
    function checkEventHandlers() {
        log('🖱️ Verificando manejadores de eventos...');

        // Verificar si existe la función de pago
        if (typeof handlePayment === 'function') {
            log('✅ Función handlePayment encontrada');
            diagnosticResults.push({
                test: 'Función handlePayment',
                status: 'success',
                message: 'La función handlePayment está definida'
            });
        } else {
            log('❌ No se encontró la función handlePayment');
            diagnosticResults.push({
                test: 'Función handlePayment',
                status: 'error',
                message: 'No se encontró la función handlePayment'
            });
        }

        // Verificar si existe la función de actualización del carrito
        if (typeof updateCartDisplay === 'function') {
            log('✅ Función updateCartDisplay encontrada');
            diagnosticResults.push({
                test: 'Función updateCartDisplay',
                status: 'success',
                message: 'La función updateCartDisplay está definida'
            });
        } else {
            log('❌ No se encontró la función updateCartDisplay');
            diagnosticResults.push({
                test: 'Función updateCartDisplay',
                status: 'error',
                message: 'No se encontró la función updateCartDisplay'
            });
        }

        // Verificar eventos del checkbox de cuenta corriente
        const cuentaCorrienteCheckbox = document.querySelector('#cuentaCorriente');
        if (cuentaCorrienteCheckbox) {
            const onclick = cuentaCorrienteCheckbox.onclick;
            if (onclick) {
                log('✅ Checkbox de cuenta corriente tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Checkbox',
                    status: 'success',
                    message: 'El checkbox de cuenta corriente tiene evento onclick asignado'
                });
            } else {
                log('⚠️ Checkbox de cuenta corriente no tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Checkbox',
                    status: 'warning',
                    message: 'El checkbox de cuenta corriente no tiene evento onclick asignado'
                });
            }
        }

        // Verificar eventos del botón de pago
        const payBtn = document.querySelector('#payBtn');
        if (payBtn) {
            const onclick = payBtn.onclick;
            if (onclick) {
                log('✅ Botón de pago tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Pago',
                    status: 'success',
                    message: 'El botón de pago tiene evento onclick asignado'
                });
            } else {
                log('⚠️ Botón de pago no tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Pago',
                    status: 'warning',
                    message: 'El botón de pago no tiene evento onclick asignado'
                });
            }
        }
    }

    /**
     * Diagnóstico 5: Verificar lógica de pagos
     */
    function checkPaymentLogic() {
        log('💳 Verificando lógica de pagos...');

        // Verificar si existe la variable global del carrito
        if (typeof cart !== 'undefined') {
            log('✅ Variable global del carrito existe');
            diagnosticResults.push({
                test: 'Variable Global Carrito',
                status: 'success',
                message: 'La variable global del carrito está definida'
            });

            // Verificar si el carrito tiene items
            if (cart.length > 0) {
                log(`✅ Carrito tiene ${cart.length} items`);
                diagnosticResults.push({
                    test: 'Items en Carrito',
                    status: 'success',
                    message: `El carrito tiene ${cart.length} items`
                });
            } else {
                log('⚠️ Carrito está vacío');
                diagnosticResults.push({
                    test: 'Items en Carrito',
                    status: 'warning',
                    message: 'El carrito está vacío'
                });
            }
        } else {
            log('❌ Variable global del carrito no existe');
            diagnosticResults.push({
                test: 'Variable Global Carrito',
                status: 'error',
                message: 'La variable global del carrito no está definida'
            });
        }

        // Verificar si existe la función de cálculo de totales
        if (typeof calculateTotals === 'function') {
            log('✅ Función calculateTotals encontrada');
            diagnosticResults.push({
                test: 'Función calculateTotals',
                status: 'success',
                message: 'La función calculateTotals está definida'
            });
        } else {
            log('❌ No se encontró la función calculateTotals');
            diagnosticResults.push({
                test: 'Función calculateTotals',
                status: 'error',
                message: 'No se encontró la función calculateTotals'
            });
        }

        // Verificar si existe la función de validación de cuenta corriente
        if (typeof validateCuentaCorriente === 'function') {
            log('✅ Función validateCuentaCorriente encontrada');
            diagnosticResults.push({
                test: 'Función validateCuentaCorriente',
                status: 'success',
                message: 'La función validateCuentaCorriente está definida'
            });
        } else {
            log('❌ No se encontró la función validateCuentaCorriente');
            diagnosticResults.push({
                test: 'Función validateCuentaCorriente',
                status: 'error',
                message: 'No se encontró la función validateCuentaCorriente'
            });
        }
    }

    /**
     * Genera el reporte final del diagnóstico
     */
    function generateReport() {
        log('📊 Generando reporte del diagnóstico...');

        // Actualizar UI con resultados
        if (diagnosticContainer) {
            const content = diagnosticContainer.querySelector('#diagnostic-content');
            content.innerHTML = '';

            // Título
            const title = document.createElement('div');
            title.style.cssText = `
                font-weight: bold;
                color: #17a2b8;
                margin-bottom: 10px;
                font-size: 13px;
            `;
            title.textContent = '🔍 Resultados del Diagnóstico POS';
            content.appendChild(title);

            // Resultados
            diagnosticResults.forEach(result => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 8px;
                    margin-bottom: 8px;
                    border-radius: 6px;
                    border: 1px solid #333;
                    background: ${getStatusColor(result.status)};
                `;
                item.innerHTML = `
                    <strong style="color: ${getStatusTextColor(result.status)};">${getIcon(result.status)} ${result.test}</strong><br>
                    <span style="color: ${getStatusTextColor(result.status)}; opacity: 0.9;">${result.message}</span>
                `;
                content.appendChild(item);
            });

            // Resumen
            const summary = document.createElement('div');
            summary.style.cssText = `
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #333;
                font-size: 11px;
            `;

            const successCount = diagnosticResults.filter(r => r.status === 'success').length;
            const warningCount = diagnosticResults.filter(r => r.status === 'warning').length;
            const errorCount = diagnosticResults.filter(r => r.status === 'error').length;

            summary.innerHTML = `
                <strong>Resumen:</strong><br>
                ✅ Exitosos: ${successCount}<br>
                ⚠️ Advertencias: ${warningCount}<br>
                ❌ Errores: ${errorCount}
            `;
            content.appendChild(summary);

            // Recomendaciones específicas para POS
            if (errorCount > 0 || warningCount > 0) {
                const recommendations = document.createElement('div');
                recommendations.style.cssText = `
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #333;
                    font-size: 11px;
                `;
                recommendations.innerHTML = `
                    <strong>Recomendaciones para POS:</strong><br>
                    • Verifica que el checkbox de cuenta corriente esté presente y funcional<br>
                    • Asegúrate de que el selector de cliente tenga opciones cargadas<br>
                    • Revisa que las funciones handlePayment y updateCartDisplay estén definidas<br>
                    • Confirma que la variable global del carrito esté inicializada<br>
                    • Verifica que las funciones de cálculo y validación estén implementadas
                `;
                content.appendChild(recommendations);
            }
        }

        log('✅ Diagnóstico del POS completado');
        isRunning = false;
    }

    /**
     * Funciones auxiliares
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#ff6b6b' : type === 'warning' ? '#ffd166' : '#17a2b8';

        if (DEBUG) {
            console.log(`[${timestamp}] ${message}`);
        }

    }

    // Iniciar el diagnóstico cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer funciones para uso externo
    window.DiagnosticPOSCuentaCorriente = {
        run: init,
        getResults: () => diagnosticResults
    };

})();