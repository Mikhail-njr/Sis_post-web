/**
 * Integración de Autenticación para el Frontend del POS
 * 
 * Este script actualiza el frontend del POS para que utilice el nuevo sistema
 * de autenticación basado en base de datos.
 */

// ============================================
// DECLARACIONES DE VARIABLES GLOBALES
// Usamos window para evitar conflictos con otras declaraciones
// ============================================

// Inicializar credenciales si no existen (pueden haber sido definidas por shared/auth.js)
if (typeof window.authCredentials === 'undefined') {
    window.authCredentials = null;
}
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

// Log para debugging
console.log('🔐 auth-integration.js inicializado');
console.log('🔐 authCredentials:', window.authCredentials);

// Cargar desde sessionStorage si existe
try {
    const stored = sessionStorage.getItem('authCredentials');
    if (stored && !window.authCredentials) {
        window.authCredentials = JSON.parse(stored);
        console.log('🔐 Credenciales cargadas desde sessionStorage');
    }
} catch (e) {
    console.error('Error cargando credenciales:', e);
}

// ============================================
// INTERCEPTADOR GLOBAL DE FETCH
// Agrega automáticamente credenciales a todas las llamadas API
// Esto elimina la necesidad del código duplicado en dashboard.js
// ============================================

// Guardar el fetch original
globalThis._originalFetch = window.fetch;

// Sobrescribir fetch para agregar credenciales automáticamente
window.fetch = async function(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    // Agregar credenciales si existen (usar window para acceder a la variable global)
    const creds = window.authCredentials;
    if (creds && creds.username && creds.password) {
        headers['Authorization'] = 'Basic ' + btoa(creds.username + ':' + creds.password);
    }
    
    // Combinar opciones
    const mergedOptions = {
        ...options,
        headers
    };
    
    const response = await globalThis._originalFetch(url, mergedOptions);
    
    // Manejar respuesta 401 - credenciales inválidas
    if (response.status === 401) {
        console.log('🔐 Credenciales inválidas o expiradas');
        // Limpiar credenciales
        window.authCredentials = null;
        window.currentUser = null;
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('authCredentials');
            sessionStorage.removeItem('currentUser');
        }
    }
    
    return response;
};

// Extender el ApiClient para incluir autenticación
window.ApiClient = window.ApiClient || {};

// Sincronizar con window (ya que shared/auth.js puede haberlas definido)
window.authCredentials = window.authCredentials || null;
window.currentUser = window.currentUser || null;

// Extender el ApiClient con métodos de autenticación
window.ApiClient.login = async function(username, password) {
    try {
        const response = await fetch(`${this.API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error de autenticación');
        }

        const data = await response.json();
        
        // Almacenar token JWT y usuario
        window.authCredentials = {
            token: data.token,
            username: username
        };
        
        // Almacenar información del usuario
        window.currentUser = data.user;
        
        // Guardar en sessionStorage para mayor seguridad
        sessionStorage.setItem('authCredentials', JSON.stringify(window.authCredentials));
        sessionStorage.setItem('currentUser', JSON.stringify(window.currentUser));
        
        return data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
};

// Método para cerrar sesión
window.ApiClient.logout = async function() {
    try {
        // Llamar al endpoint de logout del backend
        if (window.authCredentials && window.authCredentials.token) {
            await fetch(`${window.ApiClient.API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authCredentials.token
                }
            });
        }
    } catch (error) {
        console.error('Error cerrando sesión en el backend:', error);
    }
    
    // Limpiar credenciales y usuario
    window.authCredentials = null;
    window.currentUser = null;
    sessionStorage.removeItem('authCredentials');
    sessionStorage.removeItem('currentUser');
    
    // Redirigir al login
    if (window.location.pathname !== '/index.html') {
        window.location.href = 'index.html';
    }
};

// Método para obtener el usuario actual
window.ApiClient.getCurrentUser = function() {
    return window.currentUser;
};

// Método para verificar si el usuario está autenticado
window.ApiClient.isAuthenticated = function() {
    return window.authCredentials !== null && window.currentUser !== null;
};

// Método para obtener headers de autenticación
window.ApiClient.getAuthHeaders = function() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Usar Basic Auth en lugar de Bearer token
    if (window.authCredentials && window.authCredentials.username && window.authCredentials.password) {
        headers['Authorization'] = 'Basic ' + btoa(window.authCredentials.username + ':' + window.authCredentials.password);
    }
    
    return headers;
};

// ============================================
// FUNCIONES CENTRALIZADAS PARA ELIMINAR CÓDIGO DUPLICADO
// ============================================

/**
 * Función centralizada para crear headers con Basic Auth
 * Reemplaza ~50+ lugares con código duplicado en el frontend
 * @returns {Object} Headers con autenticación Basic
 */
window.ApiClient.getBasicAuthHeaders = function() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (window.authCredentials && window.authCredentials.username && window.authCredentials.password) {
        headers['Authorization'] = 'Basic ' + btoa(window.authCredentials.username + ':' + window.authCredentials.password);
    }
    
    return headers;
};

/**
 * Función auxiliar para obtener headers con credenciales específicas
 * Útil para operaciones que requieren credenciales diferentes
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Object} Headers con autenticación Basic
 */
window.ApiClient.getBasicAuthHeadersFor = function(username, password) {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(username + ':' + password)
    };
};

// Método para verificar permisos del usuario
window.ApiClient.hasPermission = function(permission) {
    if (!currentUser) return false;
    
    // Definir permisos por rol
    const rolePermissions = {
        admin: [
            'read_users', 'create_users', 'update_users', 'delete_users',
            'read_products', 'create_products', 'update_products', 'delete_products',
            'read_sales', 'create_sales', 'update_sales', 'delete_sales',
            'read_promotions', 'create_promotions', 'update_promotions', 'delete_promotions',
            'read_suppliers', 'create_suppliers', 'update_suppliers', 'delete_suppliers',
            'read_lotes', 'create_lotes', 'update_lotes', 'delete_lotes',
            'read_cierres', 'create_cierres', 'update_cierres', 'delete_cierres',
            'read_operations', 'create_operations', 'update_operations', 'delete_operations',
            'manage_credentials', 'view_logs'
        ],
        cajero: [
            'read_products', 'update_products',
            'read_sales', 'create_sales', 'update_sales',
            'read_promotions',
            'read_lotes',
            'read_cierres', 'create_cierres'
        ],
        invitado: [
            'read_products',
            'read_sales',
            'read_promotions',
            'read_lotes'
        ]
    };

    const userPermissions = rolePermissions[currentUser.rol] || [];
    return userPermissions.includes(permission);
};

// Método para verificar rol del usuario
window.ApiClient.hasRole = function(role) {
    if (!currentUser) return false;
    return currentUser.rol === role;
};

// Método para verificar roles múltiples
window.ApiClient.hasAnyRole = function(roles) {
    if (!currentUser) return false;
    return roles.includes(currentUser.rol);
};

// Cargar credenciales desde sessionStorage al iniciar
window.ApiClient.loadAuthFromStorage = function() {
    try {
        const storedCredentials = sessionStorage.getItem('authCredentials');
        const storedUser = sessionStorage.getItem('currentUser');
        
        if (storedCredentials && storedUser) {
            authCredentials = JSON.parse(storedCredentials);
            currentUser = JSON.parse(storedUser);
            return true;
        }
    } catch (error) {
        console.error('Error cargando credenciales desde sessionStorage:', error);
    }
    return false;
};

// Función para mostrar alertas
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10000';
    alertDiv.style.padding = '15px';
    alertDiv.style.borderRadius = '5px';
    alertDiv.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    alertDiv.style.color = 'white';
    alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Función para actualizar la UI según el estado de autenticación
function updateUIBasedOnAuth() {
    const userMenu = document.getElementById('user-menu');
    const loginForm = document.getElementById('login-form');
    const mainContent = document.getElementById('main-content');
    
    if (window.ApiClient.isAuthenticated()) {
        // Usuario autenticado
        if (userMenu) {
            userMenu.style.display = 'block';
            const usernameSpan = userMenu.querySelector('.username');
            if (usernameSpan) {
                usernameSpan.textContent = currentUser.username;
            }
        }
        
        if (loginForm) {
            loginForm.style.display = 'none';
        }
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        // Actualizar permisos en la UI
        updateUIPermissions();
        
        // Mostrar mensaje de bienvenida
        showAlert(`¡Bienvenido ${currentUser.username}! Rol: ${currentUser.rol}`, 'success');
    } else {
        // Usuario no autenticado
        if (userMenu) {
            userMenu.style.display = 'none';
        }
        
        if (loginForm) {
            loginForm.style.display = 'block';
        }
        
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }
}

// Función para actualizar permisos en la UI
function updateUIPermissions() {
    if (!currentUser) return;
    
    // Ocultar/mostrar elementos según permisos
    const elements = document.querySelectorAll('[data-permission]');
    
    elements.forEach(element => {
        const permission = element.getAttribute('data-permission');
        const requiredRoles = element.getAttribute('data-roles');
        
        let hasAccess = false;
        
        if (permission) {
            hasAccess = window.ApiClient.hasPermission(permission);
        } else if (requiredRoles) {
            const roles = requiredRoles.split(',');
            hasAccess = window.ApiClient.hasAnyRole(roles);
        }
        
        if (!hasAccess) {
            element.style.display = 'none';
        }
    });
    
    // Actualizar menús según rol
    updateMenuPermissions();
}

// Función para actualizar menús según permisos
function updateMenuPermissions() {
    // Ejemplo de actualización de menús
    const adminMenuItems = document.querySelectorAll('.admin-only');
    const cajeroMenuItems = document.querySelectorAll('.cajero-only');
    
    if (window.ApiClient.hasRole('admin')) {
        adminMenuItems.forEach(item => item.style.display = 'block');
        cajeroMenuItems.forEach(item => item.style.display = 'block');
    } else if (window.ApiClient.hasRole('cajero')) {
        adminMenuItems.forEach(item => item.style.display = 'none');
        cajeroMenuItems.forEach(item => item.style.display = 'block');
    } else {
        adminMenuItems.forEach(item => item.style.display = 'none');
        cajeroMenuItems.forEach(item => item.style.display = 'none');
    }
}

// Manejador de login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAlert('Por favor ingrese usuario y contraseña', 'error');
        return;
    }
    
    try {
        await window.ApiClient.login(username, password);
        updateUIBasedOnAuth();
        
        // Redirigir según rol
        if (window.ApiClient.hasRole('admin')) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        showAlert('Error de autenticación: ' + error.message, 'error');
    }
}

// Manejador de logout
function handleLogout() {
    window.ApiClient.logout();
    updateUIBasedOnAuth();
}

// Inicializar la autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar credenciales desde localStorage
    const loaded = window.ApiClient.loadAuthFromStorage();
    
    // Si estamos en la página de login y hay credenciales, redirigir
    if (window.location.pathname.endsWith('index.html') && loaded) {
        if (window.ApiClient.hasRole('admin')) {
            window.location.href = 'dashboard.html';
        }
    }
    
    // Actualizar UI según estado de autenticación
    updateUIBasedOnAuth();
    
    // Agregar eventos de login/logout si existen los elementos
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Extender el ApiClient original para incluir autenticación en todas las solicitudes
const originalFetch = window.ApiClient.fetch || fetch;

window.ApiClient.fetch = async function(url, options = {}) {
    // Si no hay credenciales, usar el fetch original
    if (!authCredentials) {
        return originalFetch(url, options);
    }
    
    // Agregar headers de autenticación
    options.headers = {
        ...options.headers,
        ...window.ApiClient.getAuthHeaders()
    };
    
    const response = await originalFetch(url, options);
    
    // Si la respuesta es 401, redirigir al login
    if (response.status === 401) {
        window.ApiClient.logout();
        if (window.location.pathname !== '/index.html') {
            window.location.href = 'index.html';
        }
    }
    
    return response;
};

// Exportar funciones para uso en otros scripts
window.AuthIntegration = {
    showAlert,
    updateUIBasedOnAuth,
    updateUIPermissions,
    handleLogin,
    handleLogout
};

console.log('✅ Integración de autenticación cargada exitosamente');