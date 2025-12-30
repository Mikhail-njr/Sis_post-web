# Plan de Implementación: Cuenta Corriente en Sistema POS

## Resumen Ejecutivo
Sistema Cuenta Corriente integrado en el POS guardando solo IDs y cantidades de productos en cada deuda, permitiendo recalcular precios dinámicamente usando datos actuales de la base de datos. El dashboard mostrará deudas con actualización en tiempo real.

## Arquitectura General

### Base de Datos (Existente)
Usa tablas actuales:
- `deudas` (cabecera: id, cliente_id, monto_original, monto_pendiente, fecha_vencimiento, estado)
- `deuda_productos` (líneas: deuda_id, producto_id, cantidad, precio_unitario opcional)
- `clientes` (información del cliente)
- `productos` (con precio, precio_con_descuento, descuento_porcentaje actualizados)

### APIs Disponibles para Precios
- `GET /api/products` → lista completa con precio, precio_con_descuento, descuento_porcentaje, en_promocion
- `GET /api/products/:id` → producto individual con precios
- `GET /api/dashboard-data` → datos consolidados (incluye productos con precios)

## Tarea 1: Habilitar Cuenta Corriente en Index.html (UI)

### 1.1 Agregar Botón en Métodos de Pago
Insertar en la sección "Métodos de Pago" (después de "Crédito") en index.html:

```html
<div class="payment-method" data-method="cuentaCorriente" onclick="togglePaymentMethod('cuentaCorriente')">
  💰 Cuenta Corriente
  <input type="hidden" id="cuentaCorriente-clienteId" value="">
  <input type="hidden" id="cuentaCorriente-clienteNombre" value="">
  <div id="cuentaCorriente-info" style="margin-top: 10px; display: none;">
    <div style="font-size: 12px; color: #666;">
      <strong>Cliente:</strong> <span id="cuentaCorriente-nombre">No seleccionado</span>
    </div>
    <button type="button" onclick="openClienteSelectorModal()" style="margin-top: 8px; width: 100%; padding: 8px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Seleccionar Cliente
    </button>
  </div>
</div>
```

### 1.2 Modal para Seleccionar Cliente
Agregar antes del cierre `</body>` en index.html:

```html
<!-- Modal Selector de Clientes para Cuenta Corriente -->
<div id="clienteSelectorModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:12px; padding:30px; min-width:400px; max-width:90vw; box-shadow:0 8px 32px rgba(0,0,0,0.2); position:relative;">
    <button onclick="closeClienteSelectorModal()" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:22px; cursor:pointer;">×</button>
    <h3>Seleccionar Cliente</h3>
    <div style="margin-bottom:15px;">
      <input type="text" id="buscadorClientes" placeholder="Buscar por nombre, teléfono o DNI..." style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">
      <small style="color:#666; margin-top:5px; display:block;">Escribe para filtrar clientes</small>
    </div>
    <div id="listaClientesContainer" style="max-height:300px; overflow-y:auto; border:1px solid #ddd; border-radius:8px; background:#f8f9fa;">
      <div style="text-align:center; color:#999; padding:20px;">Cargando clientes...</div>
    </div>
    <div style="margin-top:15px; text-align:right;">
      <button type="button" onclick="closeClienteSelectorModal()" style="padding:10px 20px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer;">Cancelar</button>
    </div>
  </div>
</div>
```

## Tarea 2: Procesar Venta a Cuenta Corriente

### 2.1 Flujo en script.js
Modificar `processPayment()` para detectar Cuenta Corriente:

```javascript
// Variables globales
let clienteSeleccionado = null;
let todosLosClientes = [];

// Cargar y mostrar clientes
async function cargarClientesParaCuentaCorriente() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) {
      headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;
    }

    const response = await fetch(`${APIBASE}/clientes`, { headers });
    if (response.status === 401) { isLoggedIn = false; return; }
    if (!response.ok) throw new Error('Error al obtener clientes');

    todosLosClientes = await response.json();
    mostrarListaClientes(todosLosClientes);
  } catch (error) {
    console.error('Error:', error);
    showAlert('Error al cargar clientes', 'error');
  }
}

function mostrarListaClientes(clientes) {
  const container = document.getElementById('listaClientesContainer');
  if (!clientes || clientes.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">No hay clientes registrados</div>';
    return;
  }

  const html = clientes.map(cliente => `
    <div onclick="seleccionarClienteCuentaCorriente(${cliente.id}, '${cliente.nombre}', '${cliente.telefono}', '${cliente.dni}')"
         style="padding:12px 15px; border-bottom:1px solid #eee; cursor:pointer;">
      <div style="font-weight:bold; color:#333;">${cliente.nombre}</div>
      <div style="font-size:12px; color:#666;">📞 ${cliente.telefono || 'N/A'} | 🆔 ${cliente.dni || 'N/A'}</div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function seleccionarClienteCuentaCorriente(clienteId, clienteNombre, clienteTelefono, clienteDni) {
  clienteSeleccionado = { id: clienteId, nombre: clienteNombre, telefono: clienteTelefono, dni: clienteDni };

  document.getElementById('cuentaCorriente-clienteId').value = clienteId;
  document.getElementById('cuentaCorriente-clienteNombre').value = clienteNombre;
  document.getElementById('cuentaCorriente-nombre').textContent = clienteNombre;
  document.getElementById('cuentaCorriente-info').style.display = 'block';

  closeClienteSelectorModal();
  showAlert(`Cliente seleccionado: ${clienteNombre}`, 'success');
}

function openClienteSelectorModal() {
  document.getElementById('clienteSelectorModal').style.display = 'flex';
  cargarClientesParaCuentaCorriente();
}

function closeClienteSelectorModal() {
  document.getElementById('clienteSelectorModal').style.display = 'none';
}

// En processPayment(), agregar antes de enviar:
if (Object.keys(selectedPaymentMethods).includes('cuentaCorriente')) {
  if (!clienteSeleccionado) {
    showAlert('Selecciona un cliente para Cuenta Corriente', 'error');
    return;
  }
  await procesarVentaCuentaCorriente(clienteSeleccionado, cart, totalToPay);
  return;
}

async function procesarVentaCuentaCorriente(cliente, items, totalVenta) {
  try {
    const requestData = {
      cliente_id: cliente.id,
      items: items.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
      total: totalVenta
    };

    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;

    const response = await fetch(`${APIBASE}/ventas/cuenta-corriente`, { method: 'POST', headers, body: JSON.stringify(requestData) });
    if (!response.ok) throw new Error((await response.json()).error || 'Error al registrar deuda');

    const data = await response.json();
    generateInvoiceAccountPayment(data, cliente, items, totalVenta);

    cart = [];
    clienteSeleccionado = null;
    updateCart();
    selectedPaymentMethods = {};
    showAlert(`Deuda registrada para ${cliente.nombre}`, 'success');

  } catch (error) {
    console.error('Error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  }
}
```

## Tarea 3: Dashboard - Sección Clientes Cuenta Corriente

### 3.1 Agregar Sección en dashboard.html

```html
<!-- Sección Clientes - Cuenta Corriente -->
<div id="clientes-cuentacorriente-section" class="dashboard-section">
  <h2 class="section-header">
    <span class="section-title">Clientes - Cuenta Corriente</span>
    <span class="section-icon">▼</span>
  </h2>
  <div class="section-content">
    <div style="margin-bottom: 20px; display: flex; gap: 10px;">
      <input type="text" id="filtro-clientes-cc" placeholder="Filtrar..." style="flex:1; padding:10px; border:2px solid #ddd; border-radius:8px;">
      <button onclick="cargarClientesDeudas()" class="btn btn-primary">Actualizar</button>
    </div>
    <div class="loading">Cargando clientes...</div>
    <table id="clientes-deudas-table" style="display:none; width:100%; border-collapse:collapse;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="padding:10px; text-align:left; border:1px solid #ddd;">ID</th>
          <th style="padding:10px; text-align:left; border:1px solid #ddd;">Nombre</th>
          <th style="padding:10px; text-align:left; border:1px solid #ddd;">Teléfono</th>
          <th style="padding:10px; text-align:left; border:1px solid #ddd;">DNI</th>
          <th style="padding:10px; text-align:left; border:1px solid #ddd;">Dirección</th>
          <th style="padding:10px; text-align:right; border:1px solid #ddd;">Total Deudas</th>
          <th style="padding:10px; text-align:right; border:1px solid #ddd;">Pendientes</th>
          <th style="padding:10px; text-align:right; border:1px solid #ddd;">Vencidas</th>
          <th style="padding:10px; text-align:center; border:1px solid #ddd;">Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>
```

### 3.2 Funciones para Cargar y Mostrar Deudas
En script.js (dashboard):

```javascript
async function cargarClientesDeudas() {
  try {
    const loading = document.querySelector('#clientes-cuentacorriente-section .loading');
    if (loading) loading.style.display = 'block';

    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;

    const response = await fetch(`${APIBASE}/clientes/deudas-resumen`, { headers });
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

async function verDeudas(clienteId, clienteNombre) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;

    const response = await fetch(`${APIBASE}/clientes/${clienteId}/deudas-con-productos`, { headers });
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

async function actualizarDeuda(clienteId) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + authCredentials.password)}`;

    const response = await fetch(`${APIBASE}/clientes/${clienteId}/actualizar-deudas`, {
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

function editarDeuda(clienteId) { showAlert('Función en desarrollo', 'info'); }
function eliminarDeuda(clienteId) { showAlert('Función en desarrollo', 'info'); }
```

## Nomenclatura Consistente (OBLIGATORIO)

| Contexto | Estándar | Ejemplo |
|----------|----------|---------|
| Variables JS | camelCase | `clienteSeleccionado`, `deudaId`, `productoId` |
| Funciones JS | camelCase | `procesarVentaCuentaCorriente()`, `verDeudas()` |
| API Backend | snake_case | `/clientes`, `/ventas/cuenta-corriente` |
| Campos BD | snake_case | `cliente_id`, `deuda_id`, `monto_pendiente` |
| Data attributes | camelCase en comillas | `data-method="cuentaCorriente"` |
| IDs HTML | kebab-case / camelCase | `id="clienteSelectorModal"` |

**Regla Central:** Nunca mezclar `ventaTotal` con `venta_total`. En JavaScript usar siempre camelCase; en BD/API, snake_case.

## Endpoints Backend a Crear

| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/api/clientes` | Listar todos los clientes |
| POST | `/api/ventas/cuenta-corriente` | Crear deuda + deuda_productos (transacción) |
| GET | `/api/clientes/deudas-resumen` | Clientes con resumen de deudas |
| GET | `/api/clientes/:clienteId/deudas-con-productos` | Deudas de cliente con productos (precios actuales) |
| PUT | `/api/clientes/:clienteId/actualizar-deudas` | Recalcular deudas con precios actuales |

## Orden de Implementación
1. ✅ Agregar UI en index.html (botón + modal selector)
2. ✅ Crear funciones JS en script.js (cargar clientes, seleccionar, procesar venta)
3. ✅ Crear endpoint POST `/api/ventas/cuenta-corriente` en backend
4. ✅ Agregar sección en dashboard.html
5. ✅ Crear funciones dashboard en script.js (cargar, mostrar, actualizar deudas)
6. ✅ Crear endpoints GET de clientes y deudas en backend
7. ✅ Testing y validación completa