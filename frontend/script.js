// Inicialización del script - funciones de carga se ejecutan según sea necesario
console.log('Script.js cargado correctamente');

// >>> FUNCIONES PARA SISTEMA DE DEUDAS (CUENTA CORRIENTE)

/**
 * Función para cargar y mostrar clientes con deudas
 */
async function cargarClientesDeudas() {
    try {
        const loading = document.querySelector('#clientes-cuentacorriente-section .loading');
        if (loading) loading.style.display = 'block';
        
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers/debts-summary`, { headers });
        if (!response.ok) throw new Error('Error al obtener deudas');
        
        const clientesConDeudas = await response.json();
        mostrarTablaClientesDeudas(clientesConDeudas);
        
        if (loading) loading.style.display = 'none';
        document.getElementById('clientes-deudas-table').style.display = 'table';
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar clientes con deudas', 'error');
    }
}

/**
 * Función para mostrar tabla de clientes con deudas
 * @param {Array} clientes - Array de clientes con deudas
 */
function mostrarTablaClientesDeudas(clientes) {
    const tbody = document.querySelector('#clientes-deudas-table tbody');
    tbody.innerHTML = '';
    
    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No hay clientes con deudas</td></tr>';
        return;
    }
    
    clientes.forEach(cliente => {
        const totalDeuda = cliente.deudas ? cliente.deudas.reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        const deudaPendiente = cliente.deudas ? cliente.deudas.filter(d => d.estado === 'pendiente').reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        const deudaVencida = cliente.deudas ? cliente.deudas.filter(d => d.estado === 'vencida').reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #ddd';
        row.innerHTML = `
            <td style="padding:10px;">${cliente.id}</td>
            <td style="padding:10px;"><strong>${cliente.nombre}</strong></td>
            <td style="padding:10px;">${cliente.telefono || '-'}</td>
            <td style="padding:10px;">${cliente.dni || '-'}</td>
            <td style="padding:10px;">${cliente.direccion || '-'}</td>
            <td style="padding:10px; text-align:right; font-weight:bold; color:#e74c3c;">${formatCurrency(totalDeuda)}</td>
            <td style="padding:10px; text-align:right; color:#667eea;">${formatCurrency(deudaPendiente)}</td>
            <td style="padding:10px; text-align:right; color:#dc3545;">${formatCurrency(deudaVencida)}</td>
            <td style="padding:10px; text-align:center;">
                <button onclick="verDeudas(${cliente.id}, '${cliente.nombre}')" style="padding:6px 10px; margin:2px; background:#17a2b8; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💳 Ver</button>
                <button onclick="editarDeuda(${cliente.id})" style="padding:6px 10px; margin:2px; background:#ffc107; color:black; border:none; border-radius:4px; cursor:pointer; font-size:11px;">✏️ Editar</button>
                <button onclick="eliminarDeuda(${cliente.id})" style="padding:6px 10px; margin:2px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">🗑️ Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Función para ver deudas de un cliente específico
 * @param {number} clienteId - ID del cliente
 * @param {string} clienteNombre - Nombre del cliente
 */
async function verDeudas(clienteId, clienteNombre) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers/${clienteId}/debts-with-products`, { headers });
        if (!response.ok) throw new Error('Error al obtener deudas');
        
        const deudas = await response.json();
        let montoTotalActual = 0;
        
        let contenidoDeudas = deudas.map(deuda => {
            let montoDeudaActual = 0;
            const productosHTML = (deuda.productos || []).map(prod => {
                const precioActual = prod.precio_actual || prod.precio_unitario;
                const subtotalActual = prod.cantidad * precioActual;
                montoDeudaActual += subtotalActual;
                const cambio = subtotalActual - prod.subtotal;
                
                return `
                    <tr style="border-bottom:1px solid #ddd;">
                        <td style="padding:8px;">${prod.producto_id}</td>
                        <td style="padding:8px;">${prod.producto_nombre}</td>
                        <td style="padding:8px; text-align:center;">${prod.cantidad}</td>
                        <td style="padding:8px; text-align:right;">${formatCurrency(prod.precio_unitario)}</td>
                        <td style="padding:8px; text-align:right; font-weight:bold;">${formatCurrency(precioActual)}</td>
                        <td style="padding:8px; text-align:right; font-weight:bold; color:${cambio > 0 ? '#dc3545' : '#28a745'};">${formatCurrency(subtotalActual)}</td>
                    </tr>
                `;
            }).join('');
            
            montoTotalActual += montoDeudaActual;
            
            return `
                <div style="margin-bottom:20px; padding:15px; background:#f8f9fa; border-radius:8px;">
                    <h4>Deuda ID: ${deuda.id} - ${deuda.estado}</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead style="background:#e9ecef;">
                            <tr><th style="padding:8px; text-align:left;">Prod ID</th><th style="padding:8px;">Producto</th><th style="padding:8px;">Cant</th><th style="padding:8px;">Precio Original</th><th style="padding:8px;">Precio Actual</th><th style="padding:8px;">Subtotal</th></tr>
                        </thead>
                        <tbody>${productosHTML}</tbody>
                    </table>
                </div>
            `;
        }).join('');
        
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';
        modal.innerHTML = `
            <div style="background:white; border-radius:12px; padding:30px; max-width:900px; width:95vw; max-height:90vh; overflow-y:auto;">
                <button onclick="this.closest('.edit-modal').remove()" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:22px; cursor:pointer;">×</button>
                <h3>Deudas de ${clienteNombre}</h3>
                <div style="margin:20px 0; padding:15px; background:#fff3cd; border-radius:8px; border:1px solid #ffc107;">
                    <strong>MONTO TOTAL ADEUDADO:</strong> <span style="font-size:18px; color:#e74c3c; font-weight:bold;">${formatCurrency(montoTotalActual)}</span>
                    <br><small style="color:#856404;">Precios calculados con valores actuales de BD</small>
                </div>
                ${contenidoDeudas}
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button onclick="this.closest('.edit-modal').remove()" class="btn btn-secondary" style="flex:1; padding:10px;">Cerrar</button>
                    <button onclick="actualizarDeuda(${clienteId})" class="btn btn-primary" style="flex:1; padding:10px;">Aplicar Actualización</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar deudas', 'error');
    }
}

/**
 * Función para actualizar deudas con precios actuales
 * @param {number} clienteId - ID del cliente
 */
async function actualizarDeuda(clienteId) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers/${clienteId}/update-debts`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({})
        });
        
        if (!response.ok) throw new Error('Error al actualizar');
        
        showAlert('Deudas actualizadas con precios actuales', 'success');
        document.querySelector('.edit-modal')?.remove();
        cargarClientesDeudas();
        
    } catch (error) {
        showAlert('Error al actualizar deudas', 'error');
    }
}

/**
 * Función para editar deuda (placeholder)
 * @param {number} clienteId - ID del cliente
 */
function editarDeuda(clienteId) {
    showAlert('Función en desarrollo', 'info');
}

/**
 * Función para eliminar deuda (placeholder)
 * @param {number} clienteId - ID del cliente
 */
function eliminarDeuda(clienteId) {
    showAlert('Función en desarrollo', 'info');
}

/**
 * Función para crear una nueva deuda (venta a cuenta corriente)
 * @param {Object} deudaData - Datos de la deuda a crear
 */
async function crearDeuda(deudaData) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/sales/credit-account`, {
            method: 'POST',
            headers,
            body: JSON.stringify(deudaData)
        });
        
        if (!response.ok) throw new Error('Error al crear deuda');
        
        const result = await response.json();
        showAlert('Deuda creada exitosamente', 'success');
        return result;
        
    } catch (error) {
        console.error('Error creando deuda:', error);
        showAlert('Error al crear deuda: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Función para obtener clientes para selección en deudas
 */
async function obtenerClientesParaDeuda() {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers`, { headers });
        if (!response.ok) throw new Error('Error al obtener clientes');
        
        const clientes = await response.json();
        return clientes;
        
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        showAlert('Error al obtener clientes: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Función para validar datos de deuda
 * @param {Object} deudaData - Datos de la deuda
 * @returns {Array} - Array de errores
 */
function validarDatosDeuda(deudaData) {
    const errores = [];
    
    if (!deudaData.cliente_id) {
        errores.push('Debe seleccionar un cliente');
    }
    
    if (!deudaData.productos || deudaData.productos.length === 0) {
        errores.push('Debe agregar al menos un producto');
    } else {
        deudaData.productos.forEach((producto, index) => {
            if (!producto.producto_id) {
                errores.push(`Producto ${index + 1}: debe seleccionar un producto`);
            }
            if (!producto.cantidad || producto.cantidad <= 0) {
                errores.push(`Producto ${index + 1}: la cantidad debe ser mayor a 0`);
            }
            if (!producto.precio_unitario || producto.precio_unitario <= 0) {
                errores.push(`Producto ${index + 1}: el precio debe ser mayor a 0`);
            }
        });
    }
    
    return errores;
}

/**
 * Función para mostrar formulario de creación de deuda
 */
function mostrarFormularioDeuda() {
    // Esta función puede ser implementada para mostrar un modal con formulario
    // para crear una nueva deuda a partir de productos seleccionados
    showAlert('Función de creación de deuda en desarrollo', 'info');
}

/**
 * Función para cargar sección de deudas (lazy loading)
 */
async function loadDeudasSection(contentElement) {
    console.log('Cargando sección de deudas (lazy loading)');
    
    try {
        // Verificar si el contenedor está listo
        const deudasSection = document.getElementById('clientes-cuentacorriente-section');
        const deudasTable = document.getElementById('clientes-deudas-table');
        
        if (!deudasSection || !deudasTable) {
            console.warn('⚠️ Contenedores de deudas no están listos, agregando a cola de renderizado');
            RenderQueue.add('deudas', () => loadDeudasSection(contentElement));
            return;
        }
        
        // Cargar deudas
        await cargarClientesDeudas();
        
    } catch (error) {
        console.error('❌ Error cargando sección de deudas:', error);
        const loadingElement = contentElement.querySelector('.loading');
        if (loadingElement) {
            loadingElement.textContent = 'Error al cargar la sección de deudas';
        }
    }
}

/**
 * Función para refrescar datos de deudas
 */
async function refrescarDeudas() {
    try {
        // Invalidar caché de deudas
        LoadingSystem.cache.invalidate('deudas');
        
        // Recargar deudas
        await cargarClientesDeudas();
        
        showAlert('Datos de deudas actualizados', 'success');
        
    } catch (error) {
        console.error('Error refrescando deudas:', error);
        showAlert('Error al refrescar deudas', 'error');
    }
}

/**
 * Función para exportar deudas a CSV
 * @param {Array} clientes - Array de clientes con deudas
 */
function exportarDeudasCSV(clientes) {
    if (!clientes || clientes.length === 0) {
        showAlert('No hay datos para exportar', 'warning');
        return;
    }
    
    // Crear encabezados CSV
    const headers = ['ID Cliente', 'Nombre', 'Teléfono', 'DNI', 'Dirección', 'Total Deuda', 'Deuda Pendiente', 'Deuda Vencida'];
    const csvContent = [headers.join(','), ...clientes.map(cliente => {
        const totalDeuda = cliente.deudas ? cliente.deudas.reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        const deudaPendiente = cliente.deudas ? cliente.deudas.filter(d => d.estado === 'pendiente').reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        const deudaVencida = cliente.deudas ? cliente.deudas.filter(d => d.estado === 'vencida').reduce((sum, d) => sum + d.monto_pendiente, 0) : 0;
        
        return [
            cliente.id,
            `"${cliente.nombre}"`,
            `"${cliente.telefono || ''}"`,
            `"${cliente.dni || ''}"`,
            `"${cliente.direccion || ''}"`,
            totalDeuda,
            deudaPendiente,
            deudaVencida
        ].join(',');
    })].join('\n');
    
    // Crear enlace de descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deudas_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Exportación completada', 'success');
}

/**
 * Función para buscar clientes con deudas por nombre o ID
 * @param {string} query - Término de búsqueda
 */
async function buscarClientesConDeudas(query) {
    try {
        if (!query || query.trim().length < 2) {
            // Si la búsqueda es corta, recargar todos los clientes
            await cargarClientesDeudas();
            return;
        }
        
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers/debts-summary?search=${encodeURIComponent(query)}`, { headers });
        if (!response.ok) throw new Error('Error al buscar clientes');
        
        const clientes = await response.json();
        mostrarTablaClientesDeudas(clientes);
        
    } catch (error) {
        console.error('Error buscando clientes con deudas:', error);
        showAlert('Error al buscar clientes: ' + error.message, 'error');
    }
}

/**
 * Función para generar reporte de deudas
 */
async function generarReporteDeudas() {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/customers/debts-summary`, { headers });
        if (!response.ok) throw new Error('Error al generar reporte');
        
        const clientes = await response.json();
        
        // Crear reporte resumido
        const totalDeudores = clientes.length;
        const montoTotal = clientes.reduce((sum, c) => sum + (c.deudas ? c.deudas.reduce((sum2, d) => sum2 + d.monto_pendiente, 0) : 0), 0);
        const deudaPromedio = totalDeudores > 0 ? montoTotal / totalDeudores : 0;
        
        const reporte = `
            📊 REPORTE DE DEUDAS
            ====================
            
            Total de Clientes con Deudas: ${totalDeudores}
            Monto Total Adeudado: ${formatCurrency(montoTotal)}
            Deuda Promedio por Cliente: ${formatCurrency(deudaPromedio)}
            
            Detalle por Cliente:
            ${clientes.map(c => `
                ${c.nombre} (${c.dni || 'Sin DNI'})
                Total Adeudado: ${formatCurrency(c.deudas ? c.deudas.reduce((sum, d) => sum + d.monto_pendiente, 0) : 0)}
            `).join('')}
        `;
        
        // Mostrar reporte en modal
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';
        modal.innerHTML = `
            <div style="background:white; border-radius:12px; padding:30px; max-width:700px; width:95vw; max-height:90vh; overflow-y:auto;">
                <button onclick="this.closest('.edit-modal').remove()" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:22px; cursor:pointer;">×</button>
                <h3>Reporte de Deudas</h3>
                <pre style="background:#f8f9fa; padding:20px; border-radius:8px; white-space:pre-wrap; font-family: Arial, sans-serif;">${reporte}</pre>
                <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="this.closest('.edit-modal').remove()" class="btn btn-secondary" style="padding:10px 20px;">Cerrar</button>
                    <button onclick="exportarDeudasCSV(${JSON.stringify(clientes)})" class="btn btn-primary" style="padding:10px 20px;">Exportar CSV</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
    } catch (error) {
        console.error('Error generando reporte de deudas:', error);
        showAlert('Error al generar reporte: ' + error.message, 'error');
    }
}

// Exportar funciones para uso global
window.cargarClientesDeudas = cargarClientesDeudas;
window.mostrarTablaClientesDeudas = mostrarTablaClientesDeudas;
window.verDeudas = verDeudas;
window.actualizarDeuda = actualizarDeuda;
window.editarDeuda = editarDeuda;
window.eliminarDeuda = eliminarDeuda;
window.crearDeuda = crearDeuda;
window.obtenerClientesParaDeuda = obtenerClientesParaDeuda;
window.validarDatosDeuda = validarDatosDeuda;
window.mostrarFormularioDeuda = mostrarFormularioDeuda;
window.loadDeudasSection = loadDeudasSection;
window.refrescarDeudas = refrescarDeudas;
window.exportarDeudasCSV = exportarDeudasCSV;
window.buscarClientesConDeudas = buscarClientesConDeudas;
window.generarReporteDeudas = generarReporteDeudas;

// >>> FUNCIONES PARA PROVEEDORES

// Definir funciones de proveedores globalmente para que estén disponibles inmediatamente
function openAddSupplierModal() {
    const form = document.getElementById('addSupplierForm');
    const modal = document.getElementById('addSupplierModal');
    
    if (form && modal) {
        form.reset();
        modal.classList.add('show');
    } else {
        console.error('⚠️ Elementos del DOM para modal de proveedores no encontrados');
        console.warn('Form:', form, 'Modal:', modal);
    }
}

function closeAddSupplierModal() {
    const modal = document.getElementById('addSupplierModal');
    const form = document.getElementById('addSupplierForm');
    
    if (modal) modal.classList.remove('show');
    if (form) form.reset();
}

function closeEditSupplierModal() {
    const modal = document.getElementById('editSupplierModal');
    const form = document.getElementById('editSupplierForm');
    
    if (modal) modal.classList.remove('show');
    if (form) form.reset();
}

// Editar proveedor
async function editSupplier(supplierId) {
    try {
        const supplier = await window.ApiClient.apiRequest(`/suppliers/${supplierId}`);

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
        showAlert('Error al cargar el proveedor para editar', 'error');
    }
}

// Eliminar proveedor
async function deleteSupplier(supplierId) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) {
        return;
    }

    try {
        await window.ApiClient.apiRequest(`/suppliers/${supplierId}`, {
            method: 'DELETE'
        });

        showAlert('✅ Proveedor eliminado exitosamente', 'success');
        fetchSuppliers(); // Recargar la lista

    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showAlert('❌ Error al eliminar proveedor: ' + error.message, 'error');
    }
}

// Crear nuevo proveedor
async function createSupplier(event) {
    event.preventDefault(); // Evitar el submit tradicional
    
    try {
        // Obtener datos del formulario
        const formData = new FormData(event.target);
        const supplierData = {
            nombre_proveedor: document.getElementById('addNombreProveedor').value.trim(),
            nombre_contacto: document.getElementById('addNombreContacto').value.trim(),
            telefono: document.getElementById('addTelefono').value.trim(),
            email: document.getElementById('addEmail').value.trim(),
            productos_servicios: document.getElementById('addProductosServicios').value.trim(),
            condiciones_pago: document.getElementById('addCondicionesPago').value.trim(),
            estatus: document.getElementById('addEstatus').value,
            notas: document.getElementById('addNotas').value.trim()
        };
        
        // Validaciones
        if (!supplierData.nombre_proveedor) {
            showAlert('El nombre del proveedor es requerido', 'error');
            return;
        }
        
        // Validar email si se proporciona
        if (supplierData.email && !isValidEmail(supplierData.email)) {
            showAlert('El formato del email no es válido', 'error');
            return;
        }
        
        // Validar teléfono si se proporciona (solo números y espacios)
        if (supplierData.telefono && !isValidPhone(supplierData.telefono)) {
            showAlert('El formato del teléfono no es válido (solo números y espacios)', 'error');
            return;
        }
        
        console.log('📦 Creando proveedor con datos:', supplierData);
        
        // Hacer la solicitud al endpoint
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/suppliers`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(supplierData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el proveedor');
        }
        
        const result = await response.json();
        
        console.log('✅ Proveedor creado exitosamente:', result);
        
        // Mostrar mensaje de éxito
        showAlert('✅ Proveedor creado exitosamente', 'success');
        
        // Cerrar el modal
        closeAddSupplierModal();
        
        // Recargar la lista de proveedores
        fetchSuppliers(true); // Forzar actualización
        
    } catch (error) {
        console.error('❌ Error creando proveedor:', error);
        showAlert('❌ Error al crear proveedor: ' + error.message, 'error');
    }
}

// Funciones de validación auxiliares
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Aceptar números, espacios, guiones y paréntesis
    const phoneRegex = /^[0-9\s\-\(\)\+]+$/;
    return phoneRegex.test(phone);
}

// Obtener y mostrar proveedores
async function fetchSuppliers(forceRefresh = false) {
    try {
        // Verificar si DashboardCache está disponible antes de usarlo
        if (!forceRefresh && typeof DashboardCache !== 'undefined') {
            const cachedData = DashboardCache.get();
            if (cachedData && cachedData.suppliers) {
                console.log('✅ Usando datos de proveedores del dashboard cacheado');
                displaySuppliersTable(cachedData.suppliers);
                return;
            }
        }

        // Si no hay datos cacheados o se fuerza refresh, cargar directamente del endpoint
        console.log('⏳ Intentando cargar proveedores directamente del endpoint...');

        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;

        const response = await fetch(`${API_BASE}/suppliers`, { headers });

        if (!response.ok) {
            throw new Error(`Error al cargar proveedores: ${response.status} ${response.statusText}`);
        }

        const suppliers = await response.json();

        // Mostrar los proveedores directamente sin depender del cache del dashboard
        displaySuppliersTable(suppliers);

        console.log('✅ Proveedores cargados exitosamente desde el endpoint directo');

    } catch (error) {
        console.error('❌ Error obteniendo proveedores:', error);
        const proveedoresSection = document.querySelector('#proveedores-section');
        if (proveedoresSection) {
            proveedoresSection.innerHTML = '<div class="error">Error al cargar proveedores. Asegúrate de que el servidor esté activo.</div>';
        }
    }
}

// Variable para prevenir llamadas duplicadas a fetchSupplierOrders
let isFetchingSupplierOrders = false;

// Obtener y mostrar pedidos a proveedores
async function fetchSupplierOrders(forceRefresh = false) {
    // Prevenir llamadas duplicadas
    if (isFetchingSupplierOrders) {
        console.log('🔄 fetchSupplierOrders ya está en ejecución, esperando...');
        return;
    }

    isFetchingSupplierOrders = true;

    try {
        // Usar datos del dashboard si están disponibles y no se fuerza refresh
        if (!forceRefresh) {
            const cachedData = DashboardCache.get();
            if (cachedData && cachedData.supplierOrders) {
                console.log('✅ Usando datos de pedidos del dashboard cacheado');
                displaySupplierOrdersTable(cachedData.supplierOrders);
                return;
            }
        }

        // Si no hay datos cacheados o se fuerza refresh, esperar a que se cargue el dashboard
        console.log('⏳ Esperando datos del dashboard para pedidos...');
        await fetchMetrics(true); // Forzar carga del dashboard

        const freshData = DashboardCache.get();
        if (freshData && freshData.supplierOrders) {
            displaySupplierOrdersTable(freshData.supplierOrders);
        } else {
            throw new Error('No se pudieron obtener datos de pedidos');
        }
    } catch (error) {
        console.error('❌ Error obteniendo pedidos:', error);
        const ordersLoading = document.getElementById('orders-loading');
        if (ordersLoading) {
            ordersLoading.textContent = 'Error al cargar pedidos.';
        }
    } finally {
        isFetchingSupplierOrders = false;
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

// Mostrar tabla de pedidos a proveedores
function displaySupplierOrdersTable(orders) {
    const table = document.getElementById('pedidos-table');
    const loading = document.getElementById('orders-loading');

    if (!table || !loading) {
        console.warn('Pedidos table or loading element not found');
        return;
    }

    if (orders && orders.length > 0) {
        table.style.display = 'table';
        loading.style.display = 'none';

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        orders.forEach(order => {
            const fechaPedido = DateUtils.formatForDisplay(order.fecha_pedido, { dateStyle: 'short' });
            const fechaEntrega = order.fecha_entrega ? DateUtils.formatForDisplay(order.fecha_entrega, { dateStyle: 'short' }) : 'Pendiente';

            let estadoBadge = '';
            switch (order.estado) {
                case 'pendiente':
                    estadoBadge = '<span class="status-badge status-pending">Pendiente</span>';
                    break;
                case 'en_proceso':
                    estadoBadge = '<span class="status-badge status-process">En Proceso</span>';
                    break;
                case 'entregado':
                    estadoBadge = '<span class="status-badge status-delivered">Entregado</span>';
                    break;
                case 'cancelado':
                    estadoBadge = '<span class="status-badge status-cancelled">Cancelado</span>';
                    break;
                default:
                    estadoBadge = `<span class="status-badge">${order.estado}</span>`;
            }

            const row = document.createElement('tr');
            row.setAttribute('data-order-id', order.id);
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.numero_pedido}</td>
                <td>${order.nombre_proveedor}</td>
                <td>${fechaPedido}</td>
                <td>${fechaEntrega}</td>
                <td>${estadoBadge}</td>
                <td>${parseFloat(order.total).toFixed(2).replace('.', ',')}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewOrderDetails(${order.id})" style="font-size: 12px; padding: 4px 8px;">Ver Detalles</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } else {
        table.style.display = 'none';
        loading.textContent = 'No hay pedidos registrados.';
        loading.style.display = 'block';
    }
}

// Exportar funciones de proveedores
window.openAddSupplierModal = openAddSupplierModal;
window.closeAddSupplierModal = closeAddSupplierModal;
window.closeEditSupplierModal = closeEditSupplierModal;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.createSupplier = createSupplier;
window.fetchSuppliers = fetchSuppliers;
window.fetchSupplierOrders = fetchSupplierOrders;
window.displaySuppliersTable = displaySuppliersTable;
window.displaySupplierOrdersTable = displaySupplierOrdersTable;

// >>> FUNCIONES PARA CARGA DE DASHBOARD (MÉTRICAS)

/**
 * Función para cargar datos del dashboard (métricas)
 * @param {boolean} forceRefresh - Si se debe forzar la recarga desde el servidor
 * @returns {Promise<Object>} - Promesa que resuelve con los datos del dashboard
 */
async function fetchMetrics(forceRefresh = false) {
    try {
        // Verificar si ya hay datos cacheados y no se fuerza el refresh
        if (!forceRefresh) {
            const cachedData = DashboardCache.get();
            if (cachedData) {
                console.log('✅ Usando datos del dashboard cacheados');
                return cachedData;
            }
        }
        
        console.log('⏳ Cargando datos del dashboard desde el servidor...');
        
        // Hacer solicitud al endpoint de métricas
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/dashboard-data`, { headers });
        
        if (!response.ok) {
            throw new Error(`Error al cargar métricas: ${response.status} ${response.statusText}`);
        }
        
        const metricsData = await response.json();
        
        // Almacenar en cache
        DashboardCache.set(metricsData);
        
        console.log('✅ Datos del dashboard cargados exitosamente');
        return metricsData;
        
    } catch (error) {
        console.error('❌ Error cargando métricas del dashboard:', error);
        throw error;
    }
}

// >>> FUNCIONES PARA CREACIÓN DE PRODUCTOS (MODAL AGREGAR NUEVO PRODUCTO)

/**
 * Función para validar el formulario antes de enviar
 * @returns {boolean} - True si el formulario es válido, false en caso contrario
 */
function validateProductForm() {
    const categoria = document.getElementById('addCategoria').value.trim();
    const codigo = document.getElementById('addCodigo').value.trim();
    const nombre = document.getElementById('addNombre').value.trim();
    const precio = parseFloat(document.getElementById('addPrecio').value);
    const stock = parseInt(document.getElementById('addStock').value);
    
    // Validar categoría
    if (!categoria) {
        showAlert('La categoría del producto es requerida', 'error');
        return false;
    }
    
    if (categoria.length < 3) {
        showAlert('La categoría debe tener al menos 3 caracteres', 'error');
        return false;
    }
    
    // Validar código generado
    if (!codigo) {
        showAlert('El código del producto no se ha generado. Por favor, seleccione una categoría válida.', 'error');
        return false;
    }
    
    // Validar nombre
    if (!nombre) {
        showAlert('El nombre del producto es requerido', 'error');
        return false;
    }
    
    if (nombre.length < 2) {
        showAlert('El nombre del producto debe tener al menos 2 caracteres', 'error');
        return false;
    }
    
    // Validar precio
    if (isNaN(precio) || precio < 0) {
        showAlert('El precio debe ser un número válido mayor o igual a cero', 'error');
        return false;
    }
    
    // Validar stock
    if (isNaN(stock) || stock < 0) {
        showAlert('El stock debe ser un número válido mayor o igual a cero', 'error');
        return false;
    }
    
    // Validar disponibilidad del código (opcional, no bloqueante)
    const availabilityDiv = document.getElementById('codeAvailability');
    if (availabilityDiv && availabilityDiv.textContent.includes('Código ya existe')) {
        const confirmOverride = confirm('El código generado ya existe. ¿Desea continuar igualmente?');
        if (!confirmOverride) {
            return false;
        }
    }
    
    return true;
}

/**
 * Función para crear un nuevo producto desde el modal
 * @param {Event} event - Evento de submit del formulario
 */
async function createProduct(event) {
    event.preventDefault(); // Evitar el submit tradicional
    
    // Validar formulario antes de proceder
    if (!validateProductForm()) {
        return;
    }
    
    try {
        // Obtener datos del formulario
        const formData = {
            codigo: document.getElementById('addCodigo').value.trim(),
            nombre: document.getElementById('addNombre').value.trim(),
            descripcion: document.getElementById('addDescripcion').value.trim(),
            precio: parseFloat(document.getElementById('addPrecio').value),
            stock: parseInt(document.getElementById('addStock').value),
            categoria: document.getElementById('addCategoria').value.trim(),
            codigo_barras: document.getElementById('addBarcode').value.trim()
        };
        
        console.log('📦 Creando producto con datos:', formData);
        
        // Mostrar indicador de carga
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creando Producto...';
        submitBtn.disabled = true;
        
        // Hacer la solicitud al endpoint
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(formData)
        });
        
        // Restaurar el botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el producto');
        }
        
        const result = await response.json();
        
        console.log('✅ Producto creado exitosamente:', result);
        
        // Mostrar mensaje de éxito
        showAlert('✅ Producto creado exitosamente', 'success');
        
        // Cerrar el modal
        closeAddModal();
        
        // Recargar la lista de productos
        if (typeof fetchAndDisplayData === 'function') {
            fetchAndDisplayData();
        } else {
            console.warn('⚠️ fetchAndDisplayData no está disponible, intentando cargar productos directamente');
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
        }
        
    } catch (error) {
        console.error('❌ Error creando producto:', error);
        showAlert('❌ Error al crear producto: ' + error.message, 'error');
    }
}

/**
 * Función para cerrar el modal de agregar producto
 */
function closeAddModal() {
    const modal = document.getElementById('addModal');
    const form = document.getElementById('addProductForm');
    
    if (modal) modal.classList.remove('show');
    if (form) form.reset();
    
    // Limpiar validación de disponibilidad de código
    const availabilityDiv = document.getElementById('codeAvailability');
    if (availabilityDiv) availabilityDiv.textContent = '';
}

/**
 * Función para generar código de producto automáticamente
 */
async function generateProductCode() {
    const categoriaInput = document.getElementById('addCategoria');
    const codigoInput = document.getElementById('addCodigo');
    const categoria = categoriaInput.value.trim();
    
    if (!categoria) {
        codigoInput.value = '';
        return;
    }
    
    // Validar que la categoría tenga al menos 3 caracteres
    if (categoria.length < 3) {
        showAlert('La categoría debe tener al menos 3 caracteres', 'error');
        codigoInput.value = '';
        return;
    }
    
    // Extraer código de categoría (primera parte antes del guion o las primeras 3 letras)
    let categoriaCode = categoria.split(' - ')[0] || categoria.split(' ')[0];
    
    // Si el código es muy corto, usar las primeras 3 letras en mayúsculas
    if (categoriaCode.length < 3) {
        categoriaCode = categoria.toUpperCase().slice(0, 3);
    } else {
        // Tomar las primeras 3 letras y convertirlas a mayúsculas
        categoriaCode = categoriaCode.toUpperCase().slice(0, 3);
    }
    
    // Validar que el código solo contenga letras y números
    const validCode = categoriaCode.replace(/[^A-Z0-9]/g, '');
    if (validCode.length === 0) {
        showAlert('La categoría debe contener al menos 3 caracteres alfanuméricos', 'error');
        codigoInput.value = '';
        return;
    }
    
    try {
        // Obtener todos los productos para verificar códigos existentes
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/products`, { headers });
        if (!response.ok) throw new Error('Error al obtener productos');
        
        const products = await response.json();
        
        // Encontrar el último número usado para esta categoría
        let maxNumber = 0;
        products.forEach(product => {
            if (product.codigo && product.codigo.startsWith(validCode + '-')) {
                const numberPart = product.codigo.split('-')[1];
                const number = parseInt(numberPart, 10);
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });
        
        // Generar el siguiente número
        const nextNumber = maxNumber + 1;
        const generatedCode = `${validCode}-${String(nextNumber).padStart(3, '0')}`;
        
        // Verificar que el código no esté ocupado
        const codeExists = products.some(product => product.codigo === generatedCode);
        if (codeExists) {
            // Si existe, generar uno único
            let counter = nextNumber + 1;
            let uniqueCode = `${validCode}-${String(counter).padStart(3, '0')}`;
            while (products.some(product => product.codigo === uniqueCode)) {
                counter++;
                uniqueCode = `${validCode}-${String(counter).padStart(3, '0')}`;
            }
            codigoInput.value = uniqueCode;
        } else {
            codigoInput.value = generatedCode;
        }
        
        // Verificar disponibilidad del código generado
        checkCodeAvailability();
        
    } catch (error) {
        console.error('Error generando código:', error);
        // Fallback: generar código básico con timestamp
        const timestamp = Date.now().toString().slice(-4);
        codigoInput.value = `${validCode}-${timestamp}`;
        checkCodeAvailability();
    }
}

/**
 * Función para verificar disponibilidad del código
 */
async function checkCodeAvailability() {
    const codigoInput = document.getElementById('addCodigo');
    const availabilityDiv = document.getElementById('codeAvailability');
    const code = codigoInput.value.trim();
    
    if (!code) {
        if (availabilityDiv) availabilityDiv.textContent = '';
        return;
    }
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/products`, { headers });
        if (!response.ok) throw new Error('Error al verificar código');
        
        const products = await response.json();
        const codeExists = products.some(product => product.codigo === code);
        
        if (codeExists) {
            if (availabilityDiv) {
                availabilityDiv.textContent = '❌ Código ya existe - será reemplazado automáticamente';
                availabilityDiv.style.color = '#e74c3c';
            }
            // Generar un nuevo código disponible
            generateUniqueCode();
        } else {
            if (availabilityDiv) {
                availabilityDiv.textContent = '✅ Código disponible';
                availabilityDiv.style.color = '#27ae60';
            }
        }
        
    } catch (error) {
        console.error('Error verificando código:', error);
        if (availabilityDiv) {
            availabilityDiv.textContent = '⚠️ Error al verificar código';
            availabilityDiv.style.color = '#f39c12';
        }
    }
}

/**
 * Función auxiliar para generar código único cuando hay conflicto
 */
async function generateUniqueCode() {
    const categoriaInput = document.getElementById('addCategoria');
    const codigoInput = document.getElementById('addCodigo');
    const categoria = categoriaInput.value.trim();
    
    if (!categoria) return;
    
    const categoriaCode = categoria.split(' - ')[0] || categoria.split(' ')[0] || 'PROD';
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/products`, { headers });
        if (!response.ok) return;
        
        const products = await response.json();
        
        // Encontrar el último número usado para esta categoría
        let maxNumber = 0;
        products.forEach(product => {
            if (product.codigo && product.codigo.startsWith(categoriaCode + '-')) {
                const numberPart = product.codigo.split('-')[1];
                const number = parseInt(numberPart, 10);
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });
        
        // Generar códigos hasta encontrar uno libre
        let counter = maxNumber + 1;
        let uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
        while (products.some(product => product.codigo === uniqueCode)) {
            counter++;
            uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
        }
        
        codigoInput.value = uniqueCode;
        checkCodeAvailability();
        
    } catch (error) {
        console.error('Error generando código único:', error);
    }
}

// Exportar funciones para que estén disponibles globalmente
window.createProduct = createProduct;
window.closeAddModal = closeAddModal;
window.generateProductCode = generateProductCode;
window.checkCodeAvailability = checkCodeAvailability;
window.generateUniqueCode = generateUniqueCode;

// >>> FUNCIONES PARA EDICIÓN DE PRODUCTOS

/**
 * Función para editar un producto existente
 * @param {number} productId - ID del producto a editar
 */
async function editProduct(productId) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        // Obtener datos del producto
        const response = await fetch(`${API_BASE}/products/${productId}`, { headers });
        if (!response.ok) throw new Error('Error al obtener producto');
        
        const product = await response.json();
        
        // Llenar el formulario con los datos actuales
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editCodigo').value = product.codigo;
        document.getElementById('editNombre').value = product.nombre;
        document.getElementById('editDescripcion').value = product.descripcion || '';
        document.getElementById('editPrecio').value = product.precio;
        document.getElementById('editStock').value = product.stock;
        document.getElementById('editCategoria').value = product.categoria || '';
        document.getElementById('editBarcode').value = product.codigo_barras || '';
        
        // Mostrar el modal
        document.getElementById('editModal').classList.add('show');
        
    } catch (error) {
        console.error('Error al cargar producto para editar:', error);
        showAlert('Error al cargar el producto para editar', 'error');
    }
}

/**
 * Función para cerrar el modal de editar producto
 */
function closeEditModal() {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editProductForm');
    
    if (modal) modal.classList.remove('show');
    if (form) form.reset();
}

/**
 * Función para guardar cambios del producto
 * @param {Event} event - Evento de submit del formulario
 */
async function saveProductChanges(event) {
    event.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = {
        codigo: document.getElementById('editCodigo').value.trim(),
        nombre: document.getElementById('editNombre').value.trim(),
        descripcion: document.getElementById('editDescripcion').value.trim(),
        precio: parseFloat(document.getElementById('editPrecio').value),
        stock: parseInt(document.getElementById('editStock').value),
        categoria: document.getElementById('editCategoria').value.trim(),
        codigo_barras: document.getElementById('editBarcode').value.trim()
    };
    
    // Validaciones básicas
    if (!formData.codigo || !formData.nombre || isNaN(formData.precio) || isNaN(formData.stock)) {
        showAlert('Por favor complete todos los campos requeridos correctamente', 'error');
        return;
    }
    
    if (formData.precio < 0 || formData.stock < 0) {
        showAlert('El precio y stock no pueden ser negativos', 'error');
        return;
    }
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
        
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar producto');
        }
        
        const result = await response.json();
        
        // Cerrar modal
        closeEditModal();
        
        // Mostrar mensaje de éxito
        showAlert('Producto actualizado exitosamente', 'success');
        
        // Recargar los datos
        if (typeof fetchAndDisplayData === 'function') {
            fetchAndDisplayData();
        } else {
            console.warn('⚠️ fetchAndDisplayData no está disponible, intentando cargar productos directamente');
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
        }
        
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        showAlert('Error al guardar cambios: ' + error.message, 'error');
    }
}

// Exportar funciones de edición
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
window.saveProductChanges = saveProductChanges;

// >>> EVENT LISTENERS PARA FORMULARIOS DE PRODUCTOS

// Agregar event listener para el formulario de agregar producto
document.addEventListener('DOMContentLoaded', function() {
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', createProduct);
    }
    
    // Mejorar validación de la categoría para generar código solo cuando esté completa
    const categoriaInput = document.getElementById('addCategoria');
    if (categoriaInput) {
        categoriaInput.addEventListener('blur', function() {
            const categoria = this.value.trim();
            if (categoria) {
                generateProductCode();
            }
        });
        
        // Validar categoría en tiempo real
        categoriaInput.addEventListener('input', function() {
            const availabilityDiv = document.getElementById('codeAvailability');
            if (availabilityDiv) availabilityDiv.textContent = '';
        });
    }
});

// Exportar la función para que esté disponible globalmente
window.fetchMetrics = fetchMetrics;