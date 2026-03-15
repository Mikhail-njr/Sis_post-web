/**
 * Dashboard Templates
 * Templates HTML para modales y secciones del dashboard
 * Uso: DashboardTemplates.get('notificationsModal')
 */

const DashboardTemplates = {
    // Cache de templates
    _templates: {},
    
    // Templates como strings (para carga bajo demanda)
    _modalTemplates: {
        // Modal de Notificaciones
        'notificationsModal': `
            <div id="notificationsModal" class="edit-modal" style="display: none; z-index: 10000;">
                <div class="edit-form" style="max-width: 700px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #444; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #e4e9ee;">🔔 Centro de Notificaciones</h3>
                        <button onclick="toggleNotifications()" style="background: none; border: none; color: #e4e9ee; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                    <div id="notificationsContent" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
                    <div style="padding-top: 15px; border-top: 1px solid #444; margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="markAllNotificationsRead()" class="btn btn-secondary" style="font-size: 14px; padding: 8px 16px;">
                            ✅ Marcar todo como leído
                        </button>
                        <button onclick="toggleNotifications()" class="btn btn-primary" style="font-size: 14px; padding: 8px 16px;">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `,
        
        // Modal de Crear Producto
        'addModal': `
            <div id="addModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #eef2f7;">➕ Agregar Nuevo Producto</h3>
                    <form id="addProductForm">
                        <div class="form-group">
                            <label for="addProductName">Nombre *</label>
                            <input type="text" id="addProductName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addProductBarcode">Código de Barras</label>
                            <input type="text" id="addProductBarcode" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addProductCategoria">Categoría *</label>
                            <input type="text" id="addProductCategoria" list="categoriaList" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                            <datalist id="categoriaList"></datalist>
                        </div>
                        <div class="form-group">
                            <label for="addProductPrice">Precio de Venta *</label>
                            <input type="number" id="addProductPrice" step="0.01" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addProductCost">Precio de Costo</label>
                            <input type="number" id="addProductCost" step="0.01" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addProductStock">Stock Inicial</label>
                            <input type="number" id="addProductStock" value="0" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeAddModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Producto</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Editar Producto
        'editModal': `
            <div id="editModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #e9ecf0;">✏️ Editar Producto</h3>
                    <form id="editProductForm">
                        <input type="hidden" id="editProductId">
                        <div class="form-group">
                            <label for="editProductName">Nombre *</label>
                            <input type="text" id="editProductName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editProductBarcode">Código de Barras</label>
                            <input type="text" id="editProductBarcode" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editProductCategoria">Categoría *</label>
                            <input type="text" id="editProductCategoria" list="categoriaListEdit" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                            <datalist id="categoriaListEdit"></datalist>
                        </div>
                        <div class="form-group">
                            <label for="editProductPrice">Precio de Venta *</label>
                            <input type="number" id="editProductPrice" step="0.01" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editProductCost">Precio de Costo</label>
                            <input type="number" id="editProductCost" step="0.01" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Agregar Cliente
        'addClientModal': `
            <div id="addClientModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #f5f7fb;">➕ Agregar Nuevo Cliente</h3>
                    <form id="addClientForm">
                        <div class="form-group">
                            <label for="addClientDni">DNI *</label>
                            <input type="text" id="addClientDni" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addClientName">Nombre *</label>
                            <input type="text" id="addClientName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addClientPhone">Teléfono</label>
                            <input type="tel" id="addClientPhone" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addClientEmail">Email</label>
                            <input type="email" id="addClientEmail" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addClientAddress">Dirección</label>
                            <input type="text" id="addClientAddress" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addClientCreditLimit">Límite de Crédito</label>
                            <input type="number" id="addClientCreditLimit" step="0.01" value="0" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeAddClientModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Cliente</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Editar Cliente
        'editClientModal': `
            <div id="editClientModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #f5f7fb;">✏️ Editar Cliente</h3>
                    <form id="editClientForm">
                        <input type="hidden" id="editClientId">
                        <div class="form-group">
                            <label for="editClientDni">DNI *</label>
                            <input type="text" id="editClientDni" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editClientName">Nombre *</label>
                            <input type="text" id="editClientName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editClientPhone">Teléfono</label>
                            <input type="tel" id="editClientPhone" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editClientEmail">Email</label>
                            <input type="email" id="editClientEmail" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editClientAddress">Dirección</label>
                            <input type="text" id="editClientAddress" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editClientCreditLimit">Límite de Crédito</label>
                            <input type="number" id="editClientCreditLimit" step="0.01" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeEditClientModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Agregar Proveedor
        'addSupplierModal': `
            <div id="addSupplierModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #eaeff5;">➕ Agregar Nuevo Proveedor</h3>
                    <form id="addSupplierForm">
                        <div class="form-group">
                            <label for="addSupplierName">Nombre *</label>
                            <input type="text" id="addSupplierName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addSupplierCuit">CUIT</label>
                            <input type="text" id="addSupplierCuit" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addSupplierPhone">Teléfono</label>
                            <input type="tel" id="addSupplierPhone" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addSupplierEmail">Email</label>
                            <input type="email" id="addSupplierEmail" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="addSupplierAddress">Dirección</label>
                            <input type="text" id="addSupplierAddress" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeAddSupplierModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Proveedor</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Editar Proveedor
        'editSupplierModal': `
            <div id="editSupplierModal" class="edit-modal">
                <div class="edit-form">
                    <h3 style="margin-bottom: 20px; color: #f4f7fa;">✏️ Editar Proveedor</h3>
                    <form id="editSupplierForm">
                        <input type="hidden" id="editSupplierId">
                        <div class="form-group">
                            <label for="editSupplierName">Nombre *</label>
                            <input type="text" id="editSupplierName" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editSupplierCuit">CUIT</label>
                            <input type="text" id="editSupplierCuit" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editSupplierPhone">Teléfono</label>
                            <input type="tel" id="editSupplierPhone" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editSupplierEmail">Email</label>
                            <input type="email" id="editSupplierEmail" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editSupplierAddress">Dirección</label>
                            <input type="text" id="editSupplierAddress" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-secondary" onclick="closeEditSupplierModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Deudas del Cliente
        'clientDebtsModal': `
            <div id="clientDebtsModal" class="edit-modal">
                <div class="edit-form client-debts-form" style="max-width: 1300px;">
                    <h3 style="margin-bottom: 20px; color: #f5f7fb;">💳 Deudas del Cliente</h3>
                    <div id="clientDebtsContent"></div>
                    <div class="button-group" style="margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeClientDebtsModal()">Cerrar</button>
                    </div>
                </div>
            </div>
        `,
        
        // Modal de Crear Lote
        'createLoteModal': `
            <div id="createLoteModal" class="edit-modal">
                <div class="edit-form" style="max-width: 600px;">
                    <h3 style="margin-bottom: 20px; color: #eef2f7;">📦 Crear Nuevo Lote</h3>
                    <form id="createLoteForm">
                        <div class="form-group">
                            <label for="loteProduct">Producto *</label>
                            <select id="loteProduct" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                                <option value="">Seleccionar producto...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="loteNumero">Número de Lote *</label>
                            <input type="text" id="loteNumero" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="loteBarcode">Código de Barras</label>
                            <input type="text" id="loteBarcode" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="loteCantidad">Cantidad *</label>
                            <input type="number" id="loteCantidad" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="loteVencimiento">Fecha de Vencimiento *</label>
                            <input type="date" id="loteVencimiento" required style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-primary" onclick="createLote()">Crear Lote</button>
                            <button type="button" class="btn btn-secondary" onclick="closeCreateLoteModal()">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        
        // Modal de Editar Lote
        'editLoteModal': `
            <div id="editLoteModal" class="edit-modal">
                <div class="edit-form" style="max-width: 600px;">
                    <h3 style="margin-bottom: 20px; color: #f4f7fa;">✏️ Editar Lote</h3>
                    <form id="editLoteForm">
                        <input type="hidden" id="editLoteId">
                        <div class="form-group">
                            <label for="editLoteNumero">Número de Lote</label>
                            <input type="text" id="editLoteNumero" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editLoteBarcode">Código de Barras</label>
                            <input type="text" id="editLoteBarcode" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editLoteCantidad">Cantidad</label>
                            <input type="number" id="editLoteCantidad" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editLoteVencimiento">Fecha de Vencimiento</label>
                            <input type="date" id="editLoteVencimiento" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                        </div>
                        <div class="form-group">
                            <label for="editLoteEstado">Estado</label>
                            <select id="editLoteEstado" style="width: 100%; padding: 10px; border: 2px solid #030303; border-radius: 6px;">
                                <option value="vigente">Vigente</option>
                                <option value="proximo_vencer">Próximo a Vencer</option>
                                <option value="vencido">Vencido</option>
                                <option value="descartado">Descartado</option>
                            </select>
                        </div>
                        <div class="button-group">
                            <button type="button" class="btn btn-primary" onclick="updateLote()">Actualizar Lote</button>
                            <button type="button" class="btn btn-secondary" onclick="closeEditLoteModal()">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        `
    },
    
    /**
     * Obtiene un template por su nombre
     * @param {string} name - Nombre del template
     * @returns {string} - HTML del template
     */
    get(name) {
        return this._modalTemplates[name] || '';
    },
    
    /**
     * Obtiene todos los nombres de templates disponibles
     * @returns {string[]} - Array de nombres de templates
     */
    getAllNames() {
        return Object.keys(this._modalTemplates);
    },
    
    /**
     * Inserta un modal en el DOM
     * @param {string} name - Nombre del template
     * @param {string} containerId - ID del contenedor (opcional, usa body si no se especifica)
     */
    show(name, containerId = 'modals-container') {
        const template = this.get(name);
        if (!template) {
            console.warn(`Template "${name}" no encontrado`);
            return;
        }
        
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
        }
        
        container.innerHTML = template;
    },
    
    /**
     * Oculta un modal
     * @param {string} name - Nombre del template
     */
    hide(name) {
        const modal = document.getElementById(name);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Obtiene el tamaño estimado de todos los templates
     * @returns {number} - Tamaño en bytes
     */
    getSize() {
        let size = 0;
        for (const name in this._modalTemplates) {
            size += this._modalTemplates[name].length;
        }
        return size;
    }
};

// Hacer disponible globalmente
window.DashboardTemplates = DashboardTemplates;

// Log de inicialización
console.log(`📦 Dashboard Templates cargado: ${DashboardTemplates.getAllNames().length} templates disponibles`);
console.log(`💾 Tamaño aproximado: ${(DashboardTemplates.getSize() / 1024).toFixed(2)} KB`);
