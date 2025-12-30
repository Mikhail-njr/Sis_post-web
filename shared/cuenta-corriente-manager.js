/**
 * Módulo Centralizado para Gestión de Cuenta Corriente - VERSIÓN CORREGIDA
 * Consolidación de todas las funciones relacionadas con cuenta corriente
 * Eliminación de código duplicado identificado en el análisis
 * SOLUCIÓN AL PROBLEMA DE DETECCIÓN INCORRECTA DEL CARRITO VACÍO
 */

export class CuentaCorrienteManager {
    constructor() {
        this.estado = {
            cliente: null,
            activa: false,
            saldo: 0,
            saldoCargado: false
        };

        this.API_BASE = window.API_BASE || '/api';
        this.authCredentials = null;

        // Inicializar referencias al DOM
        this.elementos = {
            toggle: null,
            clienteInfo: null,
            saldoInfo: null,
            confirmBtn: null
        };

        this.inicializar();
    }

    /**
     * Inicializa el módulo y configura event listeners
     */
    inicializar() {
        // Configurar referencias al DOM cuando estén disponibles
        document.addEventListener('DOMContentLoaded', () => {
            this.configurarElementosDOM();
            // Asegurar que window.cart esté siempre definido
            this.inicializarCarrito();
        });
    }

    /**
     * Asegura que window.cart esté siempre definido como un array
     */
    inicializarCarrito() {
        if (typeof window === 'undefined') return;
        
        // Si window.cart no está definido o es null, inicializarlo como array vacío
        if (!window.cart || window.cart === null) {
            window.cart = [];
        }
    }

    /**
     * Configura las referencias a elementos del DOM
     */
    configurarElementosDOM() {
        this.elementos = {
            toggle: document.getElementById('cuenta_corriente-toggle'),
            clienteInfo: document.getElementById('cuenta_corriente-client-info'),
            saldoInfo: document.getElementById('cuenta_corriente-saldo'),
            confirmBtn: document.getElementById('cuenta_corriente-confirm')
        };

        // Configurar event listener para el toggle
        if (this.elementos.toggle) {
            this.elementos.toggle.addEventListener('change', () => this.toggleCuentaCorriente());
        }
    }

    /**
     * Activa/desactiva el modo cuenta corriente - CORREGIDO
     */
    async toggleCuentaCorriente() {
        const checkbox = this.elementos.toggle;
        if (!checkbox) return;

        if (checkbox.checked) {
            // Verificar que haya productos en el carrito - VALIDACIÓN MEJORADA
            const carritoValido = this.validarCarrito();
            
            if (!carritoValido.tieneProductos) {
                checkbox.checked = false;
                // Mostrar mensaje de error de forma más visible
                this.mostrarMensaje(carritoValido.mensaje, 'error');
                
                // También mostrar un alert modal para mayor visibilidad
                alert(carritoValido.mensaje);
                
                return;
            }

            // Abrir modal de selección de cliente
            if (window.openCustomerModal) {
                window.openCustomerModal();
            }
        } else {
            // Limpiar datos de cuenta corriente
            this.limpiarEstado();
        }

        // Actualizar resumen de pago
        this.actualizarResumenPago();
    }

    /**
     * Valida el estado del carrito - NUEVA FUNCIÓN
     * @returns {Object} Resultado de la validación
     */
    validarCarrito() {
        // Asegurar que window.cart esté siempre definido
        this.inicializarCarrito();
        
        // Verificar que window.cart sea un array
        if (!Array.isArray(window.cart)) {
            console.warn('⚠️ window.cart no es un array, se reiniciará');
            window.cart = [];
            return {
                tieneProductos: false,
                mensaje: 'El carrito no está disponible. Por favor, intente nuevamente.'
            };
        }

        // Verificar que haya productos en el carrito
        if (window.cart.length === 0) {
            return {
                tieneProductos: false,
                mensaje: 'El carrito está vacío. Agregue productos antes de seleccionar Cuenta Corriente.'
            };
        }

        // Verificar que los productos tengan la estructura correcta
        const productosValidos = window.cart.filter(item =>
            item && typeof item === 'object' &&
            item.id && item.nombre && item.precio !== undefined && item.cantidad !== undefined
        );

        if (productosValidos.length !== window.cart.length) {
            console.warn('⚠️ Algunos productos del carrito no tienen estructura válida');
        }

        // Calcular total para validar que sea mayor que 0
        const total = this.calcularTotal(window.cart);
        
        if (total <= 0) {
            return {
                tieneProductos: false,
                mensaje: 'El total del carrito es 0 o negativo. Verifique los precios de los productos.'
            };
        }

        return {
            tieneProductos: true,
            mensaje: 'Carrito válido',
            total: total,
            productosValidos: productosValidos.length,
            productosInvalidos: window.cart.length - productosValidos.length
        };
    }

    /**
     * Confirma el pago con cuenta corriente - CORREGIDO
     */
    async confirmarPago(total) {
        if (!this.estado.cliente) {
            this.mostrarMensaje('❌ Selecciona un cliente para la cuenta corriente', 'error');
            return false;
        }

        // Validar total con lógica mejorada
        const validacionTotal = this.validarTotal(total);
        if (!validacionTotal.valido) {
            this.mostrarMensaje(validacionTotal.mensaje, 'error');
            return false;
        }

        // Obtener IDs de productos del carrito
        const productosInfo = (window.cart || []).map(item => `• ${item.nombre} (ID: ${item.id})`).join('\n');
        const confirmMessage = `¿Confirmas el cargo de ${this.formatearMoneda(total)} a la cuenta corriente de ${this.estado.cliente.nombre}?\n\nProductos:\n${productosInfo}\n\nTotal: ${this.formatearMoneda(total)}`;

        if (confirm(confirmMessage)) {
            return await this.procesarPago(total);
        }

        return false;
    }

    /**
     * Valida el total del carrito - NUEVA FUNCIÓN
     * @param {number} total - Total a validar
     * @returns {Object} Resultado de la validación
     */
    validarTotal(total) {
        // Validar que el total sea un número válido
        if (total === null || total === undefined || isNaN(total)) {
            return {
                valido: false,
                mensaje: '❌ El total no es un valor numérico válido'
            };
        }

        // Validar que el total sea mayor que 0
        if (total <= 0) {
            return {
                valido: false,
                mensaje: '❌ El total debe ser mayor que 0'
            };
        }

        // Validar que el total no sea un número extremadamente grande (protección)
        if (total > 1000000000) { // 1000 millones
            return {
                valido: false,
                mensaje: '❌ El total parece ser incorrecto. Por favor, verifique los precios.'
            };
        }

        return {
            valido: true,
            mensaje: 'Total válido'
        };
    }

    /**
     * Valida si se puede procesar pago con cuenta corriente (para integración) - CORREGIDO
     */
    validarPagoIntegrado(totalToPay, selectedPaymentMethods) {
        const isCuentaCorrienteActive = this.estado.activa;

        // Verificar si cuenta corriente está activada
        if (isCuentaCorrienteActive && !this.estado.cliente) {
            this.mostrarMensaje('Selecciona un cliente para cuenta corriente', 'warning');
            return false;
        }

        // Si cuenta corriente está activada exclusivamente, procesar directamente
        if (isCuentaCorrienteActive && Object.keys(selectedPaymentMethods).length === 0 && !this.tieneMontosPagados(selectedPaymentMethods)) {
            // Validar total con lógica mejorada
            const validacionTotal = this.validarTotal(totalToPay);
            if (!validacionTotal.valido) {
                this.mostrarMensaje(validacionTotal.mensaje, 'warning');
                return false;
            }

            // Confirmar la operación
            const confirmMessage = `¿Confirmas registrar la factura por ${this.formatearMoneda(totalToPay)} a cuenta corriente de ${this.estado.cliente.nombre}?\n\nEsto creará una deuda a su cuenta corriente.`;

            if (confirm(confirmMessage)) {
                this.procesarPago(totalToPay);
            }
            return false; // No continuar con el flujo normal
        }

        return true; // Continuar con validación normal
    }

    /**
     * Calcula el total considerando si cuenta corriente está activa - MEJORADO
     */
    calcularTotal(carrito = null) {
        const items = carrito || window.cart || [];
        const isCuentaCorrienteActive = this.estado.activa;

        // Validar que items sea un array
        if (!Array.isArray(items)) {
            console.warn('⚠️ El carrito no es un array válido');
            return 0;
        }

        return items.reduce((sum, item) => {
            // Validar que el item tenga la estructura correcta
            if (!item || typeof item !== 'object') {
                console.warn('⚠️ Item del carrito no válido:', item);
                return sum;
            }

            // Si es cuenta corriente, usar precio original (sin descuento)
            // Si no es cuenta corriente, usar precio con descuento
            const precioAUtilizar = isCuentaCorrienteActive ?
                (item.precio_original || item.precio || 0) :
                (item.precio || 0);

            const cantidad = item.cantidad || 0;
            const subtotal = parseFloat(precioAUtilizar) * parseFloat(cantidad);

            // Validar que el subtotal sea un número válido
            if (isNaN(subtotal)) {
                console.warn('⚠️ Subtotal no válido para item:', item);
                return sum;
            }

            return sum + subtotal;
        }, 0);
    }

    // Métodos restantes (mantenidos pero con posibles mejoras menores)
    
    async setCliente(cliente) {
        this.estado.cliente = cliente;
        this.estado.activa = !!cliente;

        if (cliente) {
            this.actualizarInterfazCliente(cliente);
            await this.cargarSaldo(cliente.id);
        } else {
            this.limpiarInterfazCliente();
        }

        this.actualizarResumenPago();
    }

    async cargarSaldo(clienteId) {
        if (!clienteId) return;

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.authCredentials) {
                headers['Authorization'] = 'Basic ' + btoa(this.authCredentials.username + ':' + this.authCredentials.password);
            }

            const response = await fetch(`${this.API_BASE}/cuenta-corriente/${clienteId}/saldo`, { headers });

            if (response.status === 404) {
                // Cliente no tiene cuenta corriente
                this.estado.saldo = 0;
                this.estado.saldoCargado = true;
                this.actualizarInterfazSaldo('Cliente sin cuenta corriente', '#6c757d');
                this.mostrarMensaje('ℹ️ Este cliente no tiene cuenta corriente activa', 'info');
                return;
            }

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.estado.saldo = data.saldo || 0;
            this.estado.saldoCargado = true;

            const saldoFormateado = this.formatearMoneda(this.estado.saldo);
            const color = this.estado.saldo >= 0 ? '#27ae60' : '#e74c3c';

            this.actualizarInterfazSaldo(`Saldo: ${saldoFormateado}`, color);

        } catch (error) {
            console.error('Error cargando saldo de cuenta corriente:', error);
            this.actualizarInterfazSaldo('Error al cargar saldo', '#e74c3c');
        }
    }

    async procesarPago(total, descripcion = null) {
        if (!this.validarPago(total)) {
            return false;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.authCredentials) {
                headers['Authorization'] = 'Basic ' + btoa(this.authCredentials.username + ':' + this.authCredentials.password);
            }

            // Usar el endpoint estándar de ventas que maneja cuenta corriente automáticamente
            const requestData = {
                items: window.cart || [], // Los items del carrito
                cliente_id: this.estado.cliente.id, // Esto activa cuenta corriente automáticamente
                paymentMethod: 'cuenta_corriente',
                metodo_pago: 'cuenta_corriente'
            };

            const response = await fetch(`${this.API_BASE}/sales`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al procesar venta a cuenta corriente');
            }

            const data = await response.json();

            // Actualizar saldo local
            this.estado.saldo -= total;

            this.mostrarMensaje('✅ Venta a cuenta corriente exitosa', 'success');
            return data;

        } catch (error) {
            this.mostrarMensaje('❌ Error al procesar la venta a cuenta corriente', 'error');
            console.error('Error en processCuentaCorrientePayment:', error);
            return false;
        }
    }

    validarPago(total) {
        if (!this.estado.cliente) {
            this.mostrarMensaje('❌ Cliente no seleccionado', 'error');
            return false;
        }

        if (!this.estado.saldoCargado) {
            this.mostrarMensaje('❌ Saldo no cargado', 'error');
            return false;
        }

        // Validar total
        const validacionTotal = this.validarTotal(total);
        if (!validacionTotal.valido) {
            this.mostrarMensaje(validacionTotal.mensaje, 'error');
            return false;
        }

        // Nota: No validamos saldo suficiente aquí para permitir crear deuda
        return true;
    }

    // Métodos auxiliares (mantenidos)
    actualizarResumenPago() {
        if (window.updatePaymentSummary) {
            window.updatePaymentSummary();
        }
    }

    actualizarInterfazCliente(cliente) {
        if (this.elementos.clienteInfo) {
            this.elementos.clienteInfo.textContent = `Cliente: ${cliente.nombre}`;
            this.elementos.clienteInfo.style.display = 'block';
        }

        if (this.elementos.saldoInfo) {
            this.elementos.saldoInfo.style.display = 'block';
            this.elementos.saldoInfo.textContent = 'Cargando saldo...';
        }

        if (this.elementos.confirmBtn) {
            this.elementos.confirmBtn.style.display = 'none';
        }
    }

    actualizarInterfazSaldo(texto, color) {
        if (this.elementos.saldoInfo) {
            this.elementos.saldoInfo.textContent = texto;
            this.elementos.saldoInfo.style.color = color;
        }
    }

    limpiarInterfazCliente() {
        if (this.elementos.clienteInfo) {
            this.elementos.clienteInfo.style.display = 'none';
            this.elementos.clienteInfo.textContent = '';
        }

        if (this.elementos.saldoInfo) {
            this.elementos.saldoInfo.style.display = 'none';
            this.elementos.saldoInfo.textContent = '';
        }

        if (this.elementos.confirmBtn) {
            this.elementos.confirmBtn.style.display = 'none';
        }
    }

    limpiarEstado() {
        this.estado = {
            cliente: null,
            activa: false,
            saldo: 0,
            saldoCargado: false
        };

        this.limpiarInterfazCliente();
    }

    estaDisponible() {
        return this.estado.activa && this.estado.cliente && this.estado.saldoCargado;
    }

    obtenerEstado() {
        return { ...this.estado };
    }

    setAuthCredentials(credentials) {
        this.authCredentials = credentials;
    }

    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(valor);
    }

    mostrarMensaje(mensaje, tipo = 'info') {
        if (window.showAlert) {
            window.showAlert(mensaje, tipo);
        } else {
            console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        }
    }

    tieneMontosPagados(selectedPaymentMethods) {
        return Object.values(selectedPaymentMethods).some(amount => parseFloat(amount) > 0);
    }

    async procesarPagoIntegrado(totalToPay, paymentDetails, tempCredentials) {
        const cuentaCorrientePayment = paymentDetails.find(p => p.metodo === 'cuenta_corriente');
        if (cuentaCorrientePayment) {
            try {
                // Usar el endpoint estándar de ventas que maneja cuenta corriente automáticamente
                const ventaResponse = await fetch(`${this.API_BASE}/sales`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + btoa(tempCredentials.username + ':' + tempCredentials.password)
                    },
                    body: JSON.stringify({
                        items: window.cart || [], // Los items del carrito
                        cliente_id: this.estado.cliente.id, // Esto activa cuenta corriente automáticamente
                        paymentMethod: 'cuenta_corriente',
                        metodo_pago: 'cuenta_corriente'
                    })
                });

                if (!ventaResponse.ok) {
                    const errorData = await ventaResponse.json();
                    throw new Error(errorData.error || 'Error al procesar venta a cuenta corriente');
                }

                const ventaData = await ventaResponse.json();
                console.log('Venta a cuenta corriente procesada:', ventaData);

                return ventaData.numero_factura;

            } catch (ventaError) {
                this.mostrarMensaje('❌ Error al procesar venta a cuenta corriente: ' + ventaError.message, 'error');
                throw ventaError;
            }
        }

        return null;
    }

    limpiarDespuesPago() {
        if (this.estado.activa) {
            this.estado.cliente = null;
            this.estado.activa = false;
            this.estado.saldo = 0;
            this.estado.saldoCargado = false;

            if (this.elementos.toggle) {
                this.elementos.toggle.checked = false;
            }
            this.limpiarInterfazCliente();
        }
    }
}

// Crear instancia global única
export const cuentaCorrienteManager = new CuentaCorrienteManager();

// Exponer funciones compatibles con el código existente
window.cuentaCorrienteManager = cuentaCorrienteManager;

// Funciones de compatibilidad para reemplazar las funciones duplicadas
window.toggleCuentaCorriente = () => cuentaCorrienteManager.toggleCuentaCorriente();
window.setCuentaCorrienteCliente = (cliente) => cuentaCorrienteManager.setCliente(cliente);
window.confirmCuentaCorrientePayment = () => cuentaCorrienteManager.confirmarPago(cuentaCorrienteManager.calcularTotal());
window.processCuentaCorrientePayment = (total) => cuentaCorrienteManager.procesarPago(total);
window.loadCuentaCorrienteSaldo = (clienteId) => cuentaCorrienteManager.cargarSaldo(clienteId);

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.CuentaCorrienteManagerCorregido = CuentaCorrienteManager;
}