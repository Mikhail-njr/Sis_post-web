const { DatabaseDiagnostic } = require('./shared/diagnostic-base');

class DatosHuerfanosDiagnostic extends DatabaseDiagnostic {
    constructor() {
        super('Diagnóstico de Datos Huérfanos - Clientes y Cuenta Corriente');
    }

    async run() {
        // 1. Verificar estado de claves foráneas
        this.logStep(1, 'Verificando estado de claves foráneas');
        const fkStatus = await this.dbGet("PRAGMA foreign_keys");
        const fkEnabled = fkStatus.foreign_keys ? true : false;

        this.logInfo(`Estado de foreign_keys: ${fkEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
        if (!fkEnabled) {
            this.logInfo('ADVERTENCIA: Las claves foráneas están DESHABILITADAS');
            this.logInfo('Esto permite la existencia de datos huérfanos sin restricciones');
        }

        // 2. Verificar deudas sin clientes
        this.logStep(2, 'Verificando deudas sin clientes asociados');
        const deudasHuerfanas = await this.dbAll(`
            SELECT d.id, d.venta_id, d.monto_original, d.monto_pendiente, d.created_at
            FROM deudas d
            LEFT JOIN clientes c ON d.cliente_id = c.id
            WHERE c.id IS NULL
        `);

        this.logInfo(`Deudas huérfanas encontradas: ${deudasHuerfanas.length}`);
        if (deudasHuerfanas.length > 0) {
            this.logInfo('Detalles de deudas huérfanas:');
            deudasHuerfanas.forEach((deuda, index) => {
                console.log(`     ${index + 1}. ID: ${deuda.id}, Venta: ${deuda.venta_id}, Monto: $${deuda.monto_original}, Pendiente: $${deuda.monto_pendiente}`);
            });
        } else {
            this.logSuccess('No se encontraron deudas huérfanas');
        }

        // 3. Verificar cuentas corrientes sin clientes
        console.log('\n3. 🏦 CUENTAS CORRIENTES SIN CLIENTES ASOCIADOS');
        console.log('-' .repeat(40));
        const cuentasHuerfanas = await dbAll(`
            SELECT cc.id, cc.saldo, cc.created_at, cc.updated_at
            FROM cuentas_corrientes cc
            LEFT JOIN clientes c ON cc.cliente_id = c.id
            WHERE c.id IS NULL
        `);

        console.log(`   Cuentas corrientes huérfanas encontradas: ${cuentasHuerfanas.length}`);
        if (cuentasHuerfanas.length > 0) {
            console.log('   📋 Detalles de cuentas huérfanas:');
            cuentasHuerfanas.forEach((cuenta, index) => {
                console.log(`     ${index + 1}. ID: ${cuenta.id}, Saldo: $${cuenta.saldo}, Creada: ${cuenta.created_at}`);
            });
        } else {
            console.log('   ✅ No se encontraron cuentas corrientes huérfanas');
        }

        // 4. Verificar movimientos de cuenta corriente sin cuentas válidas
        console.log('\n4. 📊 MOVIMIENTOS SIN CUENTAS CORRIENTES VÁLIDAS');
        console.log('-' .repeat(40));
        const movimientosHuerfanos = await dbAll(`
            SELECT mcc.id, mcc.cuenta_corriente_id, mcc.tipo_movimiento, mcc.monto, mcc.descripcion, mcc.created_at
            FROM movimientos_cuenta_corriente mcc
            LEFT JOIN cuentas_corrientes cc ON mcc.cuenta_corriente_id = cc.id
            WHERE cc.id IS NULL
        `);

        console.log(`   Movimientos huérfanos encontrados: ${movimientosHuerfanos.length}`);
        if (movimientosHuerfanos.length > 0) {
            console.log('   📋 Detalles de movimientos huérfanos:');
            movimientosHuerfanos.forEach((movimiento, index) => {
                console.log(`     ${index + 1}. ID: ${movimiento.id}, Cuenta: ${movimiento.cuenta_corriente_id}, Tipo: ${movimiento.tipo_movimiento}, Monto: $${movimiento.monto}`);
            });
        } else {
            console.log('   ✅ No se encontraron movimientos huérfanos');
        }

        // 5. Verificar productos de deuda sin deudas válidas
        console.log('\n5. 📦 PRODUCTOS DE DEUDA SIN DEUDAS VÁLIDAS');
        console.log('-' .repeat(40));
        const productosHuerfanos = await dbAll(`
            SELECT dp.id, dp.deuda_id, dp.producto_id, dp.cantidad, dp.precio_unitario, dp.subtotal
            FROM deuda_productos dp
            LEFT JOIN deudas d ON dp.deuda_id = d.id
            WHERE d.id IS NULL
        `);

        console.log(`   Productos de deuda huérfanos encontrados: ${productosHuerfanos.length}`);
        if (productosHuerfanos.length > 0) {
            console.log('   📋 Detalles de productos huérfanos:');
            productosHuerfanos.forEach((producto, index) => {
                console.log(`     ${index + 1}. ID: ${producto.id}, Deuda: ${producto.deuda_id}, Producto: ${producto.producto_id}, Cantidad: ${producto.cantidad}, Subtotal: $${producto.subtotal}`);
            });
        } else {
            console.log('   ✅ No se encontraron productos de deuda huérfanos');
        }

        // 6. Verificar deudas sin productos asociados
        console.log('\n6. 💳 DEUDAS SIN PRODUCTOS ASOCIADOS');
        console.log('-' .repeat(40));
        const deudasSinProductos = await dbAll(`
            SELECT d.id, d.cliente_id, d.venta_id, d.monto_original, d.monto_pendiente, c.nombre as cliente_nombre
            FROM deudas d
            LEFT JOIN clientes c ON d.cliente_id = c.id
            LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
            WHERE dp.deuda_id IS NULL
        `);

        console.log(`   Deudas sin productos encontradas: ${deudasSinProductos.length}`);
        if (deudasSinProductos.length > 0) {
            console.log('   📋 Detalles de deudas sin productos:');
            deudasSinProductos.forEach((deuda, index) => {
                console.log(`     ${index + 1}. ID: ${deuda.id}, Cliente: ${deuda.cliente_nombre || 'DESCONOCIDO'}, Venta: ${deuda.venta_id}, Monto: $${deuda.monto_original}`);
            });
        } else {
            console.log('   ✅ No se encontraron deudas sin productos');
        }

        // 7. Verificar clientes sin datos de cuenta corriente pero con deudas
        console.log('\n7. 👤 CLIENTES CON DEUDAS PERO SIN CUENTA CORRIENTE');
        console.log('-' .repeat(40));
        const clientesConDeudasSinCuenta = await dbAll(`
            SELECT DISTINCT c.id, c.nombre, COUNT(d.id) as total_deudas
            FROM clientes c
            JOIN deudas d ON c.id = d.cliente_id
            LEFT JOIN cuentas_corrientes cc ON c.id = cc.cliente_id
            WHERE cc.id IS NULL
            GROUP BY c.id, c.nombre
        `);

        console.log(`   Clientes con deudas pero sin cuenta corriente: ${clientesConDeudasSinCuenta.length}`);
        if (clientesConDeudasSinCuenta.length > 0) {
            console.log('   📋 Detalles:');
            clientesConDeudasSinCuenta.forEach((cliente, index) => {
                console.log(`     ${index + 1}. ID: ${cliente.id}, Nombre: ${cliente.nombre}, Deudas: ${cliente.total_deudas}`);
            });
        } else {
            console.log('   ✅ No se encontraron clientes en esta condición');
        }

        // Resumen general
        this.logStep(8, 'Generando resumen general');
        const totalHuerfanos = deudasHuerfanas.length + cuentasHuerfanas.length +
                              movimientosHuerfanos.length + productosHuerfanos.length;
        this.logInfo(`Total de registros huérfanos detectados: ${totalHuerfanos}`);

        // Estadísticas adicionales
        this.logStep(9, 'Obteniendo estadísticas adicionales');
        const estadisticas = await this.dbAll(`
            SELECT
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM cuentas_corrientes) as total_cuentas,
                (SELECT COUNT(*) FROM deudas) as total_deudas,
                (SELECT COUNT(*) FROM movimientos_cuenta_corriente) as total_movimientos,
                (SELECT COUNT(*) FROM deuda_productos) as total_productos_deuda
        `);

        const stats = estadisticas[0];
        this.logInfo(`Estadísticas: ${stats.total_clientes} clientes, ${stats.total_deudas} deudas, ${stats.total_cuentas} cuentas`);

        // Retornar resultados
        return {
            total_huerfanos: totalHuerfanos,
            deudas_huerfanas: deudasHuerfanas.length,
            cuentas_huerfanas: cuentasHuerfanas.length,
            movimientos_huerfanos: movimientosHuerfanos.length,
            productos_huerfanos: productosHuerfanos.length,
            foreign_keys_habilitadas: fkEnabled,
            estadisticas: stats
        };
    }
}

// Ejecutar diagnóstico
const diagnostic = new DatosHuerfanosDiagnostic();
diagnostic.execute().then(result => {
    if (!result.success) {
        console.error('❌ Error fatal:', result.error);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});