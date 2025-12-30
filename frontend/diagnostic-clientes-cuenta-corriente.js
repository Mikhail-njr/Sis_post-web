/**
 * Script de diagnóstico para el dashboard de Clientes - Cuenta Corriente
 * Este script se carga automáticamente en el dashboard y realiza validaciones
 * para detectar problemas con la información de deudas de clientes.
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

        // Obtener el contenedor de diagnóstico
        const diagnosticContainer = document.getElementById('diagnostic-container');

        isRunning = true;
        console.log('🔍 Iniciando diagnóstico de Clientes - Cuenta Corriente...');

        // Ejecutar diagnósticos
        runDiagnostics();
    }

    /**
     * Ejecuta todos los diagnósticos
     */
    function runDiagnostics() {
        diagnosticResults = [];

        log('📋 Iniciando diagnóstico de Clientes - Cuenta Corriente');

        // Diagnóstico 1: Verificar conexión con el backend
        checkBackendConnection()
            .then(() => checkClientsEndpoint())
            .then(() => checkDebtsEndpoint())
            .then(() => checkSalesEndpoint())
            .then(() => checkDataConsistency())
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
     * Diagnóstico 4: Verificar endpoint de ventas
     */
    async function checkSalesEndpoint() {
        log('🧾 Verificando endpoint de ventas...');

        try {
            const response = await fetch(`${API_BASE}/sales`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const sales = await response.json();
                log(`✅ Endpoint de ventas funciona. Ventas encontradas: ${sales.length}`);

                diagnosticResults.push({
                    test: 'Endpoint Ventas',
                    status: 'success',
                    message: `Se obtuvieron ${sales.length} ventas correctamente`
                });

                // Verificar ventas en cuenta corriente
                const creditSales = sales.filter(sale => sale.metodo_pago === 'cuenta_corriente');
                log(`💳 Ventas en cuenta corriente encontradas: ${creditSales.length}`);

                diagnosticResults.push({
                    test: 'Ventas en Cuenta Corriente',
                    status: 'info',
                    message: `Hay ${creditSales.length} ventas registradas en cuenta corriente`
                });

                // Verificar ventas sin cliente asociado
                const salesWithoutClient = creditSales.filter(sale => !sale.cliente_id);
                if (salesWithoutClient.length > 0) {
                    log(`⚠️ Se encontraron ${salesWithoutClient.length} ventas en cuenta corriente sin cliente asociado`);
                    diagnosticResults.push({
                        test: 'Ventas en CC Huérfanas',
                        status: 'warning',
                        message: `Hay ${salesWithoutClient.length} ventas en cuenta corriente sin cliente asociado`
                    });
                }
            } else {
                throw new Error(`Endpoint de ventas respondió con estado ${response.status}`);
            }
        } catch (error) {
            log(`❌ Error al verificar endpoint de ventas: ${error.message}`, 'error');
            diagnosticResults.push({
                test: 'Endpoint Ventas',
                status: 'error',
                message: `No se puede acceder al endpoint de ventas: ${error.message}`
            });
        }
    }

    /**
     * Diagnóstico 5: Verificar consistencia de datos
     */
    async function checkDataConsistency() {
        log('🔍 Verificando consistencia de datos...');

        try {
            // Obtener clientes
            const clientsResponse = await fetch(`${API_BASE}/customers`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const clients = clientsResponse.ok ? await clientsResponse.json() : [];

            // Obtener deudas
            const debtsResponse = await fetch(`${API_BASE}/debts`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const debts = debtsResponse.ok ? await debtsResponse.json() : [];

            // Obtener ventas en cuenta corriente
            const salesResponse = await fetch(`${API_BASE}/sales`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const sales = salesResponse.ok ? await salesResponse.json() : [];
            const creditSales = sales.filter(s => s.metodo_pago === 'cuenta_corriente');

            // Verificar consistencia entre deudas y clientes
            let inconsistencies = [];

            // Deudas sin cliente
            const debtsWithoutClient = debts.filter(debt => !debt.cliente_id || debt.cliente_id === 0);
            if (debtsWithoutClient.length > 0) {
                inconsistencies.push(`Deudas sin cliente asociado: ${debtsWithoutClient.length}`);
            }

            // Ventas en CC sin cliente
            const salesWithoutClient = creditSales.filter(sale => !sale.cliente_id || sale.cliente_id === 0);
            if (salesWithoutClient.length > 0) {
                inconsistencies.push(`Ventas en cuenta corriente sin cliente: ${salesWithoutClient.length}`);
            }

            // Verificar si las sumas de deudas coinciden con las ventas en cuenta corriente
            const totalDebts = debts.reduce((sum, debt) => sum + (debt.monto || 0), 0);
            const totalCreditSales = creditSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

            if (Math.abs(totalDebts - totalCreditSales) > 0.01) {
                inconsistencies.push(`Diferencia entre total de deudas ($${totalDebts.toFixed(2)}) y total de ventas en CC ($${totalCreditSales.toFixed(2)})`);
            }

            if (inconsistencies.length === 0) {
                log('✅ No se encontraron inconsistencias de datos');
                diagnosticResults.push({
                    test: 'Consistencia de Datos',
                    status: 'success',
                    message: 'No se encontraron inconsistencias de datos'
                });
            } else {
                log(`⚠️ Se encontraron ${inconsistencies.length} inconsistencias:`);
                inconsistencies.forEach(inconsistency => {
                    log(`  - ${inconsistency}`);
                });

                diagnosticResults.push({
                    test: 'Consistencia de Datos',
                    status: 'warning',
                    message: `Se encontraron ${inconsistencies.length} inconsistencias: ${inconsistencies.join(', ')}`
                });
            }
        } catch (error) {
            log(`❌ Error al verificar consistencia de datos: ${error.message}`, 'error');
            diagnosticResults.push({
                test: 'Consistencia de Datos',
                status: 'error',
                message: `No se puede verificar la consistencia de datos: ${error.message}`
            });
        }
    }

    /**
     * Genera el reporte final del diagnóstico
     */
    function generateReport() {
        log('📊 Generando reporte del diagnóstico...');

        // Obtener el contenedor de diagnóstico
        const diagnosticContainer = document.getElementById('diagnostic-container');

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
            title.textContent = '🔍 Resultados del Diagnóstico';
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

            // Recomendaciones
            if (errorCount > 0 || warningCount > 0) {
                const recommendations = document.createElement('div');
                recommendations.style.cssText = `
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #333;
                    font-size: 11px;
                `;
                recommendations.innerHTML = `
                    <strong>Recomendaciones:</strong><br>
                    • Verifica la conexión con el backend<br>
                    • Revisa los endpoints de clientes y deudas<br>
                    • Asegúrate de que las ventas en cuenta corriente tengan cliente asociado<br>
                    • Verifica la consistencia de los datos en la base de datos
                `;
                content.appendChild(recommendations);
            }
        }

        log('✅ Diagnóstico completado');
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
    window.DiagnosticClientes = {
        run: init,
        getResults: () => diagnosticResults
    };

})();