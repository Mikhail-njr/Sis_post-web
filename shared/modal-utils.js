// Utilidades para creación y manejo de modales en el frontend

/**
 * Crea y muestra un modal con contenido personalizado
 * @param {Object} options - Opciones de configuración del modal
 * @param {string} options.title - Título del modal
 * @param {string} options.content - Contenido HTML del modal
 * @param {Array} options.buttons - Array de botones [{text: 'Cerrar', class: 'btn-secondary', onclick: function}]
 * @param {string} options.size - Tamaño del modal ('small', 'medium', 'large')
 * @param {boolean} options.closable - Si se puede cerrar haciendo clic fuera (default: true)
 * @param {Function} options.onClose - Callback cuando se cierra el modal
 * @returns {HTMLElement} El elemento modal creado
 */
function createModal(options = {}) {
    const {
        title = '',
        content = '',
        buttons = [{ text: 'Cerrar', class: 'btn-secondary', onclick: () => {} }],
        size = 'medium',
        closable = true,
        onClose = null
    } = options;

    // Determinar tamaño del modal
    const sizeClasses = {
        small: 'max-width: 400px;',
        medium: 'max-width: 600px;',
        large: 'max-width: 800px;'
    };

    // Crear el modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        ${closable ? 'cursor: pointer;' : ''}
    `;

    // Crear el contenido del modal
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        ${sizeClasses[size]}
        max-height: 90%;
        overflow-y: auto;
        cursor: default;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    // Crear el header si hay título
    if (title) {
        const header = document.createElement('div');
        header.style.cssText = `
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        `;

        const titleElement = document.createElement('h3');
        titleElement.style.cssText = `
            margin: 0;
            color: #2c3e50;
            font-size: 18px;
            font-weight: bold;
        `;
        titleElement.textContent = title;

        header.appendChild(titleElement);
        modalContent.appendChild(header);
    }

    // Agregar contenido
    if (content) {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        modalContent.appendChild(contentDiv);
    }

    // Crear botones
    if (buttons && buttons.length > 0) {
        const buttonGroup = document.createElement('div');
        buttonGroup.style.cssText = `
            text-align: center;
            margin-top: 20px;
        `;

        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn ${buttonConfig.class || 'btn-secondary'}`;
            button.style.cssText = `
                font-size: 14px;
                padding: 10px 20px;
                margin: 0 5px;
            `;
            button.textContent = buttonConfig.text;

            if (buttonConfig.onclick) {
                button.onclick = () => {
                    buttonConfig.onclick();
                    closeModal(modal, onClose);
                };
            } else {
                button.onclick = () => closeModal(modal, onClose);
            }

            buttonGroup.appendChild(button);
        });

        modalContent.appendChild(buttonGroup);
    }

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Agregar clase para animación
    setTimeout(() => modal.classList.add('show'), 10);

    // Evento para cerrar al hacer clic fuera
    if (closable) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(modal, onClose);
            }
        });
    }

    // Prevenir cierre con ESC si no es closable
    if (!closable) {
        const preventEscClose = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', preventEscClose);
        modal._preventEscClose = preventEscClose;
    }

    return modal;
}

/**
 * Cierra un modal
 * @param {HTMLElement} modal - El elemento modal a cerrar
 * @param {Function} onClose - Callback opcional al cerrar
 */
function closeModal(modal, onClose = null) {
    if (!modal) return;

    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        if (onClose) {
            onClose();
        }
    }, 300);
}

/**
 * Crea un modal de confirmación simple
 * @param {string} message - Mensaje de confirmación
 * @param {Function} onConfirm - Callback si se confirma
 * @param {Function} onCancel - Callback si se cancela
 * @param {string} title - Título del modal
 */
function showConfirmModal(message, onConfirm, onCancel = null, title = 'Confirmar') {
    const content = `<p style="margin: 0; color: #333; font-size: 16px;">${message}</p>`;

    const buttons = [
        {
            text: 'Cancelar',
            class: 'btn-secondary',
            onclick: onCancel
        },
        {
            text: 'Confirmar',
            class: 'btn-primary',
            onclick: onConfirm
        }
    ];

    createModal({
        title,
        content,
        buttons,
        size: 'small'
    });
}

/**
 * Crea un modal de alerta simple
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta ('info', 'success', 'warning', 'error')
 * @param {string} title - Título del modal
 */
function showAlertModal(message, type = 'info', title = 'Información') {
    const colors = {
        info: '#17a2b8',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
    };

    const content = `
        <div style="
            padding: 20px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            text-align: center;
            font-size: 16px;
        ">
            ${message}
        </div>
    `;

    createModal({
        title,
        content,
        buttons: [{ text: 'Aceptar', class: 'btn-primary' }],
        size: 'small'
    });
}

/**
 * Crea un modal con detalles de una lista de items
 * @param {string} title - Título del modal
 * @param {Array} items - Array de items a mostrar
 * @param {Function} itemRenderer - Función para renderizar cada item
 * @param {Object} options - Opciones adicionales
 */
function showDetailsModal(title, items, itemRenderer, options = {}) {
    const {
        emptyMessage = 'No hay elementos para mostrar',
        maxHeight = '400px'
    } = options;

    let content = '';

    if (items && items.length > 0) {
        content = `
            <div style="max-height: ${maxHeight}; overflow-y: auto;">
                ${items.map(item => itemRenderer(item)).join('')}
            </div>
        `;
    } else {
        content = `<p style="color: #666; text-align: center; margin: 40px 0;">${emptyMessage}</p>`;
    }

    createModal({
        title,
        content,
        size: 'large'
    });
}

module.exports = {
    createModal,
    closeModal,
    showConfirmModal,
    showAlertModal,
    showDetailsModal
};