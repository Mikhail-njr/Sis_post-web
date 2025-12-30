function getDeliveryItemsFromDOM() {
    // Obtiene los items indexados del DOM
    const items = [];
    document.querySelectorAll('.order-item-row').forEach(row => {
        const productoId = row.getAttribute('data-producto-id');
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        if (productoId && qtyInput && priceInput) {
            const cantidad = parseInt(qtyInput.value) || 0;
            const precio_unitario = parseFloat(priceInput.value) || 0;
            if (cantidad > 0) {
                items.push({
                    producto_id: productoId,
                    cantidad,
                    costo_unitario: precio_unitario,
                    es_extra: false
                });
            }
        }
    });
    return items;
}

function confirmDelivery(body) {
    // Arma el array de items desde el DOM
    body.items = getDeliveryItemsFromDOM();

    // Combina items y extra_items para validar
    const allItems = [
        ...(body.items || []),
        ...(body.extra_items || [])
    ];
    const hasValidItem = allItems.some(item => item.cantidad > 0);

    if (!hasValidItem) {
        alert("Debe confirmar al menos un item con cantidad mayor a 0");
        return;
    }

    // ...existing code para enviar la solicitud...
}