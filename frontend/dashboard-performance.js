// Sistema de Carga Asíncrona con Skeleton Loaders para Dashboard POS
// Optimiza el rendimiento eliminando bloqueos y mejorando la UX

// === CONFIGURACIÓN DEL SISTEMA ===
const DashboardLoader = {
    // Configuración de carga
    config: {
        parallelLoad: true,           // Carga paralela de módulos
        skeletonDuration: 1000,       // Duración mínima del skeleton (ms)
        retryAttempts: 3,             // Intentos de reintentos
        retryDelay: 1000,             // Retraso entre reintentos (ms)
        timeout: 15000                // Timeout de carga (ms)
    },

    // Estado del sistema
    state: {
        isLoading: false,
        loadedModules: new Set(),
        errorModules: new Set(),
        cache: new Map(),
        startTime: null
    },

    // Módulos del dashboard
    modules: {
        'ventas': {
            endpoint: '/sales',
            method: 'GET',
            priority: 1,
            dependencies: [],
            processor: 'processSalesData'
        },
        'productos': {
            endpoint: '/products',
            method: 'GET',
            priority: 2,
            dependencies: ['lotes'],
            processor: 'processProductsData'
        },
        'lotes': {
            endpoint: '/lotes',
            method: 'GET',
            priority: 3,
            dependencies: [],
            processor: 'processLotesData'
        },
        'promociones': {
            endpoint: '/promotions',
            method: 'GET',
            priority: 4,
            dependencies: [],
            processor: 'processPromotionsData'
        },
        'metricas': {
            endpoint: '/top-products',
            method: 'GET',
            priority: 5,
            dependencies: [],
            processor: 'processMetricsData'
        },
        'clientes': {
            endpoint: '/customers',
            method: 'GET',
            priority: 6,
            dependencies: [],
            processor: 'processClientsData'
        },
        'proveedores': {
            endpoint: '/suppliers',
            method: 'GET',
            priority: 7,
            dependencies: [],
            processor: 'processSuppliersData'
        },
        'cierres': {
            endpoint: '/cierres',
            method: 'GET',
            priority: 8,
            dependencies: [],
            processor: 'processClosuresData'
        },
        'operaciones': {
            endpoint: '/operations-log',
            method: 'GET',
            priority: 9,
            dependencies: [],
            processor: 'processOperationsData'
        }
    },

    // === MÉTODOS PRINCIPALES ===

    /**
     * Inicia la carga del dashboard con sistema asíncrono
     */
    async init() {
        console.log('🚀 Iniciando Dashboard con carga asíncrona optimizada');
        this.state.startTime = Date.now();
        this.state.isLoading = true;

        // Mostrar skeleton general
        this.showGlobalSkeleton();

        // Iniciar carga de módulos según prioridad
        await this.loadModulesByPriority();

        // Ocultar skeleton general después de carga mínima
        setTimeout(() => {
            this.hideGlobalSkeleton();
            this.showPerformanceMetrics();
        }, this.config.skeletonDuration);

        this.state.isLoading = false;
        console.log('✅ Dashboard completamente cargado');
    },

    /**
     * Carga módulos según su prioridad
     */
    async loadModulesByPriority() {
        const modulesByPriority = Object.entries(this.modules)
            .sort(([,a], [,b]) => a.priority - b.priority);

        // Cargar módulos de alta prioridad primero (ventas, productos)
        const highPriority = modulesByPriority.filter(([name, config]) => config.priority <= 3);
        const lowPriority = modulesByPriority.filter(([name, config]) => config.priority > 3);

        // Cargar en paralelo según categorías de prioridad
        await this.loadModuleCategory(highPriority, 'Alta');
        await this.loadModuleCategory(lowPriority, 'Baja');
    },

    /**
     * Carga una categoría de módulos en paralelo
     */
    async loadModuleCategory(modules, category) {
        console.log(`📦 Cargando módulos de prioridad ${category}:`, modules.map(([name]) => name));

        const loadPromises = modules.map(async ([name, config]) => {
            try {
                await this.loadModule(name, config);
            } catch (error) {
                console.warn(`⚠️ Error cargando módulo ${name}:`, error.message);
                this.showErrorModule(name, error.message);
            }
        });

        await Promise.allSettled(loadPromises);
    },

    /**
     * Carga un módulo específico con manejo de errores y reintentos
     */
    async loadModule(moduleName, config) {
        const startTime = Date.now();

        // Verificar dependencias
        await this.checkDependencies(config.dependencies);

        // Intentar carga con reintentos
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                console.log(`🔄 Cargando módulo: ${moduleName} (Intento ${attempt})`);

                // Mostrar skeleton específico
                this.showModuleSkeleton(moduleName);

                // Realizar solicitud con timeout
                const data = await this.fetchWithTimeout(moduleName, config);

                // Procesar datos
                await this.processModuleData(moduleName, data);

                // Ocultar skeleton y mostrar éxito
                this.hideModuleSkeleton(moduleName);
                this.showModuleSuccess(moduleName);

                // Registrar métricas
                const loadTime = Date.now() - startTime;
                console.log(`✅ Módulo ${moduleName} cargado en ${loadTime}ms`);

                this.state.loadedModules.add(moduleName);
                return;

            } catch (error) {
                console.warn(`❌ Intento ${attempt} fallido para ${moduleName}:`, error.message);

                if (attempt === this.config.retryAttempts) {
                    throw error;
                }

                // Esperar antes del reintento
                await this.delay(this.config.retryDelay * attempt);
            }
        }
    },

    /**
     * Realiza solicitud con timeout y manejo de errores
     */
    async fetchWithTimeout(moduleName, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Module': moduleName,
                'X-Request-Time': Date.now().toString()
            };

            

            const response = await fetch(`${window.ApiClient.API_BASE}${config.endpoint}`, {
                method: config.method,
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Timeout: La solicitud tardó demasiado en responder');
            }

            throw error;
        }
    },

    /**
     * Procesa los datos de un módulo
     */
    async processModuleData(moduleName, data) {
        const processor = this.modules[moduleName].processor;

        if (typeof window[processor] === 'function') {
            await window[processor](data);
        } else {
            console.warn(`⚠️ Procesador no encontrado para ${moduleName}: ${processor}`);
            // Procesamiento genérico
            this.renderGenericModule(moduleName, data);
        }
    },

    // === MÉTODOS DE UI Y SKELETONS ===

    /**
     * Muestra skeleton global del dashboard
     */
    showGlobalSkeleton() {
        const container = document.querySelector('.container');
        if (!container) return;

        // Crear overlay de carga
        const overlay = document.createElement('div');
        overlay.id = 'dashboard-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 48px; margin-bottom: 10px; animation: pulse 2s infinite;">🚀</div>
                <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #ffffff;">Optimizando tu Experiencia</h2>
                <p style="margin: 0; color: #cccccc; font-size: 14px;">Cargando dashboard con tecnología asíncrona</p>
                <div style="width: 200px; height: 4px; background: #444; margin: 20px auto; border-radius: 2px; overflow: hidden;">
                    <div id="global-loading-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #17a2b8, #28a745); transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        container.appendChild(overlay);

        // Animación de barra de progreso
        this.animateLoadingBar();
    },

    /**
     * Oculta skeleton global
     */
    hideGlobalSkeleton() {
        const overlay = document.getElementById('dashboard-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => overlay.remove(), 500);
        }
    },

    /**
     * Muestra skeleton para un módulo específico
     */
    showModuleSkeleton(moduleName) {
        const section = document.getElementById(`${moduleName}-section`);
        if (!section) return;

        const content = section.querySelector('.section-content');
        if (!content) return;

        // Marcar sección como cargando
        content.setAttribute('data-loading', 'true');
        content.style.opacity = '0.7';

        // Crear skeleton específico
        const skeleton = document.createElement('div');
        skeleton.className = 'module-skeleton';
        skeleton.style.cssText = `
            padding: 20px;
            background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
            height: 200px;
            margin-bottom: 20px;
        `;

        content.insertBefore(skeleton, content.firstChild);
    },

    /**
     * Oculta skeleton de un módulo
     */
    hideModuleSkeleton(moduleName) {
        const section = document.getElementById(`${moduleName}-section`);
        if (!section) return;

        const content = section.querySelector('.section-content');
        if (!content) return;

        // Remover skeleton
        const skeleton = content.querySelector('.module-skeleton');
        if (skeleton) {
            skeleton.remove();
        }

        content.removeAttribute('data-loading');
        content.style.opacity = '1';
    },

    /**
     * Muestra mensaje de éxito para un módulo
     */
    showModuleSuccess(moduleName) {
        const section = document.getElementById(`${moduleName}-section`);
        if (!section) return;

        // Añadir badge de carga exitosa
        const header = section.querySelector('.section-header');
        if (header) {
            const badge = document.createElement('span');
            badge.style.cssText = `
                background: #28a745;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                margin-left: 10px;
                animation: fadeIn 0.5s;
            `;
            badge.textContent = '✓ Cargado';
            header.appendChild(badge);

            // Remover badge después de 3 segundos
            setTimeout(() => badge.remove(), 3000);
        }
    },

    /**
     * Muestra error para un módulo
     */
    showErrorModule(moduleName, errorMessage) {
        const section = document.getElementById(`${moduleName}-section`);
        if (!section) return;

        const content = section.querySelector('.section-content');
        if (!content) return;

        // Crear mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'module-error';
        errorDiv.style.cssText = `
            background: #4a2d2d;
            color: #ff9999;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #dc3545;
            margin: 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        errorDiv.innerHTML = `
            <span style="font-size: 18px;">⚠️</span>
            <div>
                <strong>Error cargando ${moduleName}:</strong>
                <br><small>${errorMessage}</small>
            </div>
            <button onclick="DashboardLoader.retryModule('${moduleName}')" 
                    style="margin-left: auto; background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                Reintentar
            </button>
        `;

        content.appendChild(errorDiv);
        this.state.errorModules.add(moduleName);
    },

    /**
     * Reintenta cargar un módulo fallido
     */
    async retryModule(moduleName) {
        const config = this.modules[moduleName];
        if (!config) return;

        try {
            await this.loadModule(moduleName, config);
            // Remover mensaje de error
            const errorDiv = document.querySelector(`#${moduleName}-section .module-error`);
            if (errorDiv) errorDiv.remove();
        } catch (error) {
            console.error(`❌ Reintento fallido para ${moduleName}:`, error);
        }
    },

    // === MÉTODOS DE MANEJO DE DEPENDENCIAS ===

    /**
     * Verifica y carga dependencias de un módulo
     */
    async checkDependencies(dependencies) {
        if (!dependencies || dependencies.length === 0) return;

        const missingDeps = dependencies.filter(dep => !this.state.loadedModules.has(dep));
        
        if (missingDeps.length > 0) {
            console.log(`🔗 Cargando dependencias para módulo:`, missingDeps);
            await Promise.all(missingDeps.map(dep => this.loadModule(dep, this.modules[dep])));
        }
    },

    // === MÉTODOS DE RENDIMIENTO ===

    /**
     * Anima la barra de progreso global
     */
    animateLoadingBar() {
        const bar = document.getElementById('global-loading-bar');
        if (!bar) return;

        let width = 0;
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
                return;
            }
            width += Math.random() * 10;
            bar.style.width = Math.min(width, 100) + '%';
        }, 200);
    },

    /**
     * Muestra métricas de rendimiento
     */
    showPerformanceMetrics() {
        const totalTime = Date.now() - this.state.startTime;
        const loadedCount = this.state.loadedModules.size;
        const errorCount = this.state.errorModules.size;

        console.log(`📊 Métricas de carga:`);
        console.log(`   - Tiempo total: ${totalTime}ms`);
        console.log(`   - Módulos cargados: ${loadedCount}`);
        console.log(`   - Errores: ${errorCount}`);

        // Mostrar notificación de rendimiento
        if (totalTime < 3000) {
            this.showNotification('🚀 Dashboard cargado rápidamente en ' + totalTime + 'ms', 'success');
        } else if (totalTime < 5000) {
            this.showNotification('⚡ Dashboard cargado en ' + totalTime + 'ms', 'info');
        } else {
            this.showNotification('⏳ Dashboard cargado en ' + totalTime + 'ms (considera optimizar)', 'warning');
        }
    },

    /**
     * Muestra notificación de sistema
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Retraso asincrónico
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // === MÉTODOS DE RENDERIZADO GENÉRICO ===

    /**
     * Renderizado genérico para módulos sin procesador específico
     */
    renderGenericModule(moduleName, data) {
        const section = document.getElementById(`${moduleName}-section`);
        if (!section) return;

        const content = section.querySelector('.section-content');
        if (!content) return;

        const loading = content.querySelector('.loading');
        if (loading) loading.style.display = 'none';

        const container = content.querySelector(`#${moduleName}-container`) || content;
        
        if (Array.isArray(data) && data.length > 0) {
            container.style.display = 'block';
            container.innerHTML = `
                <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="color: white; margin: 0 0 10px 0;">${moduleName.toUpperCase()}</h4>
                    <p style="color: #cccccc; margin: 0;">${data.length} registros cargados</p>
                </div>
            `;
        } else {
            container.style.display = 'block';
            container.innerHTML = `
                <div style="background: #4a4a4a; padding: 20px; border-radius: 8px; text-align: center;">
                    <p style="color: #cccccc; margin: 0;">No hay datos disponibles para ${moduleName}</p>
                </div>
            `;
        }
    }
};

// === ESTILOS CSS PARA SKELETONS ===
const skeletonStyles = `
<style>
    @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .module-skeleton {
        position: relative;
        overflow: hidden;
    }

    .module-skeleton::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: shimmer 1.5s infinite;
    }

    .section-content[data-loading="true"] {
        position: relative;
    }

    .section-content[data-loading="true"]::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.1);
        z-index: 1;
        pointer-events: none;
    }
</style>
`;

// Inyectar estilos
document.head.insertAdjacentHTML('beforeend', skeletonStyles);

// === INTEGRACIÓN CON EL SISTEMA EXISTENTE ===

// Reemplazar la función fetchAndDisplayData original
const originalFetchAndDisplayData = window.fetchAndDisplayData;

window.fetchAndDisplayData = async function() {
    console.log('🔄 Iniciando carga optimizada del dashboard...');
    
    // Si el sistema de carga optimizada está disponible, usarlo
    if (typeof DashboardLoader !== 'undefined') {
        await DashboardLoader.init();
    } else {
        // Fallback al sistema original
        console.warn('⚠️ Sistema de carga optimizada no disponible, usando carga original');
        if (typeof originalFetchAndDisplayData === 'function') {
            await originalFetchAndDisplayData();
        }
    }
};

// Exponer el sistema globalmente
window.DashboardLoader = DashboardLoader;

console.log('✅ Sistema de carga asíncrona con skeleton loaders cargado');