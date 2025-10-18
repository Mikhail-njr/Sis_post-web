/**
 * @fileoverview Script principal de la aplicación.
 * @author Tu Nombre
 */

// alert('Script loaded');

// Variables globales
let cart = [];
let selectedProduct = null;
let selectedPaymentMethod = null;
let isLoggedIn = false;
let authCredentials = null;
const API_BASE = window.location.protocol + '//' + window.location.host + '/api';

// Funciones de autenticación
function login() {
    const credentials = prompt('Ingrese usuario y contraseña separados por ":"');
    if (credentials) {
        const [username, password] = credentials.split(':');
        if (username && password) {
            authCredentials = { username, password };
            isLoggedIn = true;
            sessionStorage.setItem('authCredentials', JSON.stringify(authCredentials));
            updateUIBasedOnAuth();
            showAlert('✅ Sesión iniciada correctamente', 'success');
            return true;
        }
    }
    showAlert('❌ Credenciales inválidas', 'error');
    return false;
}

function logout() {
    authCredentials = null;
    isLoggedIn = false;
    sessionStorage.removeItem('authCredentials');
    updateUIBasedOnAuth();
    showAlert('👋 Sesión cerrada', 'success');
}

function accessDashboard() {
    if (!isLoggedIn) {
        if (login()) {
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'dashboard.html';
    }
}

function updateUIBasedOnAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const payBtn = document.getElementById('payBtn');

    if (loginBtn) {
        loginBtn.textContent = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión';
        loginBtn.onclick = isLoggedIn ? logout : login;
    }

    if (dashboardBtn) {
        dashboardBtn.style.display = 'inline-block'; // Siempre visible
    }

    if (payBtn) {
        payBtn.disabled = !isLoggedIn;
        payBtn.textContent = isLoggedIn ? 'Pagar' : 'Simular Pago';
        payBtn.onclick = isLoggedIn ? () => {
            // Use the local processPayment function if it exists, otherwise use the global one
            if (typeof window.processPayment === 'function') {
                window.processPayment();
            } else {
                processPayment();
            }
        } : () => {
            // Use the local simulatePayment function if it exists, otherwise use the global one
            if (typeof window.simulatePayment === 'function') {
                window.simulatePayment();
            } else {
                simulatePayment();
            }
        };
    }
}

function simulatePayment() {
    if (cart.length === 0) {
        showAlert('❌ El carrito está vacío', 'error');
        return;
    }

    if (!selectedPaymentMethod) {
        showAlert('❌ Por favor selecciona un método de pago', 'error');
        return;
    }

    // Calcular total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0);

    // Generar factura simulada detallada
    const invoiceNumber = `SIM-${Date.now()}`;
    let invoiceDetails = `🎭 SIMULACIÓN DE COMPRA\n\n`;
    invoiceDetails += `Factura: ${invoiceNumber}\n`;
    invoiceDetails += `Fecha: ${new Date().toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })}\n`;

    // Formatear método de pago
    let paymentMethodText = 'No especificado';
    if (selectedPaymentMethod) {
        paymentMethodText = selectedPaymentMethod.toUpperCase();
    }
    invoiceDetails += `Método de Pago: ${paymentMethodText}\n\n`;
    invoiceDetails += `PRODUCTOS:\n`;

    cart.forEach((item, index) => {
        const subtotal = parseFloat(item.precio) * item.quantity;
        invoiceDetails += `${index + 1}. ${item.nombre}\n`;
        invoiceDetails += `   Código: ${item.codigo}\n`;
        invoiceDetails += `   Cantidad: ${item.quantity} × ${formatCurrency(item.precio)} = ${formatCurrency(subtotal)}\n\n`;
    });

    invoiceDetails += `TOTAL: ${formatCurrency(total)}\n\n`;
    invoiceDetails += `⚠️ ESTA ES UNA SIMULACIÓN - No se procesó ningún pago real`;

    // Mostrar factura en alert
    alert(invoiceDetails);

    // Limpiar carrito
    cart = [];
    updateCart();
}

// Cargar credenciales al iniciar
function loadAuthFromStorage() {
    const stored = sessionStorage.getItem('authCredentials');
    if (stored) {
        authCredentials = JSON.parse(stored);
        isLoggedIn = true;
    }
    updateUIBasedOnAuth();
}

// Función para hacer requests a la API
async function apiRequest(endpoint, options = {}) {
    try {
        console.log('Enviando datos a la API:', endpoint, options);

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Agregar autenticación si está disponible
        if (authCredentials) {
            headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: headers,
            ...options
        });

        if (response.status === 401) {
            // Autenticación requerida
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida. Por favor inicie sesión.');
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en API request:', error);
        throw error;
    }
}

// Formatear moneda (formato argentino)
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

// Funciones searchProducts y displayResults se definen en cada página específica

// Función selectProduct se define en cada página específica (index.html, dashboard.html)

// Funciones de carrito se definen en index.html

// Funciones de pago se definen en index.html

// Función showAlert se define en cada página específica
// Función resetSystem se define en index.html

// Event listeners se definen en cada página específica
// Funciones de autenticación se definen en cada página específica

// Funciones específicas para el dashboard
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Obtener y mostrar métricas
        fetchMetrics();
        
        // Configurar evento para cierre de caja
        const closeRegisterBtn = document.getElementById('closeRegisterBtn');
        if (closeRegisterBtn) {
            closeRegisterBtn.addEventListener('click', performCloseRegister);
        }
    });
}

// Obtener y mostrar métricas de ventas
async function fetchMetrics() {
    try {
        // Obtener estadísticas
        const statsResponse = await apiRequest('/stats');
        
        // Mostrar productos más vendidos
        const topProductsTable = document.getElementById('top-products-table');
        if (topProductsTable) {
            const tbody = topProductsTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            statsResponse.top_products.forEach((product, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${product.nombre}</td>
                    <td>${product.codigo}</td>
                    <td>${product.total_vendido}</td>
                `;
                tbody.appendChild(row);
            });
        }

        // Obtener historial de cierres
        const cierresResponse = await apiRequest('/cierres');
        const historialTable = document.getElementById('historial-cierres-table');
        if (historialTable) {
            const tbody = historialTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            cierresResponse.forEach(cierre => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(cierre.fecha).toLocaleString('es-AR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    })}</td>
                    <td>${formatCurrency(cierre.dinero_inicial)}</td>
                    <td>${formatCurrency(cierre.total_ventas)}</td>
                    <td>${formatCurrency(cierre.total_esperado)}</td>
                    <td>${formatCurrency(cierre.diferencia)}</td>
                    <td>${cierre.cantidad_ventas}</td>
                `;
                tbody.appendChild(row);
            });
            historialTable.style.display = 'table';
            document.querySelector('#historial-cierres-section .loading').style.display = 'none';
        }
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
    }
}

// Funciones para manejar el modal de cierre de caja
async function openCierreModal() {
    // Mostrar sección de entrada, ocultar resultados
    document.getElementById('cierre-input-section').style.display = 'block';
    document.getElementById('cierre-results-section').style.display = 'none';

    // Obtener dinero inicial
    const dineroInicial = document.getElementById('dineroInicial').value;

    if (!dineroInicial || isNaN(parseFloat(dineroInicial))) {
        showAlert('❌ Primero ingrese el dinero inicial', 'error');
        return;
    }

    try {
        // Obtener ventas del día para calcular el esperado
        const salesResponse = await apiRequest('/sales');
        const today = new Date().toISOString().split('T')[0];
        const todaySales = salesResponse.filter(sale => sale.fecha.startsWith(today));

        // Calcular total de ventas del día
        const totalVentas = todaySales.reduce((sum, sale) => sum + sale.total, 0);

        // Calcular dinero esperado
        const dineroEsperado = parseFloat(dineroInicial) + totalVentas;

        // Poner el valor esperado como sugerencia en el campo
        document.getElementById('dineroContado').value = dineroEsperado.toFixed(2).replace('.', ',');

    } catch (error) {
        console.error('Error calculando dinero esperado:', error);
        document.getElementById('dineroContado').value = '0,00';
    }

    // Cambiar botones a modo entrada
    const buttonGroup = document.querySelector('#cierreModal .button-group');
    buttonGroup.innerHTML = `
        <button type="button" class="btn btn-primary" onclick="performCloseRegister()">Realizar Cierre</button>
        <button type="button" class="btn btn-secondary" onclick="closeCierreModal()">Cancelar</button>
    `;

    document.getElementById('cierreModal').classList.add('show');
}

function closeCierreModal() {
    document.getElementById('cierreModal').classList.remove('show');
}

// Variable global para almacenar los datos del cierre calculado
let cierreCalculadoData = null;

// Calcular cierre de caja (muestra preview)
async function calculateCloseRegister() {
    try {
        const dineroInicial = document.getElementById('dineroInicial').value;

        if (!dineroInicial || isNaN(parseFloat(dineroInicial)) || parseFloat(dineroInicial) < 0) {
            throw new Error('Por favor ingrese un monto inicial válido');
        }

        // Calcular datos del cierre sin guardarlo aún
        const response = await apiRequest('/close-register-preview', {
            method: 'POST',
            body: JSON.stringify({
                fecha: new Date().toISOString(),
                dineroInicial: dineroInicial
            })
        });

        // Almacenar datos calculados
        cierreCalculadoData = response;

        // Mostrar resultados en el modal
        document.getElementById('cierre-inicial').textContent = formatCurrency(response.dinero_inicial);
        document.getElementById('cierre-total').textContent = formatCurrency(response.total);
        document.getElementById('cierre-esperado').textContent = formatCurrency(response.total_esperado);
        document.getElementById('cierre-diferencia').textContent = formatCurrency(response.diferencia);
        document.getElementById('cierre-cantidad').textContent = response.cantidad_ventas;
        document.getElementById('cierre-fecha').textContent = new Date(response.fecha).toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Mostrar totales por método de pago
        const paymentTotalsDiv = document.getElementById('cierre-payment-totals');
        if (response.payment_totals && Object.keys(response.payment_totals).length > 0) {
            const paymentList = Object.entries(response.payment_totals)
                .map(([method, amount]) => `<p><strong>${method}:</strong> ${formatCurrency(amount)}</p>`)
                .join('');
            paymentTotalsDiv.innerHTML = paymentList;
            paymentTotalsDiv.style.display = 'block';
        } else {
            paymentTotalsDiv.style.display = 'none';
        }

        // Mostrar resultados
        document.getElementById('cierre-input-section').style.display = 'none';
        document.getElementById('cierre-results-section').style.display = 'block';

        // Cambiar botones del modal a "Confirmar Cierre" y "Cancelar"
        const buttonGroup = document.querySelector('#cierreModal .button-group');
        buttonGroup.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="confirmCloseRegister()">Confirmar Cierre</button>
            <button type="button" class="btn btn-secondary" onclick="closeCierreModal()">Cancelar</button>
        `;

        // Abrir modal con resultados
        document.getElementById('cierreModal').classList.add('show');

    } catch (error) {
        console.error('Error calculando cierre de caja:', error);
        showAlert('❌ Error al calcular cierre de caja: ' + error.message, 'error');
    }
}

// Confirmar y guardar cierre de caja
async function confirmCloseRegister() {
    try {
        if (!cierreCalculadoData) {
            throw new Error('No hay datos de cierre calculados');
        }

        // Guardar el cierre usando los datos ya calculados
        const response = await apiRequest('/close-register-confirm', {
            method: 'POST',
            body: JSON.stringify(cierreCalculadoData)
        });

        // Limpiar datos calculados
        cierreCalculadoData = null;

        // Cambiar botón a "Cerrar"
        const buttonGroup = document.querySelector('#cierreModal .button-group');
        buttonGroup.innerHTML = '<button type="button" class="btn btn-secondary" onclick="closeCierreModal()">Cerrar</button>';

        showAlert('✅ Cierre de caja confirmado y registrado correctamente', 'success');

        // Recargar métricas para actualizar el historial
        fetchMetrics();

    } catch (error) {
        console.error('Error confirmando cierre de caja:', error);
        showAlert('❌ Error al confirmar cierre de caja: ' + error.message, 'error');
    }
}

// Alias para mantener compatibilidad
async function performCloseRegister() {
    await calculateCloseRegister();
}

// Función para resetear datos
async function resetData() {
    // Pedir credenciales de administrador
    const username = prompt('Usuario administrador:');
    if (!username) return;

    const password = prompt('Contraseña:');
    if (!password) return;

    // Verificar credenciales
    if (username !== 'admin' || password !== 'pos123') {
        showAlert('❌ Credenciales incorrectas', 'error');
        return;
    }

    if (!confirm('¿Estás seguro de resetear todos los datos de ventas y cierres de caja? Los productos permanecerán intactos.')) {
        return;
    }

    try {
        const response = await apiRequest('/reset-data', {
            method: 'POST'
        });

        showAlert('✅ Datos reseteados exitosamente', 'success');

        // Recargar métricas y datos
        fetchMetrics();

    } catch (error) {
        console.error('Error reseteando datos:', error);
        showAlert('❌ Error al resetear datos: ' + error.message, 'error');
    }
}

// Cerrar modal al hacer clic fuera (solo si existe en dashboard)
const cierreModal = document.getElementById('cierreModal');
if (cierreModal) {
    cierreModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeCierreModal();
        }
    });
}

// >>> FUNCIONES PARA PROVEEDORES (SUPPLIERS)

// Cargar proveedores al iniciar dashboard
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Obtener y mostrar métricas
        fetchMetrics();

        // Configurar evento para cierre de caja
        const closeRegisterBtn = document.getElementById('closeRegisterBtn');
        if (closeRegisterBtn) {
            closeRegisterBtn.addEventListener('click', performCloseRegister);
        }

        // Cargar proveedores
        fetchSuppliers();
    });
}

// Obtener y mostrar proveedores
async function fetchSuppliers() {
    try {
        const suppliers = await apiRequest('/suppliers');
        displaySuppliersTable(suppliers);
    } catch (error) {
        console.error('Error obteniendo proveedores:', error);
        const proveedoresSection = document.querySelector('#proveedores-section');
        if (proveedoresSection) {
            proveedoresSection.innerHTML = '<div class="error">Error al cargar proveedores. Asegúrate de que el servidor esté activo.</div>';
        }
    }
}

// Mostrar tabla de proveedores
function displaySuppliersTable(suppliers) {
    const container = document.querySelector('#proveedores-section');
    const table = document.querySelector('#proveedores-table');
    const loading = container ? container.querySelector('.loading') : null;

    if (!container || !table) {
        console.warn('Proveedores container or table not found');
        return;
    }

    if (suppliers && suppliers.length > 0) {
        table.style.display = 'table';
        if (loading) loading.style.display = 'none';

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        suppliers.forEach(supplier => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supplier.id}</td>
                <td>${supplier.nombre_proveedor}</td>
                <td>${supplier.nombre_contacto || ''}</td>
                <td>${supplier.telefono || ''}</td>
                <td>${supplier.email || ''}</td>
                <td>${supplier.productos_servicios || ''}</td>
                <td>${supplier.condiciones_pago || ''}</td>
                <td>${supplier.estatus || 'Activo'}</td>
                <td>
                    <button class="edit-button" onclick="editSupplier(${supplier.id})">Editar</button>
                    <button class="btn btn-secondary" onclick="deleteSupplier(${supplier.id})" style="background: #dc3545; color: white; margin-left: 5px;">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } else {
        table.style.display = 'none';
        if (loading) {
            loading.textContent = 'No hay proveedores registrados.';
            loading.style.display = 'block';
        }
    }
}

// Funciones para modales de proveedores
function openAddSupplierModal() {
    document.getElementById('addSupplierForm').reset();
    document.getElementById('addSupplierModal').classList.add('show');
}

function closeAddSupplierModal() {
    document.getElementById('addSupplierModal').classList.remove('show');
    document.getElementById('addSupplierForm').reset();
}

function closeEditSupplierModal() {
    document.getElementById('editSupplierModal').classList.remove('show');
    document.getElementById('editSupplierForm').reset();
}

// Editar proveedor
async function editSupplier(supplierId) {
    try {
        const supplier = await apiRequest(`/suppliers/${supplierId}`);

        // Llenar el formulario con los datos actuales
        document.getElementById('editSupplierId').value = supplier.id;
        document.getElementById('editNombreProveedor').value = supplier.nombre_proveedor;
        document.getElementById('editNombreContacto').value = supplier.nombre_contacto || '';
        document.getElementById('editTelefono').value = supplier.telefono || '';
        document.getElementById('editEmail').value = supplier.email || '';
        document.getElementById('editProductosServicios').value = supplier.productos_servicios || '';
        document.getElementById('editCondicionesPago').value = supplier.condiciones_pago || '';
        document.getElementById('editEstatus').value = supplier.estatus || 'Activo';
        document.getElementById('editNotas').value = supplier.notas || '';

        // Mostrar el modal
        document.getElementById('editSupplierModal').classList.add('show');

    } catch (error) {
        console.error('Error al cargar proveedor para editar:', error);
        alert('Error al cargar el proveedor para editar');
    }
}

// Eliminar proveedor
async function deleteSupplier(supplierId) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) {
        return;
    }

    try {
        await apiRequest(`/suppliers/${supplierId}`, {
            method: 'DELETE'
        });

        showAlert('✅ Proveedor eliminado exitosamente', 'success');
        fetchSuppliers(); // Recargar la lista

    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showAlert('❌ Error al eliminar proveedor: ' + error.message, 'error');
    }
}

// Event listeners para formularios de proveedores (solo si existen en dashboard)
document.addEventListener('DOMContentLoaded', function() {
    // Formulario de agregar proveedor
    const addSupplierForm = document.getElementById('addSupplierForm');
    if (addSupplierForm) {
        addSupplierForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = {
                nombre_proveedor: document.getElementById('addNombreProveedor').value.trim(),
                nombre_contacto: document.getElementById('addNombreContacto').value.trim(),
                telefono: document.getElementById('addTelefono').value.trim(),
                email: document.getElementById('addEmail').value.trim(),
                productos_servicios: document.getElementById('addProductosServicios').value.trim(),
                condiciones_pago: document.getElementById('addCondicionesPago').value.trim(),
                estatus: document.getElementById('addEstatus').value,
                notas: document.getElementById('addNotas').value.trim()
            };

            try {
                await apiRequest('/suppliers', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                closeAddSupplierModal();
                showAlert('✅ Proveedor creado exitosamente', 'success');
                fetchSuppliers(); // Recargar la lista

            } catch (error) {
                console.error('Error creando proveedor:', error);
                showAlert('❌ Error al crear proveedor: ' + error.message, 'error');
            }
        });
    }

    // Formulario de editar proveedor
    const editSupplierForm = document.getElementById('editSupplierForm');
    if (editSupplierForm) {
        editSupplierForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const supplierId = document.getElementById('editSupplierId').value;
            const formData = {
                nombre_proveedor: document.getElementById('editNombreProveedor').value.trim(),
                nombre_contacto: document.getElementById('editNombreContacto').value.trim(),
                telefono: document.getElementById('editTelefono').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                productos_servicios: document.getElementById('editProductosServicios').value.trim(),
                condiciones_pago: document.getElementById('editCondicionesPago').value.trim(),
                estatus: document.getElementById('editEstatus').value,
                notas: document.getElementById('editNotas').value.trim()
            };

            try {
                await apiRequest(`/suppliers/${supplierId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });

                closeEditSupplierModal();
                showAlert('✅ Proveedor actualizado exitosamente', 'success');
                fetchSuppliers(); // Recargar la lista

            } catch (error) {
                console.error('Error actualizando proveedor:', error);
                showAlert('❌ Error al actualizar proveedor: ' + error.message, 'error');
            }
        });
    }

    // Cerrar modales de proveedores al hacer clic fuera (solo si existen)
    const addSupplierModal = document.getElementById('addSupplierModal');
    if (addSupplierModal) {
        addSupplierModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddSupplierModal();
            }
        });
    }

    const editSupplierModal = document.getElementById('editSupplierModal');
    if (editSupplierModal) {
        editSupplierModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditSupplierModal();
            }
        });
    }
});