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

        // Ensure body is properly stringified as JSON
        let fetchOptions = { ...options };
        if (fetchOptions.body && typeof fetchOptions.body === 'object') {
            fetchOptions.body = JSON.stringify(fetchOptions.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: headers,
            ...fetchOptions
        });

        // NEW CODE: Get response body before checking status (needed for error details)
        let responseData = null;
        const responseText = await response.text();
        try {
            responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
            // Not JSON
        }

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

                        // Ensure body is properly stringified as JSON for retry
                        let retryOptions = { ...options };
                        if (retryOptions.body && typeof retryOptions.body === 'object') {
                            retryOptions.body = JSON.stringify(retryOptions.body);
                        }

                        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                            headers: retryHeaders,
                            ...retryOptions
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
            // Try to get the error message from response body
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            if (responseData && responseData.error) {
                errorMessage = responseData.error;
                if (responseData.details && Array.isArray(responseData.details)) {
                    errorMessage += ' - ' + responseData.details.join(', ');
                }
            }
            throw new Error(errorMessage);
        }

        return responseData;
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

            // Ensure body is properly stringified as JSON
            let fetchOptions = { ...options };
            if (fetchOptions.body && typeof fetchOptions.body === 'object') {
                fetchOptions.body = JSON.stringify(fetchOptions.body);
            }

            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: headers,
                signal: controller.signal,
                ...fetchOptions
            });

            clearTimeout(timeoutId);

            // Get response body before checking status (needed for error details)
            let responseData = null;
            const responseText = await response.text();
            try {
                responseData = responseText ? JSON.parse(responseText) : null;
            } catch (e) {
                // Not JSON
            }

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

                            // Ensure body is properly stringified as JSON for retry
                            let retryOptions = { ...options };
                            if (retryOptions.body && typeof retryOptions.body === 'object') {
                                retryOptions.body = JSON.stringify(retryOptions.body);
                            }

                            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                                headers: retryHeaders,
                                signal: controller.signal,
                                ...retryOptions
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
                // Try to get the error message from response body
                let errorMessage = `Error ${response.status}: ${response.statusText}`;
                if (responseData && responseData.error) {
                    errorMessage = responseData.error;
                    if (responseData.details && Array.isArray(responseData.details)) {
                        errorMessage += ' - ' + responseData.details.join(', ');
                    }
                }
                throw new Error(errorMessage);
            }

            return responseData;
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

        // Ensure body is properly stringified as JSON
        let fetchOptions = { ...options };
        if (fetchOptions.body && typeof fetchOptions.body === 'object') {
            fetchOptions.body = JSON.stringify(fetchOptions.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: headers,
            ...fetchOptions
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