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