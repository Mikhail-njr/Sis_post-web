/**
 * Script de Diagnóstico: Problema de Actualización de Precios en Cuenta Corriente
 * 
 * Este script se conecta al servidor existente para diagnosticar el problema:
 * "no se actualiza el precio del producto en la cuenta corriente del usuario Mika"
 * 
 * Objetivo: Identificar la fuente exacta del problema y proporcionar una solución
 */

const http = require('http');

// Crear un cliente HTTP para hacer peticiones al servidor existente
class ApiClient {
    constructor(port = 3000) {
        this.port = port;
        this.host = 'localhost';
    }

    async request(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.host,
                port: this.port,
                path: '/api' + path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            // Agregar autenticación básica para operaciones que la requieran
            if (method !== 'GET') {
                const auth = Buffer.from('admin:pos123').toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
            }

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        let result;
                        if (body.trim() === '') {
                            result = { message: 'Empty response' };
                        } else {
                            result = JSON.parse(body);
                        }
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(result);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${result.error || result.message || body}`));
                        }
                    } catch (e) {
                        reject(new Error(`Parse error: ${e.message} - Body: ${body.substring(0, 200)}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async get(path) {
        return this.request('GET', path);
    }

    async post(path, data) {
        return this.request('POST', path, data);
    }

    async put(path, data) {
        return this.request('PUT', path, data);
    }

    async delete(path) {
        return this.request('DELETE', path);
    }
}

const apiClient = new ApiClient();

async function diagnosticarProblemaPrecioCuentaCorriente() {
    console.log('🔍 INICIANDO DIAGNÓSTICO: Problema de precios en cuenta corriente de Mika\n');
    console.log('📡 Conectando al servidor existente en http://localhost:3000...\n');
    
    try {
        // Paso 1: Verificar cliente Mika
        console.log('📋 Paso 1: Verificando cliente Mika...');
        let clientes = await apiClient.get('/customers');
        let clienteMika = clientes.find(c => c.nombre.toLowerCase() === 'mika');

        if (!clienteMika) {
            console.log('👤 Creando cliente Mika...');
            clienteMika = await apiClient.post('/customers', {
                nombre: 'Mika',
                telefono: '1122334455',
                direccion: 'Calle Falsa 123',
                email: 'mika@example.com',
                tipo: 'minorista',
                cuit: '20-12345678-9'
            });
            console.log('✅ Cliente Mika creado exitosamente:', clienteMika);
        } else {
            console.log('✅ Cliente Mika encontrado:', clienteMika);
        }

        // Paso 2: Obtener productos y seleccionar uno
        console.log('\n📦 Paso 2: Obteniendo productos...');
        let productos = await apiClient.get('/products');
        
        // Filtrar productos activos con stock
        const productosDisponibles = productos.filter(p => 
            p.activo === 1 && p.stock > 0
        );

        if (productosDisponibles.length === 0) {
            console.log('❌ No hay productos disponibles para la prueba');
            return;
        }

        const productoPrueba = productosDisponibles[0];
        console.log('✅ Producto seleccionado para prueba:', {
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

        console.log('   Enviando datos de venta:', JSON.stringify(ventaData, null, 2));
        
        const venta = await apiClient.post('/sales', ventaData);
        console.log('✅ Venta a cuenta corriente creada:', {
            id: venta.saleId,
            numero_factura: venta.numero_factura,
            total: venta.total
        });

        // Paso 4: Verificar deuda generada
        console.log('\n🔍 Paso 4: Verificando deuda generada...');
        let deudas = await apiClient.get('/debts');
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
        const productosDeuda = await apiClient.get(`/debts/${deudaVenta.id}/products`);
        console.log('📋 Productos en deuda:', productosDeuda);

        // Paso 6: Subir el precio del producto
        console.log('\n💰 Paso 6: Subiendo precio del producto...');
        const aumentoPorcentaje = 20;
        const nuevoPrecio = Math.round(productoPrueba.precio * (1 + aumentoPorcentaje / 100));
        
        const productoActualizado = await apiClient.put(`/products/${productoPrueba.id}`, {
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
        const deudaConCalculo = await apiClient.get(`/debts/${deudaVenta.id}/calcular-total`);
        
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
        const deudaActualizada = await apiClient.get(`/debts/${deudaVenta.id}`);
        
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
            const resultadoActualizacion = await apiClient.post('/debts/update-prices');
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
        const deudaFinal = await apiClient.get(`/debts/${deudaVenta.id}`);
        
        console.log('📊 ESTADO FINAL DE LA DEUDA:');
        console.log('─'.repeat(60));
        console.log(`Monto original: $${deudaFinal.monto_original}`);
        console.log(`Monto pendiente: $${deudaFinal.monto_pendiente}`);
        console.log(`Precio producto actual: $${productoActualizado.precio}`);
        console.log(`Precio producto original: $${productoPrueba.precio}`);
        console.log('─'.repeat(60));

        // Paso 11: DIAGNÓSTICO FINAL - Identificar la causa raíz
        console.log('\n🎯 DIAGNÓSTICO FINAL:');
        console.log('─'.repeat(60));
        
        const precioCorrecto = productoActualizado.precio * cantidadCompra;
        const deudaCorrecta = deudaFinal.monto_pendiente === precioCorrecto;
        
        if (deudaCorrecta) {
            console.log('✅ SOLUCIÓN ENCONTRADA: La deuda está correctamente actualizada');
            console.log('   El precio de la deuda coincide con el precio actual del producto');
        } else {
            console.log('❌ PROBLEMA CONFIRMADO: La deuda no está actualizada');
            console.log('   Posibles causas:');
            console.log('   1. Falta de trigger automático al cambiar precios');
            console.log('   2. Función de actualización no funciona correctamente');
            console.log('   3. Problema de sincronización entre frontend y backend');
            console.log('   4. Lógica de cálculo incorrecta en el frontend');
            
            // Proponer solución
            console.log('\n💡 SOLUCIÓN PROPUESTA:');
            console.log('   1. Implementar trigger automático en actualización de precios');
            console.log('   2. Mejorar la función de actualización de deudas');
            console.log('   3. Añadir validación en tiempo real');
            console.log('   4. Mejorar la lógica de cálculo en el frontend');
        }

        // Paso 12: Generar reporte detallado
        console.log('\n📄 GENERANDO REPORTE DETALLADO...');
        
        const reporte = {
            fecha: new Date().toISOString(),
            cliente: clienteMika,
            producto: {
                id: productoPrueba.id,
                nombre: productoPrueba.nombre,
                precio_original: productoPrueba.precio,
                precio_actual: productoActualizado.precio,
                aumento_porcentaje: aumentoPorcentaje
            },
            deuda: {
                id: deudaVenta.id,
                monto_original: deudaVenta.monto_original,
                monto_pendiente_actual: deudaFinal.monto_pendiente,
                calculo_esperado: precioCorrecto,
                esta_actualizada: deudaCorrecta
            },
            diagnosticos: {
                problema_encontrado: !deudaCorrecta,
                causas_posibles: !deudaCorrecta ? [
                    'Falta de trigger automático',
                    'Función de actualización defectuosa',
                    'Problema de sincronización',
                    'Lógica de cálculo incorrecta'
                ] : []
            }
        };

        // Guardar reporte
        const reportePath = `diagnostico_precio_cuenta_corriente_${Date.now()}.json`;
        const fs = require('fs');
        fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
        console.log(`✅ Reporte guardado en: ${reportePath}`);

        console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
        console.log('─'.repeat(60));
        console.log('Resumen:');
        console.log(`- Cliente: ${clienteMika.nombre}`);
        console.log(`- Producto: ${productoPrueba.nombre}`);
        console.log(`- Precio original: $${productoPrueba.precio}`);
        console.log(`- Precio actual: $${productoActualizado.precio}`);
        console.log(`- Deuda actualizada: ${deudaCorrecta ? 'Sí' : 'No'}`);
        console.log(`- Reporte: ${reportePath}`);

    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Ejecutar el diagnóstico
diagnosticarProblemaPrecioCuentaCorriente().then(() => {
    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});