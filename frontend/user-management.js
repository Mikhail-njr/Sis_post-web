/**
 * Gestión de Usuarios - Sistema de Autenticación
 * Funciones para crear, editar, eliminar y listar usuarios
 */

// Asegurar que ApiClient exista con getBasicAuthHeaders
window.ApiClient = window.ApiClient || {};
if (!window.ApiClient.getBasicAuthHeaders) {
    window.ApiClient.getBasicAuthHeaders = function() {
        const headers = { 'Content-Type': 'application/json' };
        const creds = window.authCredentials;
        if (creds && creds.username && creds.password) {
            headers['Authorization'] = 'Basic ' + btoa(creds.username + ':' + creds.password);
        }
        return headers;
    };
}

// Función auxiliar para obtener headers de autenticación
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const creds = window.authCredentials;
    if (creds && creds.username && creds.password) {
        headers['Authorization'] = 'Basic ' + btoa(creds.username + ':' + creds.password);
    }
    return headers;
}

// Cargar el modal cuando se necesite
async function loadUserManagementModal() {
    const modalContainer = document.getElementById('userManagementModal');
    if (!modalContainer) {
        console.error('Modal de gestión de usuarios no encontrado');
        return;
    }
    await loadUserList();
}

// Exponer funciones al window para que estén disponibles globalmente
window.loadUserManagementModal = loadUserManagementModal;
window.loadUserList = loadUserList;

// Cargar lista de usuarios desde el backend
async function loadUserList() {
    const userListEl = document.getElementById('userList');
    if (!userListEl) return;

    try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/users', { headers });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }
        
        const data = await response.json();
        const users = data.users || data; // Manejar respuesta del API
        
        if (!Array.isArray(users)) {
            throw new Error('Formato de respuesta inválido');
        }
        
        if (users.length === 0) {
            userListEl.innerHTML = '<p style="color: #aaa;">No hay usuarios registrados</p>';
            return;
        }
        
        userListEl.innerHTML = users.map(user => `
            <div style="background: #2a2a2a; padding: 10px; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #4CAF50;">${escapeHtml(user.username)}</strong>
                    <span style="color: #888; font-size: 12px;"> - ${user.nombre_completo || 'Sin nombre'}</span>
                    <br>
                    <span style="color: #666; font-size: 11px;">Rol: ${user.rol} | Estado: ${user.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div>
                    <button onclick="editUser(${user.id}, '${escapeHtml(user.username)}', '${escapeHtml(user.nombre_completo || '')}', '${escapeHtml(user.email || '')}', '${user.rol}')" 
                            style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                        ✏️
                    </button>
                    <button onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')" 
                            style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        userListEl.innerHTML = `<p style="color: #f44336;">Error al cargar usuarios: ${error.message}</p>`;
    }
}

// Mostrar formulario para agregar usuario
function showAddUserForm() {
    document.getElementById('userForm').style.display = 'block';
    document.getElementById('userFormTitle').textContent = 'Nuevo Usuario';
    document.getElementById('userSubmitBtn').textContent = 'Crear Usuario';
    document.getElementById('userFormElement').reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('password').required = true;
    document.getElementById('passwordHint').textContent = '(requerido)';
}

// Ocultar formulario de usuario
function hideUserForm() {
    document.getElementById('userForm').style.display = 'none';
    document.getElementById('userFormElement').reset();
}

// Editar usuario - llenar formulario
function editUser(id, username, nombreCompleto, email, rol) {
    document.getElementById('userForm').style.display = 'block';
    document.getElementById('userFormTitle').textContent = 'Editar Usuario';
    document.getElementById('userSubmitBtn').textContent = 'Guardar Cambios';
    document.getElementById('editUserId').value = id;
    document.getElementById('username').value = username;
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Dejar vacío para mantener contraseña';
    document.getElementById('password').required = false;
    document.getElementById('passwordHint').textContent = '(opcional)';
    document.getElementById('nombreCompleto').value = nombreCompleto;
    document.getElementById('email').value = email;
    document.getElementById('rol').value = rol;
}

// Exponer funciones de formulario al window
window.showAddUserForm = showAddUserForm;
window.hideUserForm = hideUserForm;
window.editUser = editUser;

// Eliminar usuario
async function deleteUser(id, username) {
    if (!confirm(`¿Estás seguro de eliminar el usuario "${username}"?`)) {
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar usuario');
        }
        
        alert('Usuario eliminado exitosamente');
        await loadUserList();
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error: ' + error.message);
    }
}

// Exponer deleteUser al window
window.deleteUser = deleteUser;

// Manejar envío del formulario
document.addEventListener('DOMContentLoaded', function() {
    const userFormEl = document.getElementById('userFormElement');
    if (userFormEl) {
        userFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userId = document.getElementById('editUserId').value;
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
            const email = document.getElementById('email').value.trim();
            const rol = document.getElementById('rol').value;
            
            if (!username || !password && !userId) {
                alert('Por favor completa todos los campos requeridos');
                return;
            }
            
            const userData = {
                username,
                nombre_completo: nombreCompleto || null,
                email: email || null,
                rol
            };
            
            if (password) {
                userData.password = password;
            }
            
            try {
                const headers = getAuthHeaders();
                
                const url = userId ? `/api/users/${userId}` : '/api/users';
                const method = userId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers,
                    body: JSON.stringify(userData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al guardar usuario');
                }
                
                alert(userId ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
                hideUserForm();
                await loadUserList();
                
            } catch (error) {
                console.error('Error guardando usuario:', error);
                alert('Error: ' + error.message);
            }
        });
    }
});

// Función para abrir el modal de gestión de usuarios
window.openUserManagementModal = async function() {
    const modal = document.getElementById('userManagementModal');
    if (!modal) {
        console.error('Modal no encontrado en el DOM');
        return;
    }
    modal.style.display = 'flex';
    await loadUserList();
};

// Función para cerrar el modal
window.closeUserManagementModal = function() {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        modal.style.display = 'none';
    }
    hideUserForm();
};

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('userManagementModal');
    if (modal && e.target === modal) {
        closeUserManagementModal();
    }
});

// Función para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}
