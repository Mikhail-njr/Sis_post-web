/**
 * Módulo Centralizado para Gestión de Cuenta Corriente
 * Consolidación de todas las funciones relacionadas con cuenta corriente
 * Eliminación de código duplicado identificado en el análisis
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
        });
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
     * Activa/desactiva el modo cuenta corriente
     */
    async toggleCuentaCorriente() {
        const checkbox = this.elementos.toggle;
        if (!checkbox) return;

        if (checkbox.checked) {
            // Verificar que haya productos en el carrito
            if (!window.cart || window.cart.length === 0) {
                checkbox.checked = false;
                this.mostrarMensaje('El carrito está vacío. Agregue productos antes de seleccionar Cuenta Corriente.', 'error');
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
     * Establece el cliente para cuenta corriente
     */
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

    /**
     * Carga el saldo del cliente desde el backend
     */
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

    /**
     * Procesa un pago con cuenta corriente
     */
    async procesarPago(total, descripcion = null) {
        if (!this.validarPago(total)) {
            return false;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.authCredentials) {
                headers['Authorization'] = 'Basic ' + btoa(this.authCredentials.username + ':' + this.authCredentials.password);
            }

            const requestData = {
                cliente_id: this.estado.cliente.id,
                monto: total,
                descripcion: descripcion || `Cargo por venta ${new Date().toLocaleDateString('es-AR')}`
            };

            const response = await fetch(`${this.API_BASE}/cuenta-corriente/cargo`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al procesar cargo a cuenta corriente');
            }

            const data = await response.json();

            // Actualizar saldo local
            this.estado.saldo -= total;

            this.mostrarMensaje('✅ Cargo a cuenta corriente exitoso', 'success');
            return data;

        } catch (error) {
            this.mostrarMensaje('❌ Error al procesar el cargo a cuenta corriente', 'error');
            console.error('Error en processCuentaCorrientePayment:', error);
            return false;
        }
    }

    /**
     * Confirma el pago con cuenta corriente (muestra diálogo de confirmación)
     */
    async confirmarPago(total) {
        if (!this.estado.cliente) {
            this.mostrarMensaje('❌ Selecciona un cliente para la cuenta corriente', 'error');
            return false;
        }

        if (!total || total <= 0) {
            this.mostrarMensaje('❌ El carrito está vacío', 'error');
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
     * Calcula el total considerando si cuenta corriente está activa
     */
    calcularTotal(carrito = null) {
        const items = carrito || window.cart || [];
        const isCuentaCorrienteActive = this.estado.activa;

        return items.reduce((sum, item) => {
            // Si es cuenta corriente, usar precio original (sin descuento)
            // Si no es cuenta corriente, usar precio con descuento
            const precioAUtilizar = isCuentaCorrienteActive ?
                (item.precio_original || item.precio) :
                item.precio;
            return sum + (parseFloat(precioAUtilizar) * item.cantidad);
        }, 0);
    }

    /**
     * Valida si se puede procesar un pago con cuenta corriente
     */
    validarPago(total) {
        if (!this.estado.cliente) {
            this.mostrarMensaje('❌ Cliente no seleccionado', 'error');
            return false;
        }

        if (!this.estado.saldoCargado) {
            this.mostrarMensaje('❌ Saldo no cargado', 'error');
            return false;
        }

        // Nota: No validamos saldo suficiente aquí para permitir crear deuda
        return true;
    }

    /**
     * Actualiza el resumen de pago
     */
    actualizarResumenPago() {
        // Esta función delega a la función global si existe
        if (window.updatePaymentSummary) {
            window.updatePaymentSummary();
        }
    }

    /**
     * Actualiza la interfaz del cliente
     */
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

    /**
     * Actualiza la interfaz del saldo
     */
    actualizarInterfazSaldo(texto, color) {
        if (this.elementos.saldoInfo) {
            this.elementos.saldoInfo.textContent = texto;
            this.elementos.saldoInfo.style.color = color;
        }
    }

    /**
     * Limpia la interfaz del cliente
     */
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

    /**
     * Limpia el estado completo
     */
    limpiarEstado() {
        this.estado = {
            cliente: null,
            activa: false,
            saldo: 0,
            saldoCargado: false
        };

        this.limpiarInterfazCliente();
    }

    /**
     * Verifica si cuenta corriente está disponible para un pago
     */
    estaDisponible() {
        return this.estado.activa && this.estado.cliente && this.estado.saldoCargado;
    }

    /**
     * Obtiene información del estado actual
     */
    obtenerEstado() {
        return { ...this.estado };
    }

    /**
     * Configura las credenciales de autenticación
     */
    setAuthCredentials(credentials) {
        this.authCredentials = credentials;
    }

    /**
     * Utilidades de formato
     */
    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(valor);
    }

    /**
     * Muestra mensajes al usuario
     */
    mostrarMensaje(mensaje, tipo = 'info') {
        // Delegar a función global si existe
        if (window.showAlert) {
            window.showAlert(mensaje, tipo);
        } else {
            console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        }
    }

    /**
     * Valida si se puede procesar pago con cuenta corriente (para integración con validateAndProcessPayment)
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
            // No validar saldo suficiente - permitir registrar la factura y crear la deuda
            if (totalToPay <= 0) {
                this.mostrarMensaje('El carrito está vacío', 'warning');
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
     * Verifica si hay montos pagados en métodos tradicionales
     */
    tieneMontosPagados(selectedPaymentMethods) {
        return Object.values(selectedPaymentMethods).some(amount => parseFloat(amount) > 0);
    }

    /**
     * Procesa pago integrado con cuenta corriente (para integración con processPayment)
     */
    async procesarPagoIntegrado(totalToPay, paymentDetails, tempCredentials) {
        // Si incluye cuenta corriente, procesar el cargo primero
        const cuentaCorrientePayment = paymentDetails.find(p => p.metodo === 'cuenta_corriente');
        if (cuentaCorrientePayment) {
            try {
                const cargoResponse = await fetch(`${this.API_BASE}/cuenta-corriente/cargo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + btoa(tempCredentials.username + ':' + tempCredentials.password)
                    },
                    body: JSON.stringify({
                        cliente_id: this.estado.cliente.id,
                        monto: cuentaCorrientePayment.monto,
                        descripcion: `Cargo por venta ${new Date().toLocaleDateString('es-AR')}`
                    })
                });

                if (!cargoResponse.ok) {
                    const errorData = await cargoResponse.json();
                    throw new Error(errorData.error || 'Error al procesar cargo a cuenta corriente');
                }

                const cargoData = await cargoResponse.json();
                console.log('Cargo a cuenta corriente procesado:', cargoData);

                // Actualizar el numero_factura para la venta
                return cargoData.numero_factura;

            } catch (cargoError) {
                this.mostrarMensaje('❌ Error al procesar cargo a cuenta corriente: ' + cargoError.message, 'error');
                throw cargoError;
            }
        }

        return null;
    }

    /**
     * Limpia el estado después de un pago exitoso
     */
    limpiarDespuesPago() {
        if (this.estado.activa) {
            this.estado.cliente = null;
            this.estado.activa = false;
            this.estado.saldo = 0;
            this.estado.saldoCargado = false;

            // Limpiar interfaz
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
    window.CuentaCorrienteManager = CuentaCorrienteManager;
}