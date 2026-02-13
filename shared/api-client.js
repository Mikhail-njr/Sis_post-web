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

// Enhanced API request function with retry logic and timeout
async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 3, retryDelay = 1000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Intento ${attempt}/${maxRetries} para ${endpoint}`);
            
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
                signal: controller.signal,
                ...options
            });

            clearTimeout(timeoutId);

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
                                signal: controller.signal,
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
            if (attempt === maxRetries) {
                console.error(`Error final en API request después de ${maxRetries} intentos:`, error);
                throw error;
            }
            
            console.warn(`Error en intento ${attempt}, reintentando en ${retryDelay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
        }
    }
}

// Simple API request function for basic operations
async function simpleApiRequest(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: headers,
            ...options
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en simple API request:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.ApiClient = {
    apiRequest,
    apiRequestWithRetry,
    simpleApiRequest,
    API_BASE,
    formatCurrency
};

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRequest,
        apiRequestWithRetry,
        simpleApiRequest,
        API_BASE,
        formatCurrency
    };
}