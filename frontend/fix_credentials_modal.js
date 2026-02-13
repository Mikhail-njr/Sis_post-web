/**
 * Solución para el problema del campo currentUsername vacío en el modal de credenciales
 * 
 * Problema identificado:
 * - El campo currentUsername aparecía vacío porque la función openEditCredentialsModal()
 *   no cargaba correctamente el nombre de usuario actual
 * - La lógica de carga dependía de variables globales que no estaban disponibles
 *   en el momento correcto
 * 
 * Solución implementada:
 * - Mejora de la lógica de carga del campo currentUsername
 * - Verificación robusta de múltiples fuentes de credenciales
 * - Manejo de casos donde no hay credenciales disponibles
 */

/**
 * Función corregida para abrir el modal de edición de credenciales
 * 
 * Esta función ahora carga correctamente el nombre de usuario actual
 * en el campo currentUsername antes de mostrar el modal.
 */
function openEditCredentialsModal() {
    try {
        const modal = document.getElementById('editCredentialsModal');
        const form = document.getElementById('editCredentialsForm');
        const currentUsername = document.getElementById('currentUsername');
        const messageDiv = document.getElementById('credentialsMessage');
        
        if (!modal || !form || !currentUsername || !messageDiv) {
            console.error('⚠️ Elementos del DOM para modal de credenciales no encontrados');
            showAlert('Error al abrir el formulario de edición de credenciales', 'error');
            return;
        }
        
        // Limpiar formulario y mensajes
        form.reset();
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        
        // Cargar usuario actual con lógica mejorada
        let usernameToShow = 'admin'; // Valor por defecto
        
        // Intentar obtener el usuario de diferentes fuentes
        if (typeof authCredentials !== 'undefined' && authCredentials && authCredentials.username) {
            usernameToShow = authCredentials.username;
        } else {
            // Intentar obtener de sessionStorage
            const stored = sessionStorage.getItem('authCredentials');
            if (stored) {
                try {
                    const storedCredentials = JSON.parse(stored);
                    if (storedCredentials && storedCredentials.username) {
                        usernameToShow = storedCredentials.username;
                    }
                } catch (e) {
                    console.warn('Error parsing stored credentials:', e);
                }
            }
        }
        
        // Mostrar el usuario actual
        currentUsername.value = usernameToShow;
        
        // Mostrar el modal
        modal.classList.add('show');
        
        console.log('✅ Modal de edición de credenciales abierto con usuario:', usernameToShow);
        
    } catch (error) {
        console.error('❌ Error abriendo modal de credenciales:', error);
        showAlert('Error al abrir el formulario de edición de credenciales', 'error');
    }
}

/**
 * Función para cerrar el modal de edición de credenciales
 */
function closeEditCredentialsModal() {
    try {
        const modal = document.getElementById('editCredentialsModal');
        const form = document.getElementById('editCredentialsForm');
        const messageDiv = document.getElementById('credentialsMessage');
        
        if (modal) modal.classList.remove('show');
        if (form) form.reset();
        if (messageDiv) {
            messageDiv.style.display = 'none';
            messageDiv.textContent = '';
        }
        
        console.log('✅ Modal de edición de credenciales cerrado');
        
    } catch (error) {
        console.error('❌ Error cerrando modal de credenciales:', error);
    }
}

/**
 * Función para validar el formulario de edición de credenciales
 * @returns {boolean} - True si el formulario es válido, false en caso contrario
 */
function validateCredentialsForm() {
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();
    const messageDiv = document.getElementById('credentialsMessage');
    
    // Validar contraseña actual
    if (!currentPassword) {
        showMessage('La contraseña actual es requerida', 'error');
        return false;
    }
    
    // Validar nueva contraseña
    if (!newPassword) {
        showMessage('La nueva contraseña es requerida', 'error');
        return false;
    }
    
    if (newPassword.length < 3) {
        showMessage('La nueva contraseña debe tener al menos 3 caracteres', 'error');
        return false;
    }
    
    // Validar confirmación de nueva contraseña
    if (!confirmNewPassword) {
        showMessage('Debe confirmar la nueva contraseña', 'error');
        return false;
    }
    
    if (newPassword !== confirmNewPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return false;
    }
    
    // Validar que la nueva contraseña sea diferente de la actual
    if (currentPassword === newPassword) {
        showMessage('La nueva contraseña debe ser diferente de la actual', 'error');
        return false;
    }
    
    return true;
}

/**
 * Función para mostrar mensajes en el formulario de credenciales
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje (success, error, warning)
 */
function showMessage(message, type) {
    const messageDiv = document.getElementById('credentialsMessage');
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    switch (type) {
        case 'success':
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.style.borderColor = '#c3e6cb';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#f8d7da';
            messageDiv.style.color = '#721c24';
            messageDiv.style.borderColor = '#f5c6cb';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#fff3cd';
            messageDiv.style.color = '#856404';
            messageDiv.style.borderColor = '#ffeaa7';
            break;
        default:
            messageDiv.style.backgroundColor = '#e9ecef';
            messageDiv.style.color = '#495057';
            messageDiv.style.borderColor = '#dee2e6';
    }
}

/**
 * Función para cambiar las credenciales de login
 * @param {Event} event - Evento de submit del formulario
 */
async function changeCredentials(event) {
    event.preventDefault(); // Evitar el submit tradicional
    
    // Validar formulario antes de proceder
    if (!validateCredentialsForm()) {
        return;
    }
    
    try {
        // Obtener datos del formulario
        const formData = {
            current_password: document.getElementById('currentPassword').value.trim(),
            new_password: document.getElementById('newPassword').value.trim()
        };
        
        console.log('🔐 Cambiando credenciales con datos:', formData);
        
        // Mostrar indicador de carga
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Cambiando Contraseña...';
        submitBtn.disabled = true;
        
        // Hacer la solicitud al endpoint de cambio de contraseña
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + formData.current_password)}`;
        
        const response = await window.ApiClient.apiRequest('/users/change-password', {
            method: 'POST',
            body: JSON.stringify({
                new_password: formData.new_password
            })
        });
        
        // Restaurar el botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar la contraseña');
        }
        
        const result = await response.json();
        
        console.log('✅ Credenciales cambiadas exitosamente:', result);
        
        // Mostrar mensaje de éxito
        showMessage('✅ Contraseña cambiada exitosamente', 'success');
        
        // Actualizar credenciales en sessionStorage
        if (authCredentials) {
            authCredentials.password = formData.new_password;
            sessionStorage.setItem('authCredentials', JSON.stringify(authCredentials));
            console.log('✅ Credenciales actualizadas en sessionStorage');
        }
        
        // Cerrar el modal después de un breve retraso para que el usuario vea el mensaje
        setTimeout(() => {
            closeEditCredentialsModal();
            showAlert('✅ Contraseña cambiada exitosamente', 'success');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error cambiando credenciales:', error);
        showMessage('❌ Error al cambiar la contraseña: ' + error.message, 'error');
    }
}

/**
 * Función para validar credenciales actuales (opcional, para mayor seguridad)
 * @param {string} password - Contraseña a validar
 * @returns {Promise<boolean>} - True si las credenciales son válidas
 */
async function validateCurrentCredentials(password) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authCredentials) headers['Authorization'] = `Basic ${btoa(authCredentials.username + ':' + password)}`;
        
        const response = await window.ApiClient.apiRequest('/users/validate', {
            method: 'POST',
            headers: headers
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('Error validando credenciales:', error);
        return false;
    }
}

// Exportar funciones para que estén disponibles globalmente
window.openEditCredentialsModal = openEditCredentialsModal;
window.closeEditCredentialsModal = closeEditCredentialsModal;
window.validateCredentialsForm = validateCredentialsForm;
window.showMessage = showMessage;
window.changeCredentials = changeCredentials;
window.validateCurrentCredentials = validateCurrentCredentials;

// >>> EVENT LISTENERS PARA FORMULARIO DE CREDENCIALES

// Agregar event listener para el formulario de edición de credenciales
document.addEventListener('DOMContentLoaded', function() {
    const editCredentialsForm = document.getElementById('editCredentialsForm');
    if (editCredentialsForm) {
        editCredentialsForm.addEventListener('submit', changeCredentials);
    }
    
    // Cerrar modal al hacer clic fuera de él
    const modal = document.getElementById('editCredentialsModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeEditCredentialsModal();
            }
        });
    }
});

console.log('✅ Solución para el modal de credenciales cargada correctamente');