// Archivo de utilidades para manejar funciones auxiliares y evitar errores de referencia

// Función unificada de login (wrapper para showLoginModal)
function unifiedLogin(message = 'Inicia sesión para acceder al sistema:', onSuccess = null) {
    // Mostrar mensaje si se proporciona
    if (message && message.trim()) {
        console.log('Mensaje de login:', message);
    }
    
    // Usar la función existente de auth.js
    if (typeof showLoginModal === 'function') {
        showLoginModal(onSuccess);
        return true;
    } else {
        console.warn('showLoginModal no está disponible');
        return false;
    }
}

// Exportar funciones para uso global
window.unifiedLogin = unifiedLogin;