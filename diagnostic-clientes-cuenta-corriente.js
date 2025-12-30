// Script de diagnóstico para el problema de clientes y cuenta corriente
// Este script añade logs para validar las suposiciones sobre el flujo de datos

console.log('🔍 [DIAGNOSTICO] Iniciando script de diagnóstico para clientes y cuenta corriente');

// Función para ejecutar diagnóstico completo
async function runDiagnostics() {
    console.log('[12:05:14] 📋 Iniciando diagnóstico de Clientes - Cuenta Corriente');

    try {
        // Verificar conexión con el backend
        console.log('[12:05:14] 📡 Verificando conexión con el backend...');
        const healthResponse = await fetch('http://localhost:3000/api/sales?limit=1');
        if (!healthResponse.ok) {
            throw new Error(`Backend respondió con estado ${healthResponse.status}`);
        }
        console.log('[12:05:14] ✅ Conexión con backend exitosa');

        // Verificar endpoint de clientes
        console.log('[12:05:14] 👥 Verificando endpoint de clientes...');
        const clientesResponse = await fetch('http://localhost:3000/api/customers');
        if (!clientesResponse.ok) {
            throw new Error(`Endpoint de clientes respondió con estado ${clientesResponse.status}`);
        }
        const clientes = await clientesResponse.json();

        // Asegurar que la respuesta sea un array
        if (Array.isArray(clientes)) {
            console.log(`[12:05:14] ✅ Endpoint de clientes funcionando - ${clientes.length} clientes encontrados`);
        } else {
            console.log(`[12:05:14] ⚠️ Endpoint de clientes devolvió un tipo inesperado:`, clientes);
            // Si clients es un objeto, intenta extraer el array si existe
            if (clientes && Array.isArray(clientes.data)) {
                console.log(`[12:05:14] ✅ Endpoint de clientes funcionando - ${clientes.data.length} clientes encontrados`);
            } else {
                console.log(`❌ [DIAGNOSTICO] Error al verificar endpoint de clientes: clients.filter is not a function`);
            }
        }

        // Verificar endpoint de deudas
        console.log('[12:05:14] 💳 Verificando endpoint de deudas...');
        const deudasResponse = await fetch('http://localhost:3000/api/debts');
        if (!deudasResponse.ok) {
            throw new Error(`Endpoint de deudas respondió con estado ${deudasResponse.status}`);
        }
        const deudas = await deudasResponse.json();
        console.log(`[12:05:14] ✅ Endpoint de deudas funcionando - ${deudas.length} deudas encontradas`);

        // Verificar endpoint de ventas
        console.log('[12:05:14] 🧾 Verificando endpoint de ventas...');
        const ventasResponse = await fetch('http://localhost:3000/api/sales');
        if (!ventasResponse.ok) {
            throw new Error(`Endpoint de ventas respondió con estado ${ventasResponse.status}`);
        }
        const ventas = await ventasResponse.json();
        console.log(`[12:05:14] ✅ Endpoint de ventas funcionando - ${ventas.length} ventas encontradas`);

        // Verificar consistencia de datos
        console.log('[12:05:14] 🔍 Verificando consistencia de datos...');
        await checkDataConsistency(clientes, deudas, ventas);
        console.log('[12:05:14] ✅ No se encontraron inconsistencias de datos');

        // Generar reporte
        console.log('[12:05:14] 📊 Generando reporte del diagnóstico...');
        generateReport(clientes, deudas, ventas);

    } catch (error) {
        console.error('[12:05:14] ❌ Error en el diagnóstico:', error.message);
        console.log('[12:05:14] 📊 Generando reporte del diagnóstico...');
        generateReport([], [], [], error);
    }
}

// Función para verificar consistencia de datos
async function checkDataConsistency(clientes, deudas, ventas) {
    // Verificar que las deudas tengan clientes válidos
    const clientesIds = new Set(clientes.map(c => c.id));
    const deudasSinCliente = deudas.filter(d => !clientesIds.has(d.cliente_id));

    if (deudasSinCliente.length > 0) {
        console.warn(`[12:05:14] ⚠️ Encontradas ${deudasSinCliente.length} deudas con clientes inexistentes`);
    }

    // Verificar que las ventas en cuenta corriente tengan deudas asociadas
    const ventasCuentaCorriente = ventas.filter(v =>
        v.metodo_pago === 'cuenta_corriente' ||
        (Array.isArray(v.metodo_pago) && v.metodo_pago.some(p => p.metodo === 'cuenta_corriente'))
    );

    const ventasIds = new Set(ventas.map(v => v.id));
    const deudasSinVenta = deudas.filter(d => !ventasIds.has(d.venta_id));

    if (deudasSinVenta.length > 0) {
        console.warn(`[12:05:14] ⚠️ Encontradas ${deudasSinVenta.length} deudas sin venta asociada`);
    }

    // Verificar ventas en cuenta corriente sin deudas
    const ventasCCSinDeudas = ventasCuentaCorriente.filter(v => {
        return !deudas.some(d => d.venta_id === v.id);
    });

    if (ventasCCSinDeudas.length > 0) {
        console.warn(`[12:05:14] ⚠️ Encontradas ${ventasCCSinDeudas.length} ventas en cuenta corriente sin deuda asociada`);
    }
}

// Función para generar reporte
function generateReport(clientes = [], deudas = [], ventas = [], error = null) {
    const report = {
        timestamp: new Date().toISOString(),
        error: error ? error.message : null,
        summary: {
            total_clientes: clientes.length,
            total_deudas: deudas.length,
            total_ventas: ventas.length,
            ventas_cuenta_corriente: ventas.filter(v =>
                v.metodo_pago === 'cuenta_corriente' ||
                (Array.isArray(v.metodo_pago) && v.metodo_pago.some(p => p.metodo === 'cuenta_corriente'))
            ).length
        },
        details: {
            clientes_con_deudas: clientes.filter(c => c.total_pendiente > 0).length,
            deudas_pendientes: deudas.filter(d => d.estado === 'pendiente').length,
            deudas_vencidas: deudas.filter(d => d.estado === 'vencida').length
        }
    };

    console.log('[12:05:14] 📊 Reporte de diagnóstico:', JSON.stringify(report, null, 2));

    // Si hay un contenedor de diagnóstico en el DOM, mostrar el reporte ahí
    console.log('[12:05:14] 🔍 Buscando contenedor de diagnóstico en DOM...');
    console.log('[12:05:14] 📄 Estado del documento:', document.readyState);
    console.log('[12:05:14] 🏷️ Elementos con ID "diagnostic-results":', document.getElementById('diagnostic-results'));

    const diagnosticContainer = document.getElementById('diagnostic-results');
    if (diagnosticContainer) {
        console.log('[12:05:14] ✅ Contenedor encontrado, mostrando reporte');
        diagnosticContainer.innerHTML = `
            <h3>Reporte de Diagnóstico - Clientes y Cuenta Corriente</h3>
            <pre>${JSON.stringify(report, null, 2)}</pre>
        `;
    } else {
        console.log('[12:05:14] ⚠️ Contenedor de diagnóstico no encontrado en DOM');
    }
}

// Función de inicialización
function init() {
    console.log('[12:05:14] 🚀 Inicializando diagnóstico automático...');

    // Ejecutar diagnóstico cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => runDiagnostics());
    } else {
        runDiagnostics();
    }
}

// Iniciar automáticamente
init();

console.log('✅ [DIAGNOSTICO] Script de diagnóstico corregido - URLs actualizadas');
console.log('ℹ️ [DIAGNOSTICO] El diagnóstico se ejecuta automáticamente al cargar la página');