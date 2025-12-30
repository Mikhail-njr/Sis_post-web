/**
 * Utilidades compartidas para validación de códigos de barras
 */

/**
 * Función para validar códigos EAN-13
 * @param {string} code - Código a validar
 * @returns {boolean} true si es válido
 */
function isValidEAN13(code) {
    if (!code || typeof code !== 'string') return false;

    // EAN-13 debe tener exactamente 13 dígitos
    if (code.length !== 13 || !/^\d{13}$/.test(code)) return false;

    // Algoritmo de validación EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]);
}

/**
 * Función para validar códigos EAN-8
 * @param {string} code - Código a validar
 * @returns {boolean} true si es válido
 */
function isValidEAN8(code) {
    if (!code || typeof code !== 'string') return false;

    // EAN-8 debe tener exactamente 8 dígitos
    if (code.length !== 8 || !/^\d{8}$/.test(code)) return false;

    // Algoritmo de validación EAN-8
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        const digit = parseInt(code[i]);
        sum += (i % 2 === 0) ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[7]);
}

/**
 * Función general para validar códigos de barras
 * @param {string} code - Código a validar
 * @returns {boolean} true si es válido
 */
function isValidBarcode(code) {
    if (!code || typeof code !== 'string') return false;

    // Verificar que sea numérico
    if (!/^\d+$/.test(code)) return false;

    // Validar EAN-13
    if (code.length === 13) {
        return isValidEAN13(code);
    }
    // Validar EAN-8
    else if (code.length === 8) {
        return isValidEAN8(code);
    }

    // Longitud no soportada
    return false;
}

module.exports = {
    isValidEAN13,
    isValidEAN8,
    isValidBarcode
};