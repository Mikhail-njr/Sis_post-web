/**
 * Script de diagnóstico para el frontend de Clientes - Cuenta Corriente
 * Este script se carga automáticamente en el frontend de clientes y realiza validaciones
 * para detectar problemas con la visualización de deudas de clientes.
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
        console.log('🔍 Iniciando diagnóstico del frontend de Clientes - Cuenta Corriente...');

        // Ejecutar diagnósticos
        runDiagnostics();
    }

    /**
     * Ejecuta todos los diagnósticos
     */
    function runDiagnostics() {
        diagnosticResults = [];

        log('📋 Iniciando diagnóstico del frontend de Clientes - Cuenta Corriente');

        // Diagnóstico 1: Verificar conexión con el backend
        checkBackendConnection()
            .then(() => checkClientsEndpoint())
            .then(() => checkDebtsEndpoint())
            .then(() => checkFrontendElements())
            .then(() => checkEventHandlers())
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
     * Diagnóstico 3: Verificar endpoint de deudas
     */
    async function checkDebtsEndpoint() {
        log('💳 Verificando endpoint de deudas...');

        try {
            const response = await fetch(`${API_BASE}/debts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const debts = await response.json();
                log(`✅ Endpoint de deudas funciona. Deudas encontradas: ${debts.length}`);

                diagnosticResults.push({
                    test: 'Endpoint Deudas',
                    status: 'success',
                    message: `Se obtuvieron ${debts.length} deudas correctamente`
                });

                // Analizar las deudas
                const totalDebt = debts.reduce((sum, debt) => sum + (debt.monto || 0), 0);
                log(`💰 Total de deudas registradas: $${totalDebt.toFixed(2)}`);

                diagnosticResults.push({
                    test: 'Total Deudas',
                    status: 'info',
                    message: `Monto total de deudas: $${totalDebt.toFixed(2)}`
                });

                // Verificar deudas sin cliente asociado
                const debtsWithoutClient = debts.filter(debt => !debt.cliente_id);
                if (debtsWithoutClient.length > 0) {
                    log(`⚠️ Se encontraron ${debtsWithoutClient.length} deudas sin cliente asociado`);
                    diagnosticResults.push({
                        test: 'Deudas Huérfanas',
                        status: 'warning',
                        message: `Hay ${debtsWithoutClient.length} deudas sin cliente asociado`
                    });
                }
            } else {
                throw new Error(`Endpoint de deudas respondió con estado ${response.status}`);
            }
        } catch (error) {
            log(`❌ Error al verificar endpoint de deudas: ${error.message}`, 'error');
            diagnosticResults.push({
                test: 'Endpoint Deudas',
                status: 'error',
                message: `No se puede acceder al endpoint de deudas: ${error.message}`
            });
        }
    }

    /**
     * Diagnóstico 4: Verificar elementos del frontend
     */
    function checkFrontendElements() {
        log('🔍 Verificando elementos del frontend...');

        // Verificar si existe la tabla de clientes
        const clientsTable = document.querySelector('#clientes-table');
        if (clientsTable) {
            log('✅ Tabla de clientes encontrada');
            diagnosticResults.push({
                test: 'Tabla de Clientes',
                status: 'success',
                message: 'La tabla de clientes está presente en el DOM'
            });

            // Verificar si hay filas en la tabla
            const rows = clientsTable.querySelectorAll('tbody tr');
            if (rows.length > 0) {
                log(`✅ Tabla de clientes tiene ${rows.length} filas`);
                diagnosticResults.push({
                    test: 'Filas de Clientes',
                    status: 'success',
                    message: `La tabla tiene ${rows.length} filas de clientes`
                });

                // Verificar columnas de deudas
                rows.forEach((row, index) => {
                    const debtCell = row.querySelector('td:nth-child(6)'); // Columna de deuda
                    if (debtCell) {
                        const debtValue = debtCell.textContent.trim();
                        if (debtValue && debtValue !== '$0,00' && debtValue !== '0' && debtValue !== '') {
                            log(`✅ Cliente ${index + 1} tiene deuda: ${debtValue}`);
                        }
                    }
                });
            } else {
                log('⚠️ La tabla de clientes está vacía');
                diagnosticResults.push({
                    test: 'Filas de Clientes',
                    status: 'warning',
                    message: 'La tabla de clientes está vacía'
                });
            }
        } else {
            log('❌ No se encontró la tabla de clientes');
            diagnosticResults.push({
                test: 'Tabla de Clientes',
                status: 'error',
                message: 'No se encontró la tabla de clientes en el DOM'
            });
        }

        // Verificar si existe el botón de refresco
        const refreshBtn = document.querySelector('#refresh-btn');
        if (refreshBtn) {
            log('✅ Botón de refresco encontrado');
            diagnosticResults.push({
                test: 'Botón de Refresco',
                status: 'success',
                message: 'El botón de refresco está presente'
            });
        } else {
            log('⚠️ No se encontró el botón de refresco');
            diagnosticResults.push({
                test: 'Botón de Refresco',
                status: 'warning',
                message: 'No se encontró el botón de refresco'
            });
        }

        // Verificar si existe el contenedor de deudas
        const debtContainer = document.querySelector('#debt-container');
        if (debtContainer) {
            log('✅ Contenedor de deudas encontrado');
            diagnosticResults.push({
                test: 'Contenedor de Deudas',
                status: 'success',
                message: 'El contenedor de deudas está presente'
            });
        } else {
            log('⚠️ No se encontró el contenedor de deudas');
            diagnosticResults.push({
                test: 'Contenedor de Deudas',
                status: 'warning',
                message: 'No se encontró el contenedor de deudas'
            });
        }
    }

    /**
     * Diagnóstico 5: Verificar manejadores de eventos
     */
    function checkEventHandlers() {
        log('🖱️ Verificando manejadores de eventos...');

        // Verificar si existe la función de carga de clientes
        if (typeof loadClients === 'function') {
            log('✅ Función loadClients encontrada');
            diagnosticResults.push({
                test: 'Función loadClients',
                status: 'success',
                message: 'La función loadClients está definida'
            });
        } else {
            log('❌ No se encontró la función loadClients');
            diagnosticResults.push({
                test: 'Función loadClients',
                status: 'error',
                message: 'No se encontró la función loadClients'
            });
        }

        // Verificar si existe la función de actualización de deudas
        if (typeof updateClientDebt === 'function') {
            log('✅ Función updateClientDebt encontrada');
            diagnosticResults.push({
                test: 'Función updateClientDebt',
                status: 'success',
                message: 'La función updateClientDebt está definida'
            });
        } else {
            log('❌ No se encontró la función updateClientDebt');
            diagnosticResults.push({
                test: 'Función updateClientDebt',
                status: 'error',
                message: 'No se encontró la función updateClientDebt'
            });
        }

        // Verificar eventos del botón de refresco
        const refreshBtn = document.querySelector('#refresh-btn');
        if (refreshBtn) {
            const onclick = refreshBtn.onclick;
            if (onclick) {
                log('✅ Botón de refresco tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Refresh',
                    status: 'success',
                    message: 'El botón de refresco tiene evento onclick asignado'
                });
            } else {
                log('⚠️ Botón de refresco no tiene evento onclick');
                diagnosticResults.push({
                    test: 'Evento onclick Refresh',
                    status: 'warning',
                    message: 'El botón de refresco no tiene evento onclick asignado'
                });
            }
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
            title.textContent = '🔍 Resultados del Diagnóstico Frontend';
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

            // Recomendaciones específicas para frontend
            if (errorCount > 0 || warningCount > 0) {
                const recommendations = document.createElement('div');
                recommendations.style.cssText = `
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #333;
                    font-size: 11px;
                `;
                recommendations.innerHTML = `
                    <strong>Recomendaciones para Frontend:</strong><br>
                    • Verifica que la tabla de clientes tenga la estructura correcta<br>
                    • Asegúrate de que las funciones loadClients y updateClientDebt estén definidas<br>
                    • Revisa los eventos de los botones de refresco<br>
                    • Verifica que el contenedor de deudas esté presente en el DOM<br>
                    • Confirma que las columnas de deudas estén en la posición correcta
                `;
                content.appendChild(recommendations);
            }
        }

        log('✅ Diagnóstico del frontend completado');
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
    window.DiagnosticClientesFrontend = {
        run: init,
        getResults: () => diagnosticResults
    };

})();