// API Client Module - Centralized API request handling
// Handles authentication, error handling, and common API patterns

// Global API base URL
const API_BASE = window.location.protocol + '//' + window.location.host + '/api';

// Formatear moneda (formato argentino)
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

// Note: authCredentials is declared in shared/auth.js and used here

// Centralized API request function with authentication and error handling
async function apiRequest(endpoint, options = {}) {
    try {
        console.log('Enviando datos a la API:', endpoint, options);

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authentication if available
        if (authCredentials) {
            headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: headers,
            ...options
        });

        if (response.status === 401) {
            // Authentication required - show login modal
            return new Promise((resolve, reject) => {
                showLoginModal('Autenticación requerida para continuar:', async () => {
                    try {
                        // Retry the request with new credentials
                        const retryHeaders = {
                            'Content-Type': 'application/json',
                            ...options.headers
                        };
                        if (authCredentials) {
                            retryHeaders['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
                        }

                        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                            headers: retryHeaders,
                            ...options
                        });

                        if (!retryResponse.ok) {
                            throw new Error(`Error ${retryResponse.status}: ${retryResponse.statusText}`);
                        }

                        const result = await retryResponse.json();
                        resolve(result);
                    } catch (retryError) {
                        reject(retryError);
                    }
                });
            });
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en API request:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.ApiClient = {
    apiRequest,
    API_BASE,
    formatCurrency
};

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRequest,
        API_BASE,
        formatCurrency
    };
}