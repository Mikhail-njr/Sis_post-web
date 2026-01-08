/**
 * Utilidades de Validación para el Sistema POS
 * 
 * Este módulo centraliza todas las validaciones comunes
 * para eliminar el código repetido en múltiples archivos.
 */

class ValidationUtils {
    /**
     * Valida un código de barras EAN-13
     * @param {string} code - Código a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidBarcode(code) {
        if (!code || typeof code !== 'string') return false;
        if (code.length !== 13 || !/^\d{13}$/.test(code)) return false;
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(code[i]);
            sum += (i % 2 === 0) ? digit : digit * 3;
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(code[12]);
    }

    /**
     * Valida una dirección de correo electrónico
     * @param {string} email - Correo a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valida un número telefónico
     * @param {string} phone - Teléfono a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        // Permite números con o sin código de país, espacios y guiones
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Valida un DNI argentino
     * @param {string} dni - DNI a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidDNI(dni) {
        if (!dni || typeof dni !== 'string') return false;
        // Formato: 8 dígitos con o sin puntos y guiones
        const dniRegex = /^\d{8}$/;
        const cleanDNI = dni.replace(/[.-]/g, '');
        return dniRegex.test(cleanDNI) && cleanDNI.length === 8;
    }

    /**
     * Valida un precio
     * @param {number|string} price - Precio a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidPrice(price) {
        if (price === null || price === undefined) return false;
        
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        
        if (isNaN(numPrice)) return false;
        if (numPrice < 0) return false;
        if (!isFinite(numPrice)) return false;
        
        return true;
    }

    /**
     * Valida una cantidad
     * @param {number|string} quantity - Cantidad a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidQuantity(quantity) {
        if (quantity === null || quantity === undefined) return false;
        
        const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
        
        if (isNaN(numQuantity)) return false;
        if (numQuantity < 0) return false;
        if (!Number.isInteger(numQuantity)) return false;
        
        return true;
    }

    /**
     * Valida un nombre de producto
     * @param {string} name - Nombre a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidProductName(name) {
        if (!name || typeof name !== 'string') return false;
        if (name.trim().length < 2) return false;
        if (name.trim().length > 100) return false;
        return true;
    }

    /**
     * Valida un código de producto
     * @param {string} code - Código a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidProductCode(code) {
        if (!code || typeof code !== 'string') return false;
        if (code.trim().length < 1) return false;
        if (code.trim().length > 50) return false;
        // Permite letras, números, guiones y guiones bajos
        const codeRegex = /^[a-zA-Z0-9_-]+$/;
        return codeRegex.test(code);
    }

    /**
     * Valida una categoría
     * @param {string} category - Categoría a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidCategory(category) {
        if (!category || typeof category !== 'string') return false;
        if (category.trim().length < 1) return false;
        if (category.trim().length > 50) return false;
        return true;
    }

    /**
     * Valida una fecha
     * @param {string|Date} date - Fecha a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidDate(date) {
        if (!date) return false;
        
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }

    /**
     * Valida un RUT argentino (para proveedores)
     * @param {string} rut - RUT a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidRUT(rut) {
        if (!rut || typeof rut !== 'string') return false;
        // Formato: XX.XXX.XXX-X
        const rutRegex = /^\d{2}\.\d{3}\.\d{3}-[\dkK]$/;
        return rutRegex.test(rut);
    }

    /**
     * Valida un CUIT argentino
     * @param {string} cuit - CUIT a validar
     * @returns {boolean} - True si es válido, false si no
     */
    static isValidCUIT(cuit) {
        if (!cuit || typeof cuit !== 'string') return false;
        // Formato: XX-XXXXXXXX-X
        const cuitRegex = /^\d{2}-\d{8}-\d$/;
        return cuitRegex.test(cuit);
    }

    /**
     * Valida un campo requerido
     * @param {any} value - Valor a validar
     * @param {string} fieldName - Nombre del campo para mensajes de error
     * @returns {string|null} - Mensaje de error o null si es válido
     */
    static validateRequiredField(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            return `${fieldName} es requerido`;
        }
        return null;
    }

    /**
     * Valida múltiples campos requeridos
     * @param {Object} data - Objeto con los datos a validar
     * @param {Array} requiredFields - Array con nombres de campos requeridos
     * @returns {Array} - Array con mensajes de error
     */
    static validateRequiredFields(data, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            const error = this.validateRequiredField(data[field], field);
            if (error) {
                errors.push(error);
            }
        });
        
        return errors;
    }
}

module.exports = ValidationUtils;