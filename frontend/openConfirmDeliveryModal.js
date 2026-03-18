// Función para abrir el modal de confirmación de entrega
function openConfirmDeliveryModal(orderId) {
    // Limpiar contenido previo y mostrar modal existente
    const info = document.getElementById('deliveryOrderInfo');
    if (info) info.style.display = 'none';
    const details = document.getElementById('deliveryOrderDetails');
    if (details) details.textContent = '';
    const items = document.getElementById('deliveryItemsContainer');
    if (items) items.innerHTML = '';
    const extras = document.getElementById('extraItemsContainer');
    if (extras) extras.innerHTML = '';
    const date = document.getElementById('actualDeliveryDate');
    if (date) date.value = '';
    // Guardar el orderId globalmente para confirmDelivery
    window.currentDeliveryOrderId = orderId;
    // Cargar información del pedido
    loadOrderForDelivery(orderId);
    // Mostrar modal
    const modal = document.getElementById('confirmDeliveryModal');
    if (modal) modal.classList.add('show');
}

// Función para cerrar el modal de confirmación de entrega
function closeConfirmDeliveryModal() {
    const modal = document.getElementById('confirmDeliveryModal');
    if (modal) {
        modal.classList.remove('show');
        // Si se abrió desde un cambio de estado, revertir visualmente
        if (modal._selectElement) {
            if (typeof loadSupplierOrders === 'function') {
                loadSupplierOrders();
            }
            modal._selectElement = null;
        }
    }
}

// Función para cargar información del pedido para entrega
async function loadOrderForDelivery(orderId) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        
        const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders/${orderId}`, { headers });
        if (response.status === 401) {
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida');
        }
        if (!response.ok) throw new Error('Error al obtener detalles del pedido');
        
        const order = await response.json();
        
        // Mostrar información del pedido
        const orderInfo = document.getElementById('deliveryOrderInfo');
        const orderDetails = document.getElementById('deliveryOrderDetails');
        
        orderInfo.style.display = 'block';
        orderDetails.innerHTML = `
            <strong>Pedido:</strong> ${order.numero_pedido}<br>
            <strong>Proveedor:</strong> ${order.nombre_proveedor}<br>
            <strong>Fecha del Pedido:</strong> ${new Date(order.fecha_pedido).toLocaleDateString('es-AR')}<br>
            <strong>Fecha de Entrega Estimada:</strong> ${order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString('es-AR') : 'No especificada'}
        `;
        
        // Cargar items del pedido
        loadOrderItemsForDelivery(order.items);
        
    } catch (error) {
        console.error('Error cargando pedido para entrega:', error);
        showAlert('Error al cargar información del pedido: ' + error.message, 'error');
    }
}

// Función para cargar items del pedido
function loadOrderItemsForDelivery(items) {
    const container = document.getElementById('deliveryItemsContainer');
    container.innerHTML = '';
    
    if (!items || items.length === 0) {
        container.innerHTML = '<div style="padding: 20px; color: #666; text-align: center;">No hay items en este pedido</div>';
        return;
    }
    
    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.dataset.productId = item.producto_id; // Asignar el id del producto correctamente
        itemDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            padding: 10px;
            background: #314e6a;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        `;
        // Campo de fecha de vencimiento por producto
        itemDiv.innerHTML = `
            <div style="flex: 2;">
                <strong>${item.producto_nombre}</strong><br>
                <small>Código: ${item.producto_codigo}</small>
            </div>
            <div style="flex: 1; text-align: center;">
                <label style="display: block; font-size: 12px; color: #ccc;">Cantidad Pedida</label>
                <span style="font-weight: bold;">${item.cantidad}</span>
            </div>
            <div style="flex: 1; text-align: center;">
                <label style="display: block; font-size: 12px; color: #ccc;">Cantidad Recibida</label>
                <input type="number" class="received-quantity" value="${item.cantidad}" min="0" max="${item.cantidad}" style="width: 80px; padding: 6px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;">
            </div>
            <div style="flex: 1; text-align: center;">
                <label style="display: block; font-size: 12px; color: #ccc;">Precio Unitario</label>
                <input type="number" class="received-price" value="${item.precio_unitario}" step="0.01" min="0" style="width: 100px; padding: 6px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;">
            </div>
            <div style="flex: 1; text-align: center;">
                <label style="display: block; font-size: 12px; color: #ccc;">Fecha Vencimiento</label>
                <input type="date" class="expiry-date" style="width: 130px; padding: 6px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;">
            </div>
            <div style="flex: 1; text-align: center;">
                <label style="display: block; font-size: 12px; color: #ccc;">Subtotal</label>
                <span class="received-subtotal" style="font-weight: bold;">${formatCurrency(item.cantidad * item.precio_unitario)}</span>
            </div>
            <button type="button" onclick="toggleExtraItem(this)" style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">➕ Extra</button>
        `;
        container.appendChild(itemDiv);
        // Añadir evento para calcular subtotal
        const quantityInput = itemDiv.querySelector('.received-quantity');
        const priceInput = itemDiv.querySelector('.received-price');
        const subtotalSpan = itemDiv.querySelector('.received-subtotal');
        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                subtotalSpan.textContent = formatCurrency(quantity * price);
                updateDeliveryTotal();
            });
        });
    });
    
    updateDeliveryTotal();
}

// Función para agregar item extra
function addExtraItem() {
    const container = document.getElementById('extraItemsContainer');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'extra-item';
    itemDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 10px;
        background: #4a5d73;
        border-radius: 6px;
        border: 1px solid #dee2e6;
    `;
    
    itemDiv.innerHTML = `
        <select class="extra-product-select" style="flex: 2; padding: 8px; border: 2px solid #030303; border-radius: 6px;" onchange="updateExtraProductPrice(this)">
            <option value="">Seleccionar producto...</option>
        </select>
        <input type="number" class="extra-quantity" placeholder="Cant." min="1" value="1" style="width: 80px; padding: 8px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;" onchange="updateExtraItemTotal(this)">
        <input type="number" class="extra-price" placeholder="Precio" step="0.01" min="0" value="0.00" style="width: 100px; padding: 8px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;" onchange="updateExtraItemTotal(this)">
        <span class="extra-subtotal" style="font-weight: bold; min-width: 80px;">$0,00</span>
        <button type="button" onclick="removeExtraItem(this)" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">✕</button>
    `;
    
    container.appendChild(itemDiv);
    loadProductsForExtraItem(itemDiv.querySelector('.extra-product-select'));
}

// Función para cargar productos en select de items extra
async function loadProductsForExtraItem(selectElement) {
    try {
        const products = await fetchProductsData();
        
        selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.nombre} (${product.codigo})`;
            option.dataset.price = product.precio;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products for extra item:', error);
    }
}

// Función para actualizar precio de producto extra
function updateExtraProductPrice(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const priceInput = selectElement.closest('.extra-item').querySelector('.extra-price');
    const quantityInput = selectElement.closest('.extra-item').querySelector('.extra-quantity');
    
    if (selectedOption.value && selectedOption.dataset.price) {
        priceInput.value = parseFloat(selectedOption.dataset.price).toFixed(2);
        if (quantityInput.value) {
            updateExtraItemTotal(quantityInput);
        }
    }
}

// Función para calcular total de item extra
function updateExtraItemTotal(element) {
    const itemDiv = element.closest('.extra-item');
    const quantity = parseFloat(itemDiv.querySelector('.extra-quantity').value) || 0;
    const price = parseFloat(itemDiv.querySelector('.extra-price').value) || 0;
    const subtotal = quantity * price;
    
    itemDiv.querySelector('.extra-subtotal').textContent = formatCurrency(subtotal);
    updateDeliveryTotal();
}

// Función para remover item extra
function removeExtraItem(button) {
    button.closest('.extra-item').remove();
    updateDeliveryTotal();
}

// Función para alternar item extra (marcar/desmarcar)
function toggleExtraItem(button) {
    const itemDiv = button.closest('.order-item');
    const isExtra = button.textContent.includes('Extra');
    
    if (isExtra) {
        button.textContent = '➖ Extra';
        button.style.background = '#dc3545';
        itemDiv.style.background = '#4a5d73';
        itemDiv.style.border = '2px solid #dc3545';
    } else {
        button.textContent = '➕ Extra';
        button.style.background = '#28a745';
        itemDiv.style.background = '#314e6a';
        itemDiv.style.border = '1px solid #dee2e6';
    }
}

// Función para calcular total de entrega
function updateDeliveryTotal() {
    const items = document.querySelectorAll('.order-item');
    const extraItems = document.querySelectorAll('.extra-item');
    let total = 0;
    
    items.forEach(item => {
        const quantityInput = item.querySelector('.received-quantity');
        const priceInput = item.querySelector('.received-price');
        const quantity = quantityInput ? parseFloat(quantityInput.value) || 0 : 0;
        const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
        total += quantity * price;
    });
    
    extraItems.forEach(item => {
        const quantity = parseFloat(item.querySelector('.extra-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.extra-price').value) || 0;
        total += quantity * price;
    });
    
    // Actualizar total en el modal (si existe un elemento para mostrarlo)
    const totalElement = document.querySelector('#confirmDeliveryModal .order-total');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
}

// Función para confirmar entrega y crear lotes
async function confirmDelivery() {
    try {
        // Obtener datos del modal
        const actualDeliveryDate = document.getElementById('actualDeliveryDate').value;
        const items = [];
        const extraItems = [];
        
        // Recopilar items del pedido y extra_items en formato unificado
        document.querySelectorAll('.order-item').forEach(itemDiv => {
            const quantityInput = itemDiv.querySelector('.received-quantity');
            const priceInput = itemDiv.querySelector('.received-price');
            if (!quantityInput || !priceInput) {
                showAlert('Falta campo de cantidad o precio en algún producto. Verifica los datos del pedido.', 'error');
                return;
            }
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const expiryDate = itemDiv.querySelector('.expiry-date') ? itemDiv.querySelector('.expiry-date').value : "";
            let productoId = null;
            if (itemDiv.dataset && itemDiv.dataset.productId) {
                productoId = Number(itemDiv.dataset.productId);
            } else if (quantityInput.name) {
                productoId = Number(quantityInput.name);
            }
            // Validar producto_id, cantidad_recibida y fecha_vencimiento
            if (
                productoId &&
                quantity > 0 &&
                expiryDate &&
                !isNaN(productoId) &&
                new Date(expiryDate) > new Date()
            ) {
                items.push({
                    producto_id: productoId,
                    cantidad_recibida: quantity,
                    costo_unitario: price,
                    fecha_vencimiento: expiryDate
                });
            }
        });
        document.querySelectorAll('.extra-item').forEach(itemDiv => {
            const productId = itemDiv.querySelector('.extra-product-select').value;
            const quantity = parseFloat(itemDiv.querySelector('.extra-quantity').value) || 0;
            const price = parseFloat(itemDiv.querySelector('.extra-price').value) || 0;
            const expiryDate = itemDiv.querySelector('.extra-expiry-date') ? itemDiv.querySelector('.extra-expiry-date').value : "";
            if (productId && quantity > 0) {
                extraItems.push({
                    producto_id: productId,
                    cantidad: quantity,
                    costo_unitario: price,
                    es_extra: true,
                    fecha_vencimiento: expiryDate
                });
            }
        });
        
        // Recopilar items extra
        document.querySelectorAll('.extra-item').forEach(itemDiv => {
            const productId = itemDiv.querySelector('.extra-product-select').value;
            const quantity = parseFloat(itemDiv.querySelector('.extra-quantity').value) || 0;
            const price = parseFloat(itemDiv.querySelector('.extra-price').value) || 0;
            
            if (productId && quantity > 0) {
                extraItems.push({
                    producto_id: productId,
                    cantidad: quantity,
                    costo_unitario: price,
                    es_extra: true
                });
            }
        });
        
        if (items.length === 0 && extraItems.length === 0) {
            showAlert('Debe confirmar al menos un item con cantidad mayor a 0', 'error');
            return;
        }
        
        // Enviar confirmación de entrega
        const headers = { 'Content-Type': 'application/json' };
        
        
        // Obtener el orderId del modal o contexto
        const orderId = window.currentDeliveryOrderId || (window.deliveryOrder && window.deliveryOrder.id);
        if (!orderId) {
            showAlert('No se pudo determinar el ID del pedido.', 'error');
            return;
        }
        const bodyToSend = {
            fecha_entrega: actualDeliveryDate || new Date().toISOString().split('T')[0],
            items: items,
            extra_items: extraItems
        };
        console.log('🟢 Body enviado a confirm-delivery:', JSON.stringify(bodyToSend, null, 2));
        const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders/${orderId}/confirm-delivery`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bodyToSend)
        });
        
        if (response.status === 401) {
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida');
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al confirmar entrega');
        }
        
        const result = await response.json();
        showAlert(result.message || 'Entrega confirmada exitosamente', 'success');
        
        closeConfirmDeliveryModal();
        loadSupplierOrders(); // Recargar pedidos
        
    } catch (error) {
        console.error('Error confirmando entrega:', error);
        showAlert('Error al confirmar entrega: ' + error.message, 'error');
    }
}