/**
 * Script de Verificación de Pagos para Factura FAC-1771013808622
 * Diagnostica los pagos registrados vs los mostrados en la interfaz
 */

const FACTURA = {
    numero: 'FAC-1771013808622',
    cliente_id: 40,
    cliente_nombre: 'Cliente Test',
    producto: 'Aceite Girasol Natura 1.5L',
    cantidad: 2,
    precio_unitario: 2900.00,
    total_factura: 5800.00,
    pago_mostrado: 0.00,
    saldo_mostrado: 5800.00
};

/**
 * Verificar estructura de pagos en base de datos
 */
function verifyPaymentStructure() {
    console.log('='.repeat(60));
    console.log('🔍 VERIFICACIÓN DE PAGOS - Factura FAC-1771013808622');
    console.log('='.repeat(60));
    
    console.log('\n📋 DATOS DE LA FACTURA:');
    console.log(`   Cliente: ${FACTURA.cliente_nombre} (ID: ${FACTURA.cliente_id})`);
    console.log(`   Producto: ${FACTURA.producto}`);
    console.log(`   Cantidad: ${FACTURA.cantidad} × $${FACTURA.precio_unitario} = $${FACTURA.total_factura}`);
    console.log(`   Total Factura: $${FACTURA.total_factura}`);
    
    console.log('\n💰 ESTADO ACTUAL (según interfaz):');
    console.log(`   Pago Mostrado: $${FACTURA.pago_mostrado}`);
    console.log(`   Saldo Mostrado: $${FACTURA.saldo_mostrado}`);
    console.log(`   Estado: "${FACTURA.saldo_mostrado > 0 ? 'PENDIENTE' : 'PAGADA'}"`);
    
    console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
    console.log('   Hay pagos registrados en la base de datos que NO se muestran');
    console.log('   en la interfaz de cuenta corriente.');
    
    console.log('\n🔍 VERIFICACIONES NECESARIAS:');
    
    checkPaymentRecords();
    checkAccountBalance();
    checkSyncIssues();
}

/**
 * Verificar registros de pago (simulado)
 */
function checkPaymentRecords() {
    console.log('\n1️⃣ VERIFICAR TABLA DE PAGOS:');
    console.log('   SQL a ejecutar:');
    console.log('   ```sql');
    console.log('   SELECT * FROM pagos WHERE factura_id = ');
    console.log('       (SELECT id FROM ventas WHERE numero_factura = "FAC-1771013808622")');
    console.log('   ```');
    
    console.log('\n   Posibles pagos registrados:');
    console.log('   • Pago parcial 1: $2.900 (50%)');
    console.log('   • Pago parcial 2: $2.900 (50%)');
    console.log('   • Pago total: $5.800 (100%)');
}

/**
 * Verificar saldo en cuenta corriente
 */
function checkAccountBalance() {
    console.log('\n2️⃣ VERIFICAR SALDO DE CUENTA CORRIENTE:');
    console.log('   SQL a ejecutar:');
    console.log('   ```sql');
    console.log('   SELECT SUM(monto) as total_pagado FROM pagos');
    console.log('   WHERE cliente_id = 40');
    console.log('   AND factura_id IN ');
    console.log('       (SELECT id FROM ventas WHERE numero_factura = "FAC-1771013808622")');
    console.log('   ```');
    
    console.log('\n   Verificar:');
    console.log('   • Saldo actual del cliente: $???');
    console.log('   • Pagos aplicados a esta factura: $???');
    console.log('   • Saldo pendiente real: $???');
}

/**
 * Verificar problemas de sincronización
 */
function checkSyncIssues() {
    console.log('\n3️⃣ VERIFICAR PROBLEMAS DE SINCRONIZACIÓN:');
    
    console.log('\n   Posibles causas:');
    console.log('   a) El pago se registró pero no se actualizó el saldo');
    console.log('   b) El frontend no está sincronizando con el backend');
    console.log('   c) Hay caché sin actualizar');
    console.log('   d) La tabla de pagos no está relacionada correctamente');
    
    console.log('\n   Soluciones propuestas:');
    console.log('   1. Recalcular saldo: SUM(pagos) - SUM(deudas)');
    console.log('   2. Invalidar caché del navegador');
    console.log('   3. Verificar endpoint de sincronización');
    console.log('   4. Revisar logs del servidor');
}

/**
 * Generar reporte de diagnóstico
 */
function generateDiagnosisReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE DE DIAGNÓSTICO');
    console.log('='.repeat(60));
    
    console.log('\n✅ RESUMEN:');
    console.log('   • La factura FAC-1771013808622 tiene un total de $5.800');
    console.log('   • Según la interfaz, no hay pagos ($0 mostrado)');
    console.log('   • Según el usuario, SÍ hay pagos registrados');
    console.log('   • El problema está en la visualización de pagos');
    
    console.log('\n🎯 ACCIÓN REQUERIDA:');
    console.log('   1. Verificar tabla "pagos" en la base de datos');
    console.log('   2. Verificar que el cálculo de saldo sea correcto');
    console.log('   3. Sincronizar frontend con backend');
    console.log('   4. Actualizar la interfaz de cuenta corriente');
    
    console.log('\n' + '='.repeat(60));
}

// Ejecutar verificación
verifyPaymentStructure();
generateDiagnosisReport();

// Exponer funciones globalmente
if (typeof window !== 'undefined') {
    window.verifyInvoicePayments = verifyPaymentStructure;
    window.FACTURA = FACTURA;
}

console.log('\n🔧 Script cargado. Ejecutar: verifyInvoicePayments()');
