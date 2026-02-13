/**
 * Dashboard Skeleton Loaders
 * Sistema de skeleton loaders para mejorar la experiencia de usuario durante la carga de datos
 */

// Clase para manejar skeleton loaders
class SkeletonLoader {
    constructor() {
        this.skeletons = new Map();
        this.animationFrame = null;
    }

    /**
     * Crea un skeleton loader para una sección específica
     * @param {string} sectionId - ID de la sección donde se mostrará el skeleton
     * @param {Object} options - Opciones de configuración del skeleton
     */
    createSkeleton(sectionId, options = {}) {
        const defaultOptions = {
            rows: 5,
            height: 40,
            animation: true,
            shimmer: true,
            borderRadius: 4,
            backgroundColor: '#2d2d2d',
            shimmerColor: '#3d3d3d'
        };

        const config = { ...defaultOptions, ...options };
        const section = document.getElementById(sectionId);

        if (!section) {
            console.warn(`Sección ${sectionId} no encontrada para skeleton loader`);
            return;
        }

        // Guardar contenido original si existe
        const originalContent = section.innerHTML;
        const originalDisplay = section.style.display;

        // Crear skeleton container
        const skeletonContainer = document.createElement('div');
        skeletonContainer.className = 'skeleton-container';
        skeletonContainer.style.cssText = `
            display: ${originalDisplay || 'block'};
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Crear filas del skeleton
        for (let i = 0; i < config.rows; i++) {
            const row = document.createElement('div');
            row.className = 'skeleton-row';
            row.style.cssText = `
                height: ${config.height}px;
                background-color: ${config.backgroundColor};
                border-radius: ${config.borderRadius}px;
                margin-bottom: 10px;
                position: relative;
                overflow: hidden;
            `;

            if (config.shimmer) {
                const shimmer = document.createElement('div');
                shimmer.className = 'skeleton-shimmer';
                shimmer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, ${config.shimmerColor}, transparent);
                    animation: shimmer 1.5s infinite;
                `;
                row.appendChild(shimmer);
            }

            skeletonContainer.appendChild(row);
        }

        // Guardar referencia
        this.skeletons.set(sectionId, {
            container: skeletonContainer,
            originalContent,
            originalDisplay,
            config
        });

        // Insertar skeleton
        section.innerHTML = '';
        section.appendChild(skeletonContainer);

        // Animar aparición
        setTimeout(() => {
            skeletonContainer.style.opacity = '1';
        }, 50);

        return skeletonContainer;
    }

    /**
     * Muestra el skeleton loader para una sección
     * @param {string} sectionId - ID de la sección
     */
    show(sectionId) {
        const skeletonData = this.skeletons.get(sectionId);
        if (!skeletonData) {
            console.warn(`No skeleton data found for ${sectionId}`);
            return;
        }

        const section = document.getElementById(sectionId);
        if (!section) return;

        // Asegurar que el skeleton esté visible
        skeletonData.container.style.display = 'block';
        skeletonData.container.style.opacity = '1';
    }

    /**
     * Oculta el skeleton loader y muestra el contenido real
     * @param {string} sectionId - ID de la sección
     * @param {string} content - Contenido HTML a mostrar
     * @param {Function} callback - Callback opcional después de mostrar el contenido
     */
    hide(sectionId, content = null, callback = null) {
        const skeletonData = this.skeletons.get(sectionId);
        if (!skeletonData) {
            console.warn(`No skeleton data found for ${sectionId}`);
            return;
        }

        const section = document.getElementById(sectionId);
        if (!section) return;

        // Animar desvanecimiento del skeleton
        skeletonData.container.style.opacity = '0';

        setTimeout(() => {
            // Restaurar contenido
            if (content) {
                section.innerHTML = content;
            } else {
                section.innerHTML = skeletonData.originalContent;
            }

            // Restaurar display
            section.style.display = skeletonData.originalDisplay;

            // Llamar callback si existe
            if (callback) {
                callback();
            }

            // Eliminar skeleton del DOM
            skeletonData.container.remove();
            this.skeletons.delete(sectionId);

        }, 300);
    }

    /**
     * Actualiza el contenido de una sección sin skeleton
     * @param {string} sectionId - ID de la sección
     * @param {string} content - Nuevo contenido
     */
    updateContent(sectionId, content) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        section.innerHTML = content;
    }

    /**
     * Crea skeleton para tablas
     * @param {string} sectionId - ID de la sección
     * @param {number} rows - Número de filas
     * @param {number} columns - Número de columnas
     */
    createTableSkeleton(sectionId, rows = 5, columns = 6) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const skeletonContainer = document.createElement('div');
        skeletonContainer.className = 'skeleton-table-container';
        skeletonContainer.style.cssText = `
            display: block;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Encabezado de tabla
        const headerRow = document.createElement('div');
        headerRow.className = 'skeleton-table-header';
        headerRow.style.cssText = `
            display: flex;
            background-color: #3d3d3d;
            padding: 15px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 5px;
        `;

        for (let i = 0; i < columns; i++) {
            const headerCell = document.createElement('div');
            headerCell.className = 'skeleton-table-cell';
            headerCell.style.cssText = `
                flex: 1;
                height: 16px;
                background-color: #4a4a4a;
                border-radius: 4px;
                margin-right: 10px;
            `;
            if (i === columns - 1) headerCell.style.marginRight = '0';
            headerRow.appendChild(headerCell);
        }
        skeletonContainer.appendChild(headerRow);

        // Filas de datos
        for (let i = 0; i < rows; i++) {
            const row = document.createElement('div');
            row.className = 'skeleton-table-row';
            row.style.cssText = `
                display: flex;
                background-color: #2d2d2d;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 8px;
            `;

            for (let j = 0; j < columns; j++) {
                const cell = document.createElement('div');
                cell.className = 'skeleton-table-cell';
                cell.style.cssText = `
                    flex: 1;
                    height: 14px;
                    background-color: #3d3d3d;
                    border-radius: 4px;
                    margin-right: 10px;
                `;
                if (j === columns - 1) cell.style.marginRight = '0';
                row.appendChild(cell);
            }
            skeletonContainer.appendChild(row);
        }

        // Guardar referencia
        this.skeletons.set(sectionId, {
            container: skeletonContainer,
            originalContent: section.innerHTML,
            originalDisplay: section.style.display,
            config: { type: 'table', rows, columns }
        });

        // Insertar skeleton
        section.innerHTML = '';
        section.appendChild(skeletonContainer);

        // Animar aparición
        setTimeout(() => {
            skeletonContainer.style.opacity = '1';
        }, 50);
    }

    /**
     * Crea skeleton para tarjetas de métricas
     * @param {string} sectionId - ID de la sección
     * @param {number} cards - Número de tarjetas
     */
    createMetricsSkeleton(sectionId, cards = 3) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const skeletonContainer = document.createElement('div');
        skeletonContainer.className = 'skeleton-metrics-container';
        skeletonContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cards}, 1fr);
            gap: 15px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        for (let i = 0; i < cards; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-metric-card';
            card.style.cssText = `
                background: #2d2d2d;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;

            // Título
            const title = document.createElement('div');
            title.className = 'skeleton-metric-title';
            title.style.cssText = `
                height: 20px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 60%;
            `;
            card.appendChild(title);

            // Valor
            const value = document.createElement('div');
            value.className = 'skeleton-metric-value';
            value.style.cssText = `
                height: 32px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 80%;
            `;
            card.appendChild(value);

            // Subtítulo
            const subtitle = document.createElement('div');
            subtitle.className = 'skeleton-metric-subtitle';
            subtitle.style.cssText = `
                height: 16px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 40%;
            `;
            card.appendChild(subtitle);

            skeletonContainer.appendChild(card);
        }

        // Guardar referencia
        this.skeletons.set(sectionId, {
            container: skeletonContainer,
            originalContent: section.innerHTML,
            originalDisplay: section.style.display,
            config: { type: 'metrics', cards }
        });

        // Insertar skeleton
        section.innerHTML = '';
        section.appendChild(skeletonContainer);

        // Animar aparición
        setTimeout(() => {
            skeletonContainer.style.opacity = '1';
        }, 50);
    }

    /**
     * Crea skeleton para listas de facturas
     * @param {string} sectionId - ID de la sección
     * @param {number} items - Número de items
     */
    createInvoicesSkeleton(sectionId, items = 4) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const skeletonContainer = document.createElement('div');
        skeletonContainer.className = 'skeleton-invoices-container';
        skeletonContainer.style.cssText = `
            display: block;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        for (let i = 0; i < items; i++) {
            const invoiceCard = document.createElement('div');
            invoiceCard.className = 'skeleton-invoice-card';
            invoiceCard.style.cssText = `
                background: #2d2d2d;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            // Información izquierda
            const leftInfo = document.createElement('div');
            leftInfo.className = 'skeleton-invoice-left';
            leftInfo.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;

            const number = document.createElement('div');
            number.className = 'skeleton-invoice-number';
            number.style.cssText = `
                height: 18px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 120px;
            `;
            leftInfo.appendChild(number);

            const date = document.createElement('div');
            date.className = 'skeleton-invoice-date';
            date.style.cssText = `
                height: 14px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 80px;
            `;
            leftInfo.appendChild(date);

            invoiceCard.appendChild(leftInfo);

            // Información derecha
            const rightInfo = document.createElement('div');
            rightInfo.className = 'skeleton-invoice-right';
            rightInfo.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            `;

            const total = document.createElement('div');
            total.className = 'skeleton-invoice-total';
            total.style.cssText = `
                height: 20px;
                background-color: #3d3d3d;
                border-radius: 4px;
                width: 100px;
            `;
            rightInfo.appendChild(total);

            const status = document.createElement('div');
            status.className = 'skeleton-invoice-status';
            status.style.cssText = `
                height: 16px;
                background-color: #3d3d3d;
                border-radius: 12px;
                width: 60px;
            `;
            rightInfo.appendChild(status);

            invoiceCard.appendChild(rightInfo);

            skeletonContainer.appendChild(invoiceCard);
        }

        // Guardar referencia
        this.skeletons.set(sectionId, {
            container: skeletonContainer,
            originalContent: section.innerHTML,
            originalDisplay: section.style.display,
            config: { type: 'invoices', items }
        });

        // Insertar skeleton
        section.innerHTML = '';
        section.appendChild(skeletonContainer);

        // Animar aparición
        setTimeout(() => {
            skeletonContainer.style.opacity = '1';
        }, 50);
    }

    /**
     * Limpia todos los skeleton loaders
     */
    clearAll() {
        this.skeletons.forEach((skeletonData, sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.innerHTML = skeletonData.originalContent;
                section.style.display = skeletonData.originalDisplay;
            }
        });
        this.skeletons.clear();
    }
}

// Instancia global de skeleton loader
const dashboardSkeletons = new SkeletonLoader();

// Insertar estilos CSS para los skeleton loaders
(function() {
    const skeletonStyles = `
    <style>
        /* Animación de shimmer */
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        /* Contenedor de skeleton */
        .skeleton-container {
            display: block;
        }

        .skeleton-row {
            height: 40px;
            background-color: #2d2d2d;
            border-radius: 4px;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
        }

        .skeleton-shimmer {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, #3d3d3d, transparent);
            animation: shimmer 1.5s infinite;
        }

        /* Skeleton para tablas */
        .skeleton-table-container {
            display: block;
        }

        .skeleton-table-header {
            display: flex;
            background-color: #3d3d3d;
            padding: 15px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 5px;
        }

        .skeleton-table-row {
            display: flex;
            background-color: #2d2d2d;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .skeleton-table-cell {
            flex: 1;
            height: 14px;
            background-color: #3d3d3d;
            border-radius: 4px;
            margin-right: 10px;
        }

        .skeleton-table-cell:last-child {
            margin-right: 0;
        }

        /* Skeleton para métricas */
        .skeleton-metrics-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }

        .skeleton-metric-card {
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .skeleton-metric-title {
            height: 20px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 60%;
        }

        .skeleton-metric-value {
            height: 32px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 80%;
        }

        .skeleton-metric-subtitle {
            height: 16px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 40%;
        }

        /* Skeleton para facturas */
        .skeleton-invoices-container {
            display: block;
        }

        .skeleton-invoice-card {
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .skeleton-invoice-left {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .skeleton-invoice-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }

        .skeleton-invoice-number {
            height: 18px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 120px;
        }

        .skeleton-invoice-date {
            height: 14px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 80px;
        }

        .skeleton-invoice-total {
            height: 20px;
            background-color: #3d3d3d;
            border-radius: 4px;
            width: 100px;
        }

        .skeleton-invoice-status {
            height: 16px;
            background-color: #3d3d3d;
            border-radius: 12px;
            width: 60px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .skeleton-metrics-container {
                grid-template-columns: 1fr;
            }
            
            .skeleton-table-row {
                flex-direction: column;
                gap: 10px;
            }
            
            .skeleton-table-cell {
                margin-right: 0;
                margin-bottom: 5px;
            }
        }
    </style>
    `;

    // Insertar estilos en el head solo si no existen
    if (!document.querySelector('#dashboard-skeleton-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'dashboard-skeleton-styles';
        styleElement.innerHTML = skeletonStyles;
        document.head.appendChild(styleElement);
    }
})();

// Exportar para uso global
window.dashboardSkeletons = dashboardSkeletons;