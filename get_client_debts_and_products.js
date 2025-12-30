/**
 * Script para obtener deudas activas y IDs de productos de los 2 clientes activos
 * Usa las credenciales proporcionadas: admin/pos123
 */

// Importar función centralizada de API
const { apiRequest } = require('./shared/api-client');

// Configurar credenciales globales (para compatibilidad con api-client.js)
global.authCredentials = {
    username: 'admin',
    password: 'pos123'
};

// Función principal
async function getClientDebtsAndProducts() {
    try {
        console.log('🔍 Obteniendo información de clientes, deudas y productos...\n');

        // 1. Obtener todos los clientes
        console.log('👥 Paso 1: Obteniendo lista de clientes...');
        const customers = await apiRequest('/customers');
        console.log(`✅ Encontrados ${customers.length} clientes totales`);

        // 2. Filtrar clientes activos (asumiendo que hay un campo 'activo' o similar)
        // Si no hay campo 'activo', tomaremos los primeros 2 clientes
        let activeCustomers = customers.filter(c => c.activo !== false && c.activo !== 0);
        if (activeCustomers.length === 0) {
            // Si no hay campo activo, tomar los primeros 2
            activeCustomers = customers.slice(0, 2);
            console.log('⚠️ No se encontró campo "activo", usando los primeros 2 clientes');
        } else if (activeCustomers.length > 2) {
            activeCustomers = activeCustomers.slice(0, 2);
        }

        console.log(`✅ Clientes activos encontrados: ${activeCustomers.length}`);
        activeCustomers.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.nombre} (ID: ${c.id})`);
        });

        // 3. Verificar si hay deudas en general en el sistema
        console.log('\n🔍 Paso 2: Verificando deudas totales en el sistema...');
        try {
            const allDebts = await apiRequest('/debts');
            console.log(`✅ Total de deudas en el sistema: ${allDebts.length}`);

            if (allDebts.length > 0) {
                console.log('   Estados de deudas encontrados:');
                const statusCount = {};
                allDebts.forEach(d => {
                    const status = d.estado || 'sin_estado';
                    statusCount[status] = (statusCount[status] || 0) + 1;
                });
                Object.entries(statusCount).forEach(([status, count]) => {
                    console.log(`     - ${status}: ${count} deudas`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error obteniendo deudas totales: ${error.message}`);
        }

        // 4. Verificar ventas a cuenta corriente que podrían generar deudas
        console.log('\n🛒 Paso 3: Verificando ventas a cuenta corriente...');
        try {
            const sales = await apiRequest('/sales');
            const creditSales = sales.filter(s => s.metodo_pago === 'cuenta_corriente');
            console.log(`✅ Ventas a cuenta corriente encontradas: ${creditSales.length}`);

            if (creditSales.length > 0) {
                console.log('   Ventas a cuenta corriente:');
                creditSales.forEach((sale, i) => {
                    console.log(`     ${i + 1}. Factura ${sale.numero_factura} - $${sale.total} - Cliente ID: ${sale.cliente_id || 'Sin cliente'}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error obteniendo ventas: ${error.message}`);
        }

        // 5. Para cada cliente activo, intentar obtener deudas de diferentes formas
        for (const customer of activeCustomers) {
            console.log(`\n💰 Paso 4: Verificando deudas para ${customer.nombre} (ID: ${customer.id})...`);

            // Método 1: Intentar obtener deudas por cliente
            try {
                const debts = await apiRequest(`/debts?cliente_id=${customer.id}`);
                console.log(`   ✅ Deudas por query cliente_id: ${debts.length}`);

                if (debts.length > 0) {
                    debts.forEach((debt, i) => {
                        console.log(`     Deuda ${i + 1}: ID ${debt.id} - $${debt.monto} - Estado: ${debt.estado}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Error con query cliente_id: ${error.message}`);
            }

            // Método 2: Filtrar deudas generales por cliente_id
            try {
                const allDebts = await apiRequest('/debts');
                const customerDebts = allDebts.filter(d => d.cliente_id == customer.id);
                console.log(`   ✅ Deudas filtradas manualmente: ${customerDebts.length}`);

                if (customerDebts.length > 0) {
                    customerDebts.forEach((debt, i) => {
                        console.log(`     Deuda ${i + 1}: ID ${debt.id} - $${debt.monto} - Estado: ${debt.estado}`);
                    });

                    // Obtener productos de estas deudas
                    console.log(`   📦 Obteniendo productos de las deudas...`);
                    const productIds = new Set();

                    for (const debt of customerDebts) {
                        try {
                            const debtProducts = await apiRequest(`/debts/${debt.id}/products`);
                            debtProducts.forEach(dp => productIds.add(dp.producto_id));
                        } catch (error) {
                            console.log(`     ⚠️ No se pudieron obtener productos para deuda ${debt.id}: ${error.message}`);
                        }
                    }

                    if (productIds.size > 0) {
                        console.log(`   ✅ IDs de productos encontrados: ${Array.from(productIds).join(', ')}`);
                    } else {
                        console.log(`   ℹ️ No se encontraron productos asociados`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error filtrando deudas: ${error.message}`);
            }
        }

        console.log('\n🎉 Proceso completado exitosamente!');

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
    }
}

// Ejecutar el script
getClientDebtsAndProducts();