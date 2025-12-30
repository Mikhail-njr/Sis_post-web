/**
 * Script de Diagnóstico: Problema de Actualización de Precios en Cuenta Corriente
 *
 * Este script realiza un diagnóstico completo del problema reportado:
 * "no se actualiza el precio del producto en la cuenta corriente del usuario Mika"
 *
 * Objetivo: Identificar la fuente exacta del problema y proporcionar una solución
 */

const { BaseDiagnostic } = require('./shared/diagnostic-base');

class PrecioCuentaCorrienteDiagnostic extends BaseDiagnostic {
    constructor() {
        super('Problema de Precios en Cuenta Corriente de Mika');
    }

    async run() {
        // Paso 1: Verificar cliente Mika
        this.logStep(1, 'Verificando cliente Mika');
        let clientes = await this.apiClient.get('/clientes');
        let clienteMika = clientes.find(c => c.nombre.toLowerCase() === 'mika');

        if (!clienteMika) {
            this.logInfo('Creando cliente Mika...');
            clienteMika = await this.apiClient.post('/clientes', {
                nombre: 'Mika',
                telefono: '1122334455',
                direccion: 'Calle Falsa 123',
                email: 'mika@example.com',
                tipo: 'minorista',
                cuit: '20-12345678-9'
            });
            this.logSuccess('Cliente Mika creado exitosamente', clienteMika);
        } else {
            this.logSuccess('Cliente Mika encontrado', clienteMika);
        }

        // Paso 2: Obtener productos y seleccionar uno
        this.logStep(2, 'Obteniendo productos');
        let productos = await this.apiClient.get('/api/products');

        // Filtrar productos activos con stock
        const productosDisponibles = productos.filter(p =>
            p.estado === 'activo' && p.stock > 0
        );

        if (productosDisponibles.length === 0) {
            throw new Error('No hay productos disponibles para la prueba');
        }

        const productoPrueba = productosDisponibles[0];
        this.logSuccess('Producto seleccionado para prueba', {
            id: productoPrueba.id,
            nombre: productoPrueba.nombre,
            precio: productoPrueba.precio,
            stock: productoPrueba.stock
        });

        // Paso 3: Crear una venta a cuenta corriente
        console.log('\n💳 Paso 3: Creando venta a cuenta corriente...');
        const cantidadCompra = 2;
        const ventaData = {
            cliente_id: clienteMika.id,
            items: [
                {
                    id: productoPrueba.id,
                    nombre: productoPrueba.nombre,
                    cantidad: cantidadCompra,
                    precio: productoPrueba.precio,
                    descuento_porcentaje: 0
                }
            ],
            pagos: [
                {
                    metodo: 'cuenta_corriente',
                    monto: productoPrueba.precio * cantidadCompra
                }
            ],
            total: productoPrueba.precio * cantidadCompra,
            vuelto: 0
        };

        const venta = await apiClient.post('/api/sales', ventaData);
        console.log('✅ Venta a cuenta corriente creada:', {
            id: venta.saleId,
            numero_factura: venta.numero_factura,
            total: venta.total
        });

        // Paso 4: Verificar deuda generada
        console.log('\n🔍 Paso 4: Verificando deuda generada...');
        let deudas = await apiClient.get('/api/debts');
        const deudaVenta = deudas.find(d => d.venta_id === venta.saleId);
        
        if (!deudaVenta) {
            console.log('❌ No se encontró la deuda de la venta');
            return;
        }

        console.log('✅ Deuda encontrada:', {
            id: deudaVenta.id,
            monto_original: deudaVenta.monto_original,
            monto_pendiente: deudaVenta.monto_pendiente,
            cliente_id: deudaVenta.cliente_id
        });

        // Paso 5: Verificar productos de la deuda
        console.log('\n🧾 Paso 5: Verificando productos de la deuda...');
        const productosDeuda = await apiClient.get(`/api/debts/${deudaVenta.id}/products`);
        console.log('📋 Productos en deuda:', productosDeuda);

        // Paso 6: Subir el precio del producto
        console.log('\n💰 Paso 6: Subiendo precio del producto...');
        const aumentoPorcentaje = 20;
        const nuevoPrecio = Math.round(productoPrueba.precio * (1 + aumentoPorcentaje / 100));
        
        const productoActualizado = await apiClient.put(`/api/products/${productoPrueba.id}`, {
            ...productoPrueba,
            precio: nuevoPrecio
        });
        
        console.log('✅ Precio actualizado:', {
            id: productoActualizado.id,
            nombre: productoActualizado.nombre,
            precio_anterior: productoPrueba.precio,
            nuevo_precio: productoActualizado.precio,
            aumento: `${aumentoPorcentaje}%`
        });

        // Paso 7: DIAGNÓSTICO CRÍTICO - Comparar precios
        console.log('\n🚨 PASO 7: DIAGNÓSTICO CRÍTICO - Comparación de precios');
        
        // Obtener la deuda con cálculo de precios actuales
        const deudaConCalculo = await apiClient.get(`/api/debts/${deudaVenta.id}/calcular-total`);
        
        console.log('📊 COMPARACIÓN DE PRECIOS:');
        console.log('─'.repeat(60));
        console.log(`Precio del producto (actual): $${productoActualizado.precio}`);
        console.log(`Precio del producto (original): $${productoPrueba.precio}`);
        console.log(`Cantidad en deuda: ${cantidadCompra}`);
        console.log('─'.repeat(60));
        console.log(`Monto original de deuda: $${deudaVenta.monto_original}`);
        console.log(`Monto calculado con precios actuales: $${deudaConCalculo.deuda.total_actual}`);
        console.log(`Diferencia: $${deudaConCalculo.deuda.total_actual - deudaVenta.monto_original}`);
        console.log('─'.repeat(60));

        // Paso 8: Verificar si la deuda se actualizó automáticamente
        console.log('\n🔄 Paso 8: Verificando si la deuda se actualizó automáticamente...');
        
        // Obtener deuda actualizada
        const deudaActualizada = await apiClient.get(`/api/debts/${deudaVenta.id}`);
        
        if (deudaActualizada.monto_pendiente === deudaConCalculo.deuda.total_actual) {
            console.log('✅ La deuda se actualizó automáticamente');
        } else {
            console.log('❌ La deuda NO se actualizó automáticamente');
            console.log('   Monto pendiente actual:', deudaActualizada.monto_pendiente);
            console.log('   Monto que debería ser:', deudaConCalculo.deuda.total_actual);
        }

        // Paso 9: Probar la función de actualización manual
        console.log('\n🔧 Paso 9: Probando función de actualización manual...');
        
        try {
            const resultadoActualizacion = await apiClient.post('/api/debts/update-prices');
            console.log('✅ Resultado de actualización manual:', {
                actualizadas: resultadoActualizacion.updated_debts,
                total_procesadas: resultadoActualizacion.total_debts_processed,
                total_lineas: resultadoActualizacion.total_lines_processed
            });
        } catch (error) {
            console.log('❌ Error en actualización manual:', error.message);
        }

        // Paso 10: Verificar deuda después de la actualización
        console.log('\n🔍 Paso 10: Verificando deuda después de actualización...');
        const deudaFinal = await apiClient.get(`/api/debts/${deudaVenta.id}`);
        
        console.log('📊 ESTADO FINAL DE LA DEUDA:');
        console.log('─'.repeat(60));
        console.log(`Monto original: $${deudaFinal.monto_original}`);
        console.log(`Monto pendiente: $${deudaFinal.monto_pendiente}`);
        console.log(`Precio producto actual: $${productoActualizado.precio}`);
        console.log(`Precio producto original: $${productoPrueba.precio}`);
        console.log('─'.repeat(60));

        // Paso 11: DIAGNÓSTICO FINAL - Identificar la causa raíz
        this.logStep(11, 'DIAGNÓSTICO FINAL');

        const precioCorrecto = productoActualizado.precio * cantidadCompra;
        const deudaCorrecta = deudaFinal.monto_pendiente === precioCorrecto;

        if (deudaCorrecta) {
            this.logSuccess('La deuda está correctamente actualizada');
        } else {
            this.logError('La deuda no está actualizada');
            this.logInfo('Posibles causas:');
            console.log('   1. Falta de trigger automático al cambiar precios');
            console.log('   2. Función de actualización no funciona correctamente');
            console.log('   3. Problema de sincronización entre frontend y backend');
            console.log('   4. Lógica de cálculo incorrecta en el frontend');
        }

        // Retornar resultados para el reporte
        return {
            cliente: clienteMika.nombre,
            producto: productoPrueba.nombre,
            precio_original: productoPrueba.precio,
            precio_actual: productoActualizado.precio,
            deuda_actualizada: deudaCorrecta,
            problema_encontrado: !deudaCorrecta
        };
    }
}

// Ejecutar el diagnóstico
const diagnostic = new PrecioCuentaCorrienteDiagnostic();
diagnostic.execute().then(result => {
    if (!result.success) {
        console.error('❌ Error fatal:', result.error);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});