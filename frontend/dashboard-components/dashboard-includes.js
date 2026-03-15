/**
 * Dashboard Components Loader
 * Sistema de carga dinámica de componentes para modularizar dashboard.html
 * 
 * Uso: await DashboardLoader.loadComponent('products-section');
 */

const DashboardLoader = {
    // Cache para componentes ya cargados
    componentCache: new Map(),
    
    // Ruta base de los componentes
    basePath: 'dashboard-components/',
    
    // Componentes disponibles y sus archivos
    components: {
        // Secciones del dashboard
        'ventas-section': 'sections/dashboard-sales.html',
        'promociones-section': 'sections/dashboard-promociones.html',
        'metricas-section': 'sections/dashboard-metricas.html',
        'productos-section': 'sections/dashboard-productos.html',
        'lotes-section': 'sections/dashboard-lotes.html',
        'historial-cierres-section': 'sections/dashboard-cierres.html',
        'proveedores-section': 'sections/dashboard-proveedores.html',
        'clientes-section': 'sections/dashboard-clientes.html',
        'operations-log-section': 'sections/dashboard-operations.html',
        
        // Modales de Productos
        'editModal': 'modals/product-edit-modal.html',
        'addModal': 'modals/product-add-modal.html',
        
        // Modales de Proveedores
        'addSupplierModal': 'modals/supplier-add-modal.html',
        'editSupplierModal': 'modals/supplier-edit-modal.html',
        
        // Modales de Clientes
        'addClientModal': 'modals/client-add-modal.html',
        'editClientModal': 'modals/client-edit-modal.html',
        'clientDebtsModal': 'modals/client-debts-modal.html',
        
        // Modales de Lotes
        'createLoteModal': 'modals/lote-create-modal.html',
        'editLoteModal': 'modals/lote-edit-modal.html',
        'confirmDeliveryModal': 'modals/lote-confirm-delivery-modal.html',
        
        // Modales de Pedidos
        'createOrderModal': 'modals/order-create-modal.html',
        
        // Modales de Caja
        'cierreModal': 'modals/cierre-modal.html',
        'retroactiveClosureModal': 'modals/retroactive-closure-modal.html',
        
        // Modales de Deudas
        'debtsUpdateSummaryModal': 'modals/debts-update-summary-modal.html',
        'debtsSummaryModal': 'modals/debts-summary-modal.html',
        'paymentHistoryModal': 'modals/payment-history-modal.html',
        
        // Otros modales
        'createPromotionModal': 'modals/promotion-create-modal.html',
        'reportOptionsModal': 'modals/report-options-modal.html',
        'supportModal': 'modals/support-modal.html',
        'notificationsModal': 'modals/notifications-modal.html',
        'invoiceDetailsModal': 'modals/invoice-details-modal.html',
        'backupModal': 'modals/backup-modal.html',
        'resetModal': 'modals/reset-modal.html'
    },
    
    /**
     * Carga un componente específico
     * @param {string} componentId - ID del componente a cargar
     * @returns {Promise<string>} - HTML del componente
     */
    async loadComponent(componentId) {
        // Si ya está en cache, retornarlo
        if (this.componentCache.has(componentId)) {
            return this.componentCache.get(componentId);
        }
        
        const componentPath = this.components[componentId];
        if (!componentPath) {
            console.warn(`Componente ${componentId} no encontrado`);
            return '';
        }
        
        try {
            const response = await fetch(this.basePath + componentPath);
            if (!response.ok) {
                throw new Error(`Error cargando componente: ${response.status}`);
            }
            const html = await response.text();
            this.componentCache.set(componentId, html);
            return html;
        } catch (error) {
            console.error(`Error cargando ${componentId}:`, error);
            return '';
        }
    },
    
    /**
     * Inserta un componente en el elemento especificado
     * @param {string} componentId - ID del componente
     * @param {string} targetId - ID del elemento destino
     */
    async insertComponent(componentId, targetId) {
        const target = document.getElementById(targetId);
        if (!target) {
            console.error(`Elemento destino ${targetId} no encontrado`);
            return;
        }
        
        const html = await this.loadComponent(componentId);
        if (html) {
            target.innerHTML = html;
        }
    },
    
    /**
     * Carga todos los componentes iniciales (lazy loading)
     */
    async loadAllComponents() {
        console.log('Inicializando Dashboard Loader...');
        
        // Marcar todos los componentes con data-lazy-load
        const lazyComponents = document.querySelectorAll('[data-lazy-load]');
        
        for (const el of lazyComponents) {
            const componentId = el.dataset.lazyLoad;
            if (componentId && this.components[componentId]) {
                // Cargar el componente y reemplazar el placeholder
                const html = await this.loadComponent(componentId);
                if (html) {
                    el.innerHTML = html;
                }
            }
        }
    },
    
    /**
     * Precarga componentes específicos (útil para modales que se abrirán pronto)
     * @param {string[]} componentIds - Array de IDs de componentes
     */
    async preloadComponents(componentIds) {
        for (const id of componentIds) {
            await this.loadComponent(id);
        }
    },
    
    /**
     * Limpia el cache de componentes
     */
    clearCache() {
        this.componentCache.clear();
    },
    
    /**
     * Obtiene el tamaño del cache
     */
    getCacheSize() {
        return this.componentCache.size;
    }
};

// Hacer disponible globalmente
window.DashboardLoader = DashboardLoader;

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Cargar componentes marcados para carga diferida
    DashboardLoader.loadAllComponents().catch(console.error);
});
