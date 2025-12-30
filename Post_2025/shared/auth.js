// Sistema de autenticación unificado para todas las páginas
if (typeof authCredentials === 'undefined') {
    var authCredentials = null;
}
if (typeof isLoggedIn === 'undefined') {
    var isLoggedIn = false;
}

// Cargar credenciales del almacenamiento al iniciar
function loadAuthFromStorage() {
    const stored = sessionStorage.getItem('authCredentials');
    if (stored) {
        authCredentials = JSON.parse(stored);
        isLoggedIn = true;
    }
}

// Guardar credenciales en almacenamiento
function saveAuthToStorage() {
    if (authCredentials) {
        sessionStorage.setItem('authCredentials', JSON.stringify(authCredentials));
    } else {
        sessionStorage.removeItem('authCredentials');
    }
}

// Crear y mostrar modal de login
function showLoginModal(onSuccess = null, onCancel = null) {
    // Si ya está logueado, ejecutar callback de éxito
    if (isLoggedIn && authCredentials) {
        if (typeof onSuccess === 'function') onSuccess();
        return;
    }

    // Verificar si el modal ya existe
    let modal = document.getElementById('auth-login-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    // Crear modal
    modal = document.createElement('div');
    modal.id = 'auth-login-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
            position: relative;
            text-align: center;
        ">
            <button onclick="closeLoginModal()" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            ">&times;</button>

            <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 2rem; color: #667eea; margin-bottom: 0.5rem;">🔐</div>
                <h2 style="color: #333; margin: 0; font-size: 1.5rem;">Iniciar Sesión</h2>
                <p style="color: #666; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                    Ingresa tus credenciales para continuar
                </p>
            </div>

            <form id="auth-login-form" style="text-align: left;">
                <div style="margin-bottom: 1rem;">
                    <label for="auth-username" style="
                        display: block;
                        margin-bottom: 0.5rem;
                        color: #555;
                        font-weight: 500;
                    ">Usuario:</label>
                    <input type="text" id="auth-username" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 2px solid #ddd;
                        border-radius: 6px;
                        font-size: 1rem;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label for="auth-password" style="
                        display: block;
                        margin-bottom: 0.5rem;
                        color: #555;
                        font-weight: 500;
                    ">Contraseña:</label>
                    <input type="password" id="auth-password" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 2px solid #ddd;
                        border-radius: 6px;
                        font-size: 1rem;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button type="submit" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 6px;
                        font-size: 1rem;
                        cursor: pointer;
                        flex: 1;
                        transition: transform 0.2s;
                    ">Iniciar Sesión</button>
                    <button type="button" onclick="closeLoginModal()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 6px;
                        font-size: 1rem;
                        cursor: pointer;
                        flex: 1;
                        transition: transform 0.2s;
                    ">Cancelar</button>
                </div>
            </form>

            <div id="auth-message" style="
                margin-top: 1rem;
                padding: 0.75rem;
                border-radius: 6px;
                display: none;
            "></div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const form = modal.querySelector('#auth-login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin(onSuccess, onCancel);
    });

    // Auto-focus en username
    setTimeout(() => {
        const usernameInput = modal.querySelector('#auth-username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

// Cerrar modal de login
function closeLoginModal() {
    const modal = document.getElementById('auth-login-modal');
    if (modal) {
        modal.remove();
    }
}

// Manejar login
async function handleLogin(onSuccess = null, onCancel = null) {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const messageDiv = document.getElementById('auth-message');

    if (!username || !password) {
        showAuthMessage('Por favor ingresa usuario y contraseña', 'error');
        return;
    }

    // Mostrar loading
    const submitBtn = document.querySelector('#auth-login-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verificando...';
    submitBtn.disabled = true;

    try {
        // Intentar validar credenciales con una petición de prueba
        const testResponse = await fetch('/api/test-auth', {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password),
                'Content-Type': 'application/json'
            }
        });

        if (testResponse.ok) {
            // Credenciales válidas
            authCredentials = { username, password };
            isLoggedIn = true;
            saveAuthToStorage();

            // Actualizar la UI inmediatamente después de validar las credenciales
            if (typeof updateUIBasedOnAuth === 'function') {
                updateUIBasedOnAuth();
            }

            showAuthMessage('✅ Sesión iniciada correctamente', 'success');

            // Cerrar modal después de 1 segundo
            setTimeout(() => {
                closeLoginModal();
                if (typeof onSuccess === 'function') onSuccess();
            }, 1000);

        } else if (testResponse.status === 401) {
            showAuthMessage('❌ Usuario o contraseña incorrectos', 'error');
        } else {
            showAuthMessage('❌ Error de conexión. Intenta nuevamente.', 'error');
        }

    } catch (error) {
        console.error('Error during login:', error);
        showAuthMessage('❌ Error de conexión. Verifica tu conexión a internet.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Mostrar mensaje en el modal
function showAuthMessage(message, type) {
    const messageDiv = document.getElementById('auth-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.background = type === 'error' ? '#f8d7da' : '#d4edda';
        messageDiv.style.color = type === 'error' ? '#721c24' : '#155724';
        messageDiv.style.border = `1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'}`;
    }
}

// Logout
function logout() {
    authCredentials = null;
    isLoggedIn = false;
    sessionStorage.removeItem('authCredentials');
    alert('👋 Sesión cerrada');
}

// Verificar si está autenticado
function requireAuth(onSuccess = null, onCancel = null) {
    if (isLoggedIn && authCredentials) {
        if (typeof onSuccess === 'function') onSuccess();
    } else {
        showLoginModal(onSuccess, onCancel);
    }
}

// Obtener headers de autenticación
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
}

// Inicializar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadAuthFromStorage();
});

// Función auxiliar para verificar autenticación en respuestas 401
function handleAuthError() {
    isLoggedIn = false;
    authCredentials = null;
    sessionStorage.removeItem('authCredentials');
    showLoginModal();
}