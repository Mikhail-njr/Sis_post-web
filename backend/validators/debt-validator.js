/**
 * Validadores para operaciones de deudas
 */

/**
 * Validar datos para creación de deuda
 * @param {Object} debtData - Datos de la deuda a validar
 * @returns {Object} - Resultado de validación
 */
function validateDebtData(debtData) {
    const errors = [];
    
    // Validar cliente_id
    if (!debtData.cliente_id || !Number.isInteger(parseInt(debtData.cliente_id))) {
        errors.push('cliente_id es requerido y debe ser un número entero');
    }
    
    // Validar items
    if (!debtData.items || !Array.isArray(debtData.items) || debtData.items.length === 0) {
        errors.push('items es requerido y debe ser un array no vacío');
    } else {
        debtData.items.forEach((item, index) => {
            if (!item.producto_id) {
                errors.push(`items[${index}].producto_id es requerido`);
            }
            if (!item.cantidad || parseInt(item.cantidad) <= 0) {
                errors.push(`items[${index}].cantidad debe ser un número mayor a 0`);
            }
            if (!item.precio_unitario || parseFloat(item.precio_unitario) <= 0) {
                errors.push(`items[${index}].precio_unitario debe ser un número mayor a 0`);
            }
        });
    }
    
    // Validar fecha de vencimiento (opcional pero si se proporciona debe ser válida)
    if (debtData.fecha_vencimiento) {
        const fecha = new Date(debtData.fecha_vencimiento);
        if (isNaN(fecha.getTime())) {
            errors.push('fecha_vencimiento debe ser una fecha válida');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validar datos para actualización de deuda
 * @param {Object} updateData - Datos para actualización
 * @returns {Object} - Resultado de validación
 */
function validateDebtUpdateData(updateData) {
    const errors = [];
    
    // Validar campos permitidos para actualización
    const allowedFields = ['monto_pendiente', 'estado', 'descripcion', 'fecha_vencimiento'];
    const providedFields = Object.keys(updateData);
    
    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
        errors.push(`Campos no permitidos: ${invalidFields.join(', ')}`);
    }
    
    // Validar monto_pendiente si se proporciona
    if (updateData.monto_pendiente !== undefined) {
        const monto = parseFloat(updateData.monto_pendiente);
        if (isNaN(monto) || monto < 0) {
            errors.push('monto_pendiente debe ser un número mayor o igual a 0');
        }
    }
    
    // Validar estado si se proporciona
    if (updateData.estado) {
        const estadosValidos = ['pendiente', 'parcial', 'vencida', 'pagada'];
        if (!estadosValidos.includes(updateData.estado)) {
            errors.push(`estado debe ser uno de: ${estadosValidos.join(', ')}`);
        }
    }
    
    // Validar fecha de vencimiento si se proporciona
    if (updateData.fecha_vencimiento) {
        const fecha = new Date(updateData.fecha_vencimiento);
        if (isNaN(fecha.getTime())) {
            errors.push('fecha_vencimiento debe ser una fecha válida');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

module.exports = {
    validateDebtData,
    validateDebtUpdateData
};