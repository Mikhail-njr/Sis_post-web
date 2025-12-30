/**
 * Script de Diagnóstico: Problema de Actualización de Precios en Cuenta Corriente (Investigación)
 * Versión refactorizada usando BaseDiagnostic para eliminar código duplicado
 */

const { BaseDiagnostic } = require('./shared/diagnostic-base');

class PrecioCuentaCorrienteInvestigacionDiagnostic extends BaseDiagnostic {
    constructor() {
        super('Diagnóstico Investigación - Precios en Cuenta Corriente de Mika');
    }

    async run() {
        // Paso 1: Verificar cliente Mika
        this.logStep(1, 'Verificando cliente Mika');
        let clientes = await this.apiClient.get('/customers');
        let clienteMika = clientes.find(c => c.nombre.toLowerCase() === 'mika');

        if (!clienteMika) {
            this.logInfo('Creando cliente Mika...');
            clienteMika = await this.apiClient.post('/customers', {
                nombre: 'Mika', telefono: '1122334455', direccion: 'Calle Falsa 123',
                email: 'mika@example.com', tipo: 'minorista', cuit: '20-12345678-9'
            });
            this.logSuccess('Cliente Mika creado', clienteMika);
        } else {
            this.logSuccess('Cliente Mika encontrado', clienteMika);
        }

        // Paso 2: Obtener producto de prueba
        this.logStep(2, 'Seleccionando producto de prueba');
        let productos = await this.apiClient.get('/products');
        const productosDisponibles = productos.filter(p => p.activo === 1 && p.stock > 0);
        if (productosDisponibles.length === 0) throw new Error('No hay productos disponibles');

        const productoPrueba = productosDisponibles[0];
        this.logSuccess('Producto seleccionado', {
            nombre: productoPrueba.nombre, precio: productoPrueba.precio
        });

        // Paso 3: Crear venta a cuenta corriente
        this.logStep(3, 'Creando venta a cuenta corriente');
        const cantidadCompra = 2;
        const ventaData = {
            cliente_id: clienteMika.id,
            items: [{ id: productoPrueba.id, nombre: productoPrueba.nombre,
                     cantidad: cantidadCompra, precio: productoPrueba.precio, descuento_porcentaje: 0 }],
            pagos: [{ metodo: 'cuenta_corriente', monto: productoPrueba.precio * cantidadCompra }],
            total: productoPrueba.precio * cantidadCompra, vuelto: 0
        };

        const venta = await this.apiClient.post('/sales', ventaData);
        this.logSuccess('Venta creada', { numero_factura: venta.numero_factura, total: venta.total });

        // Paso 4: Verificar deuda generada
        this.logStep(4, 'Verificando deuda generada');
        let deudas = await this.apiClient.get('/debts');
        const deudaVenta = deudas.find(d => d.venta_id === venta.saleId);
        if (!deudaVenta) throw new Error('No se encontró la deuda de la venta');

        this.logSuccess('Deuda encontrada', {
            monto_original: deudaVenta.monto_original, monto_pendiente: deudaVenta.monto_pendiente
        });

        // Paso 5: Subir precio del producto
        this.logStep(5, 'Actualizando precio del producto');
        const aumentoPorcentaje = 20;
        const nuevoPrecio = Math.round(productoPrueba.precio * (1 + aumentoPorcentaje / 100));

        const productoActualizado = await this.apiClient.put(`/products/${productoPrueba.id}`, {
            ...productoPrueba, precio: nuevoPrecio
        });

        this.logSuccess('Precio actualizado', {
            precio_anterior: productoPrueba.precio, nuevo_precio: productoActualizado.precio
        });

        // Paso 6: Diagnóstico crítico - Comparar precios
        this.logStep(6, 'DIAGNÓSTICO CRÍTICO - Comparación de precios');
        const deudaConCalculo = await this.apiClient.get(`/debts/${deudaVenta.id}/calcular-total`);

        this.printSeparator();
        console.log(`Precio actual: $${productoActualizado.precio} | Original: $${productoPrueba.precio}`);
        console.log(`Monto original deuda: $${deudaVenta.monto_original}`);
        console.log(`Monto calculado actual: $${deudaConCalculo.deuda.total_actual}`);
        this.printSeparator();

        // Paso 7: Verificar actualización automática
        this.logStep(7, 'Verificando actualización automática de deuda');
        const deudaActualizada = await this.apiClient.get(`/debts/${deudaVenta.id}`);

        const actualizada = deudaActualizada.monto_pendiente === deudaConCalculo.deuda.total_actual;
        if (actualizada) {
            this.logSuccess('La deuda se actualizó automáticamente');
        } else {
            this.logError('La deuda NO se actualizó automáticamente');
        }

        // Paso 8: Probar actualización manual
        this.logStep(8, 'Probando actualización manual');
        try {
            const resultado = await this.apiClient.post('/debts/update-prices');
            this.logSuccess('Actualización manual completada', {
                actualizadas: resultado.updated_debts, procesadas: resultado.total_debts_processed
            });
        } catch (error) {
            this.logError('Error en actualización manual', error);
        }

        // Paso 9: Verificación final
        this.logStep(9, 'Verificación final');
        const deudaFinal = await this.apiClient.get(`/debts/${deudaVenta.id}`);
        const precioCorrecto = productoActualizado.precio * cantidadCompra;
        const deudaCorrecta = deudaFinal.monto_pendiente === precioCorrecto;

        // Retornar resultados para reporte automático
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
const diagnostic = new PrecioCuentaCorrienteInvestigacionDiagnostic();
diagnostic.execute().then(result => {
    if (!result.success) {
        console.error('❌ Error fatal:', result.error);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});