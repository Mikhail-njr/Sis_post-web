    // API_BASE ya está declarado en script.js
    // isLoggedIn y authCredentials también están en script.js
    // El script de diagnóstico ya se carga en dashboard.html

    // Helper function to create modals (eliminates duplicated code)
    function createModal(className, content) {
        const modal = document.createElement('div');
        modal.className = className;
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
        `;
        modal.innerHTML = content;
        document.body.appendChild(modal);
        return modal;
    }

    function formatCurrency(amount) {
        return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
    }

    function formatPaymentMethod(metodoPago, saleData) {
        if (Array.isArray(metodoPago) && metodoPago.length > 0) {
            if (metodoPago[0].metodo) {
                // Pagos detallados con método y monto
                const paymentDetails = metodoPago.map(p => `${p.metodo.toUpperCase()}: ${formatCurrency(p.monto)}`).join(', ');
                const changeText = saleData && saleData.vuelto > 0 ? ` (Vuelto: ${formatCurrency(saleData.vuelto)})` : '';
                return paymentDetails + changeText;
            } else {
                // Solo métodos sin montos
                return metodoPago.join('/');
            }
        } else if (typeof metodoPago === 'string') {
            // Método simple
            const changeText = saleData && saleData.vuelto > 0 ? ` (Vuelto: ${formatCurrency(saleData.vuelto)})` : '';
            return metodoPago.toUpperCase() + changeText;
        }
        return 'No especificado';
    }

    function showAlert(message, type) {
        let alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 2000);
    }

    // Función centralizada para obtener productos
    async function fetchProductsData() {
        // Usar función centralizada para headers de autenticación
        const headers = window.ApiClient.getBasicAuthHeaders();

        const response = await fetch(`${window.ApiClient.API_BASE}/products`, { headers });
        if (response.status === 401) {
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida');
        }
        if (!response.ok) throw new Error('Error al obtener productos');
        return await response.json();
    }

    let globalProductosData = []; // Variable global para almacenar datos de productos
    let productosActuales = {}; // Mapa id -> producto para facilitar búsquedas desde modales/diagnósticos
    let currentSortMode = 1; // 0: Stock asc, 1: Stock desc, 2: ID asc
    let globalSuppliersData = []; // Variable global para almacenar datos de proveedores
    let globalLotesData = []; // Variable global para almacenar datos de lotes
    let currentTopProductsLimit = 10; // Límite actual de productos más vendidos mostrados

    async function fetchAndDisplayData() {
        // Headers agregados automáticamente por auth-integration.js
        
        // Fetch de productos y lotes (cargar lotes primero para asegurar sincronización)
        try {
            // Primero cargar lotes
            const lotesRes = await fetch(`${window.ApiClient.API_BASE}/lotes`, { headers });
            if (lotesRes.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!lotesRes.ok) throw new Error('Network response for lotes was not ok');
            const lotes = await lotesRes.json();
            globalLotesData = lotes; // Almacenar datos globalmente


            // Luego cargar productos
            const productos = await fetchProductsData();
            globalProductosData = productos; // Almacenar datos globalmente
            // Construir mapa de productos por id para accesos rápidos desde otras funciones
            productosActuales = {};
            productos.forEach(p => { if (p && p.id !== undefined) productosActuales[p.id] = p; });

            displayTableData('productos', productos);
            // Aplicar ordenamiento actual después de cargar productos
            applySorting();
        } catch (error) {
            console.error('Error fetching products or lotes:', error);
            const productosSection = document.querySelector('#productos-section');
            if (productosSection) {
                productosSection.innerHTML = '<div class="error">Error al cargar productos. Asegúrate de que el servidor esté activo y que el endpoint /api/products funcione.</div>';
            }
        }

        // Fetch de ventas (por defecto muestra ventas de hoy)
        try {
            // Por defecto, cargar ventas de hoy
            const today = new Date().toISOString().split('T')[0];
            const ventasRes = await fetch(`${window.ApiClient.API_BASE}/sales?date=${today}`, { headers });
            if (ventasRes.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!ventasRes.ok) throw new Error('Network response for sales was not ok');
            const ventas = await ventasRes.json();
            displaySalesGrouped(ventas);
        } catch (error) {
            console.error('Error fetching sales:', error);
            const ventasSection = document.querySelector('#ventas-section');
            if (ventasSection) {
                ventasSection.innerHTML = '<div class="error">Error al cargar ventas. Asegúrate de que el servidor esté activo y que el endpoint /api/sales funcione.</div>';
            }
        }

        // Fetch de clientes
        try {
            await loadClientes();
        } catch (error) {
            console.error('Error fetching clients:', error);
            const clientesSection = document.querySelector('#clientes-section');
            if (clientesSection) {
                const loading = clientesSection.querySelector('.loading');
                if (loading) {
                    loading.textContent = 'Error al cargar clientes. Asegúrate de que el servidor esté activo.';
                }
            }
        }

        // Fetch de promociones
        try {
            await loadPromotions();
        } catch (error) {
            console.error('Error fetching promotions:', error);
            const promocionesSection = document.querySelector('#promociones-section');
            if (promocionesSection) {
                promocionesSection.innerHTML = '<div class="error">Error al cargar promociones. Asegúrate de que el servidor esté activo.</div>';
            }
        }

        // Fetch de métricas (productos más vendidos)
        try {
            await loadTopProducts();
        } catch (error) {
            console.error('Error fetching top products:', error);
            const metricasSection = document.querySelector('#metricas-section');
            if (metricasSection) {
                const loading = metricasSection.querySelector('#top-products-loading');
                if (loading) {
                    loading.textContent = 'Error al cargar métricas. Asegúrate de que el servidor esté activo.';
                }
            }
        }

        // Fetch de pedidos a proveedores
        try {
            await loadSupplierOrders();
        } catch (error) {
            console.error('Error fetching supplier orders:', error);
            const ordersSection = document.querySelector('#pedidos-proveedores-section');
            if (ordersSection) {
                const loading = ordersSection.querySelector('#orders-loading');
                if (loading) {
                    loading.textContent = 'Error al cargar pedidos. Asegúrate de que el servidor esté activo.';
                }
            }
        }

        // Fetch de registro de operaciones
        try {
            await loadOperationsLog();
        } catch (error) {
            console.error('Error fetching operations log:', error);
            const operationsSection = document.querySelector('#operations-log-section');
            if (operationsSection) {
                operationsSection.innerHTML = '<div class="error">Error al cargar registro de operaciones. Asegúrate de que el servidor esté activo.</div>';
            }
        }

        // Fetch de historial de cierres de caja
        try {
            await loadCierres();
        } catch (error) {
            console.error('Error fetching cierres:', error);
            const cierresSection = document.querySelector('#historial-cierres-section');
            if (cierresSection) {
                cierresSection.innerHTML = '<div class="error">Error al cargar historial de cierres. Asegúrate de que el servidor esté activo.</div>';
            }
        }

        // Fetch de proveedores para el dropdown global
        try {
            const suppliersRes = await fetch(`${window.ApiClient.API_BASE}/suppliers`, { headers });
            if (suppliersRes.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!suppliersRes.ok) throw new Error('Network response for suppliers was not ok');
            const suppliers = await suppliersRes.json();
            globalSuppliersData = suppliers; // Almacenar datos globalmente
            console.log('✅ Proveedores cargados globalmente:', suppliers.length);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            // No mostrar error en UI ya que es opcional para el dropdown
        }

        // Los lotes ya se cargaron junto con los productos arriba
    }

    function displayTableData(dataType, data) {
        let container, table, tbody, loading;

        if (dataType === 'productos') {
            container = document.querySelector('#productos-section');
            table = document.querySelector('#productos-table');
            loading = document.querySelector('#productos-section .loading');
        }

        if (!container || !table) {
            console.warn(`Container or table not found for ${dataType}`);
            return;
        }

        tbody = table.querySelector('tbody');
        if (!tbody) {
            console.warn(`Table body not found for ${dataType}`);
            return;
        }

        if (data && data.length > 0) {
            table.style.display = 'table';
            if (loading) loading.style.display = 'none';

            tbody.innerHTML = '';
            data.forEach(item => {
                const row = document.createElement('tr');
                let rowContent = '';

                if (dataType === 'productos') {
                    // Usar la información agregada del backend
                    const cantidadLotes = item.cantidad_lotes || 0;
                    const proximoVencimiento = item.proximo_vencimiento;
                    const estadoVencimiento = item.estado_vencimiento;
                    const diasParaVencer = item.dias_para_vencer;

                    // Mostrar cantidad de lotes
                    const lotesInfo = cantidadLotes > 0 ? cantidadLotes : '-';

                    // Mostrar fecha de vencimiento más próxima con estado
                    let vencimientoInfo = '-';
                    if (proximoVencimiento) {
                        const fechaVencimiento = new Date(proximoVencimiento).toLocaleDateString('es-AR');
                        let estadoClass = 'lote-vigente';
                        let estadoText = '';

                        if (estadoVencimiento === 'tiene_vencidos') {
                            estadoClass = 'lote-vencido';
                            estadoText = ' (Tiene vencidos)';
                        } else if (estadoVencimiento === 'proximo_vencer') {
                            estadoClass = 'lote-proximo-vencer';
                            estadoText = ` (${diasParaVencer} días)`;
                        } else if (estadoVencimiento === 'vigente') {
                            estadoText = ` (${diasParaVencer} días)`;
                        }

                        vencimientoInfo = `<span class="status-badge ${estadoClass}" title="Próximo vencimiento: ${fechaVencimiento}${estadoText}">${fechaVencimiento}</span>`;
                    }

                    rowContent = `
                        <td><input type="checkbox" class="product-checkbox" data-product-id="${item.id}"></td>
                        <td>${item.id}</td>
                        <td>${item.codigo}</td>
                        <td>${item.nombre}</td>
                        <td>${item.categoria || ''}</td>
                        <td>${formatCurrency(item.precio)}</td>
                        <td>${item.stock}</td>
                        <td>${lotesInfo}</td>
                        <td>${vencimientoInfo}</td>
                        <td><button class="edit-button" onclick="editProduct(${item.id})">Editar</button></td>
                    `;
                    row.className = 'product-row';
                    row.setAttribute('data-product-id', item.id);
                }

                row.innerHTML = rowContent;
                tbody.appendChild(row);
            });

            // Sección actualizada correctamente
        } else {
            table.style.display = 'none';
            if (loading) {
                loading.textContent = 'No hay productos registrados.';
                loading.style.display = 'block';
            }

            // Sección sin datos
        }
    }


    // Función para alternar entre modos de ordenamiento
    function toggleSortMode() {
        if (globalProductosData.length === 0) {
            alert('No hay productos para ordenar');
            return;
        }

        // Cambiar al siguiente modo (0 -> 1 -> 2 -> 0...)
        currentSortMode = (currentSortMode + 1) % 3;

        // Aplicar el ordenamiento según el modo actual
        applySorting();
    }

    // Función para aplicar el ordenamiento según el modo actual
    function applySorting() {
        let sortedProductos = [...globalProductosData];

        switch (currentSortMode) {
            case 0: // Stock ascendente (menor a mayor)
                sortedProductos.sort((a, b) => a.stock - b.stock);
                break;
            case 1: // Stock descendente (mayor a menor)
                sortedProductos.sort((a, b) => b.stock - a.stock);
                break;
            case 2: // ID ascendente
                sortedProductos.sort((a, b) => a.id - b.id);
                break;
        }

        // Mostrar los datos ordenados
        displayTableData('productos', sortedProductos);
        // Actualizar el texto del botón
        updateSortButtonText();
    }

    // Función para actualizar el texto del botón según el modo actual
    function updateSortButtonText() {
        const sortBtn = document.getElementById('sortBtn');
        if (!sortBtn) return;

        switch (currentSortMode) {
            case 0:
                sortBtn.textContent = '📊 Stock ↑';
                break;
            case 1:
                sortBtn.textContent = '📊 Stock ↓';
                break;
            case 2:
                sortBtn.textContent = '🆔 ID ↑';
                break;
        }
    }

    // Variables para el estado de edición
    let selectedProductId = null;

    // Función para editar producto
    async function editProduct(productId) {
        console.log('DEBUG: editProduct called with productId:', productId);
        console.log('DEBUG: Stack trace:', new Error().stack);

        try {
            const headers = { 'Content-Type': 'application/json' };
            // Obtener datos del producto
            const response = await fetch(`${window.ApiClient.API_BASE}/products/${productId}`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener producto');

            const product = await response.json();

            // Llenar el formulario con los datos actuales
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editCodigo').value = product.codigo;
            document.getElementById('editNombre').value = product.nombre;
            document.getElementById('editDescripcion').value = product.descripcion || '';
            document.getElementById('editPrecio').value = product.precio;
            document.getElementById('editStock').value = product.stock;
            document.getElementById('editCategoria').value = product.categoria || '';
            document.getElementById('editBarcode').value = product.codigo_barras || '';

            // Mostrar el modal
            console.log('DEBUG: About to show editModal');
            document.getElementById('editModal').classList.add('show');
            console.log('DEBUG: editModal shown successfully');

        } catch (error) {
            console.error('Error al cargar producto para editar:', error);
            alert('Error al cargar el producto para editar');
        }
    }

    // Función para cerrar el modal de edición
    function closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        document.getElementById('editProductForm').reset();
        selectedProductId = null;
    }

    // Función para guardar cambios del producto
    async function saveProductChanges(event) {
        event.preventDefault();

        const productId = document.getElementById('editProductId').value;
        const formData = {
            codigo: document.getElementById('editCodigo').value.trim(),
            nombre: document.getElementById('editNombre').value.trim(),
            descripcion: document.getElementById('editDescripcion').value.trim(),
            precio: parseFloat(document.getElementById('editPrecio').value),
            stock: parseInt(document.getElementById('editStock').value),
            categoria: document.getElementById('editCategoria').value.trim(),
            codigo_barras: document.getElementById('editBarcode').value.trim()
        };

        // Validaciones básicas
        if (!formData.codigo || !formData.nombre || isNaN(formData.precio) || isNaN(formData.stock)) {
            alert('Por favor complete todos los campos requeridos correctamente');
            return;
        }

        if (formData.precio < 0 || formData.stock < 0) {
            alert('El precio y stock no pueden ser negativos');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            const response = await fetch(`${window.ApiClient.API_BASE}/products/${productId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar producto');
            }

            const result = await response.json();

            // Cerrar modal
            closeEditModal();

            // Mostrar mensaje de éxito
            alert('Producto actualizado exitosamente');

            // Recargar los datos
            await fetchAndDisplayData();

        } catch (error) {
            console.error('Error al guardar cambios:', error);
            alert('Error al guardar cambios: ' + error.message);
        }
    }

    // Función para abrir modal de agregar producto
    function openAddProductModal() {
        document.getElementById('addProductForm').reset();
        document.getElementById('addModal').classList.add('show');
    }

    // Función para generar código de producto automáticamente
    async function generateProductCode() {
        const categoriaInput = document.getElementById('addCategoria');
        const codigoInput = document.getElementById('addCodigo');
        const categoria = categoriaInput.value.trim();

        if (!categoria) {
            codigoInput.value = '';
            return;
        }

        // Extraer código de categoría (primera parte antes del guion)
        const categoriaCode = categoria.split(' - ')[0] || categoria.split(' ')[0] || 'PROD';

        try {
            // Obtener todos los productos para verificar códigos existentes
            const products = await fetchProductsData();

            // Encontrar el último número usado para esta categoría
            let maxNumber = 0;
            products.forEach(product => {
                if (product.codigo && product.codigo.startsWith(categoriaCode + '-')) {
                    const numberPart = product.codigo.split('-')[1];
                    const number = parseInt(numberPart, 10);
                    if (!isNaN(number) && number > maxNumber) {
                        maxNumber = number;
                    }
                }
            });

            // Generar el siguiente número
            const nextNumber = maxNumber + 1;
            const generatedCode = `${categoriaCode}-${String(nextNumber).padStart(3, '0')}`;

            // Verificar que el código no esté ocupado (doble verificación)
            const codeExists = products.some(product => product.codigo === generatedCode);
            if (codeExists) {
                // Si existe, incrementar hasta encontrar uno libre
                let counter = nextNumber + 1;
                let uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
                while (products.some(product => product.codigo === uniqueCode)) {
                    counter++;
                    uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
                }
                codigoInput.value = uniqueCode;
            } else {
                codigoInput.value = generatedCode;
            }

            // Verificar disponibilidad del código generado
            checkCodeAvailability();

        } catch (error) {
            console.error('Error generando código:', error);
            // Fallback: generar código básico
            const timestamp = Date.now().toString().slice(-4);
            codigoInput.value = `${categoriaCode}-${timestamp}`;
            checkCodeAvailability();
        }
    }

    // Función para verificar disponibilidad del código
    async function checkCodeAvailability() {
        const codigoInput = document.getElementById('addCodigo');
        const availabilityDiv = document.getElementById('codeAvailability');
        const code = codigoInput.value.trim();

        if (!code) {
            availabilityDiv.textContent = '';
            return;
        }

        try {
            const products = await fetchProductsData();
            const codeExists = products.some(product => product.codigo === code);

            if (codeExists) {
                availabilityDiv.textContent = '❌ Código ya existe - será reemplazado automáticamente';
                availabilityDiv.style.color = '#e74c3c';
                // Generar un nuevo código disponible
                generateUniqueCode();
            } else {
                availabilityDiv.textContent = '✅ Código disponible';
                availabilityDiv.style.color = '#27ae60';
            }

        } catch (error) {
            console.error('Error verificando código:', error);
            availabilityDiv.textContent = '⚠️ Error al verificar código';
            availabilityDiv.style.color = '#f39c12';
        }
    }

    // Función auxiliar para generar código único cuando hay conflicto
    async function generateUniqueCode() {
        const categoriaInput = document.getElementById('addCategoria');
        const codigoInput = document.getElementById('addCodigo');
        const categoria = categoriaInput.value.trim();

        if (!categoria) return;

        const categoriaCode = categoria.split(' - ')[0] || categoria.split(' ')[0] || 'PROD';

        try {
            const headers = { 'Content-Type': 'application/json' };
            const response = await fetch(`${window.ApiClient.API_BASE}/products`, { headers });
            if (!response.ok) return;

            const products = await response.json();

            // Encontrar el último número usado para esta categoría
            let maxNumber = 0;
            products.forEach(product => {
                if (product.codigo && product.codigo.startsWith(categoriaCode + '-')) {
                    const numberPart = product.codigo.split('-')[1];
                    const number = parseInt(numberPart, 10);
                    if (!isNaN(number) && number > maxNumber) {
                        maxNumber = number;
                    }
                }
            });

            // Generar códigos hasta encontrar uno libre
            let counter = maxNumber + 1;
            let uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
            while (products.some(product => product.codigo === uniqueCode)) {
                counter++;
                uniqueCode = `${categoriaCode}-${String(counter).padStart(3, '0')}`;
            }

            codigoInput.value = uniqueCode;
            checkCodeAvailability();

        } catch (error) {
            console.error('Error generando código único:', error);
        }
    }

    // Función para cerrar modal de agregar producto
    function closeAddModal() {
        document.getElementById('addModal').classList.remove('show');
        document.getElementById('addProductForm').reset();
    }

    // Función para crear nuevo producto
    async function createProduct(event) {
        event.preventDefault();

        const formData = {
            codigo: document.getElementById('addCodigo').value.trim(),
            nombre: document.getElementById('addNombre').value.trim(),
            descripcion: document.getElementById('addDescripcion').value.trim(),
            precio: parseFloat(document.getElementById('addPrecio').value),
            stock: parseInt(document.getElementById('addStock').value),
            categoria: document.getElementById('addCategoria').value.trim(),
            codigo_barras: document.getElementById('addBarcode').value.trim()
        };

        // Validaciones básicas
        if (!formData.codigo || !formData.nombre || isNaN(formData.precio) || isNaN(formData.stock)) {
            alert('Por favor complete todos los campos requeridos correctamente');
            return;
        }

        if (formData.precio < 0 || formData.stock < 0) {
            alert('El precio y stock no pueden ser negativos');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            const response = await fetch(`${window.ApiClient.API_BASE}/products`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear producto');
            }

            const result = await response.json();

            // Cerrar modal
            closeAddModal();

            // Mostrar mensaje de éxito
            alert('Producto creado exitosamente');

            // Recargar los datos
            await fetchAndDisplayData();

        } catch (error) {
            console.error('Error al crear producto:', error);
            alert('Error al crear producto: ' + error.message);
        }
    }

    // Event listeners para el formulario de edición
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', saveProductChanges);
    }

    // Event listeners para el formulario de agregar proveedor
    const addSupplierForm = document.getElementById('addSupplierForm');
    if (addSupplierForm) {
        addSupplierForm.addEventListener('submit', createSupplier);
    }

    // Event listeners para el formulario de crear promoción
    const createPromotionForm = document.getElementById('createPromotionForm');
    if (createPromotionForm) {
        createPromotionForm.addEventListener('submit', createPromotion);
    }

    // Cerrar modales al hacer clic fuera
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }

    const addModal = document.getElementById('addModal');
    if (addModal) {
        addModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAddModal();
            }
        });
    }

    // Event listeners para secciones colapsables
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', function() {
            const section = this.closest('.dashboard-section');
            section.classList.toggle('collapsed');
            const icon = this.querySelector('.section-icon');
            if (section.classList.contains('collapsed')) {
                icon.textContent = '▶';
            } else {
                icon.textContent = '▼';
                // Forzar display de tabla cuando se expande la sección de productos
                if (section.id === 'productos-section' && typeof globalProductosData !== 'undefined' && globalProductosData.length > 0) {
                    displayTableData('productos', globalProductosData);
                }
                // Cargar clientes cuando se expande la sección de clientes
                if (section.id === 'clientes-section') {
                    loadClientes();
                }
                // Cargar proveedores cuando se expande la sección de proveedores
                if (section.id === 'proveedores-section') {
                    fetchSuppliers();
                }
            }
        });
    });

    // Event listeners para modal de opciones de reporte
    const reportOptionsModal = document.getElementById('reportOptionsModal');
    if (reportOptionsModal) {
        reportOptionsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeReportOptionsModal();
            }
        });
    }

    // Event listeners para modal de soporte
    const supportModal = document.getElementById('supportModal');
    if (supportModal) {
        supportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeSupportModal();
            }
        });
    }


    // Variables para promociones
    let selectedPromotionProducts = [];
    let allProducts = [];

    // Función para cargar promociones
    async function loadPromotions() {
        const headers = { 'Content-Type': 'application/json' };
        

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/promotions`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al cargar promociones');

            const promotions = await response.json();
            displayPromotions(promotions);
        } catch (error) {
            console.error('Error loading promotions:', error);
            const section = document.querySelector('#promociones-section');
            if (section) {
                section.innerHTML = '<div class="error">Error al cargar promociones. Asegúrate de que el servidor esté activo.</div>';
            }
        }
    }

    // Función para mostrar promociones
    function displayPromotions(promotions) {
        const container = document.querySelector('#promociones-container');
        const loading = document.querySelector('#promociones-section .loading');

        if (promotions && promotions.length > 0) {
            container.style.display = 'block';
            if (loading) loading.style.display = 'none';

            container.innerHTML = promotions.map(promotion => `
                <div class="promotion-card collapsed" style="border: 1px solid #030303; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #3d3d3d;">
                    <div class="promotion-header" style="border-bottom: 2px solid rgb(238, 238, 238); padding-bottom: 10px; margin-bottom: 15px; position: relative;">
                        <span class="collapse-icon" onclick="togglePromotion(this)" title="Expandir/Contraer" style="cursor: pointer; font-size: 18px; color: #cccccc;">▶</span>
                        <h3 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: black; font-weight: bold;">${promotion.titulo}</h3>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                           <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;"><strong style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Fecha:</strong> ${new Date(promotion.created_at).toLocaleString('es-AR')}</span>
                           <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;"><strong style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Pago:</strong> ${formatPaymentMethod(promotion.metodo_pago, promotion)}</span>
                           <span style="color: #000000; font-weight: bold;">Total: ${formatCurrency(promotion.total)}</span>
                        </div>
                    </div>

                    <div class="promotion-details" style="display: none; padding: 15px; border-top: 1px solid #555; background: #2d2d2d;">
                        <div class="promotion-loading">Cargando productos...</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.style.display = 'none';
            if (loading) {
                loading.textContent = 'No hay promociones registradas.';
                loading.style.display = 'block';
            }
        }
    }

    // Función para abrir modal de crear promoción
    function openCreatePromotionModal() {
        selectedPromotionProducts = [];
        document.getElementById('promotionTitle').value = '';
        document.getElementById('productSearch').value = '';
        document.getElementById('productSearchResults').style.display = 'none';
        updateSelectedProductsDisplay();
        document.getElementById('createPromotionModal').classList.add('show');

        // Cargar productos para búsqueda
        loadProductsForPromotion();
    }

    // Función para cerrar modal de crear promoción
    function closeCreatePromotionModal() {
        document.getElementById('createPromotionModal').classList.remove('show');
        selectedPromotionProducts = [];
    }

    // Función para cargar productos para promoción
    async function loadProductsForPromotion() {
        const headers = { 'Content-Type': 'application/json' };
        

        try {
            allProducts = await fetchProductsData();
        } catch (error) {
            console.error('Error loading products for promotion:', error);
            alert('Error al cargar productos para la promoción');
        }
    }

    // Función para remover acentos
    function removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Función para normalizar texto para búsqueda (minúsculas sin acentos)
    function normalizeText(text) {
        return removeAccents(text.toLowerCase());
    }

    // Función para buscar productos
    function searchProducts() {
        const query = document.getElementById('productSearch').value.trim();
        const resultsDiv = document.getElementById('productSearchResults');

        if (query.length < 2) {
            resultsDiv.style.display = 'none';
            return;
        }

        const normalizedQuery = normalizeText(query);
        const filteredProducts = allProducts.filter(product =>
            normalizeText(product.nombre).includes(normalizedQuery) ||
            normalizeText(product.codigo).includes(normalizedQuery)
        );

        if (filteredProducts.length > 0) {
            resultsDiv.innerHTML = filteredProducts.map(product => `
                <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="addProductToPromotion(${product.id})">
                    <strong>${product.nombre}</strong> (${product.codigo}) - $${product.precio}
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = '<div style="padding: 8px; color: #666;">No se encontraron productos</div>';
            resultsDiv.style.display = 'block';
        }
    }

    // Función para agregar producto a la promoción
    function addProductToPromotion(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        // Verificar si ya está seleccionado
        if (selectedPromotionProducts.find(p => p.id === productId)) {
            alert('Este producto ya está seleccionado');
            return;
        }

        selectedPromotionProducts.push({
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            descuento_porcentaje: 0
        });

        updateSelectedProductsDisplay();
        document.getElementById('productSearch').value = '';
        document.getElementById('productSearchResults').style.display = 'none';
    }

    // Función para actualizar la visualización de productos seleccionados
    function updateSelectedProductsDisplay() {
        const container = document.getElementById('selectedProducts');

        if (selectedPromotionProducts.length === 0) {
            container.innerHTML = '<p style="color: #666; margin: 0;">No hay productos seleccionados</p>';
            return;
        }

        container.innerHTML = selectedPromotionProducts.map(product => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #030303; border-radius: 4px; margin-bottom: 8px; background: white;">
                <div>
                    <strong style="color: black;">${product.nombre}</strong><br>
                    <small style="color: black;">Precio: $${product.precio}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div>
                        <label style="font-size: 12px; color: black;">Descuento %:</label><br>
                        <input type="number" min="0" max="100" value="${product.descuento_porcentaje}"
                               onchange="updateProductDiscount(${product.id}, this.value)"
                               style="width: 60px; padding: 4px; border: 1px solid #030303; border-radius: 4px;">
                    </div>
                    <button type="button" onclick="removeProductFromPromotion(${product.id})"
                            style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            </div>
        `).join('');
    }

    // Función para actualizar descuento de producto
    function updateProductDiscount(productId, discount) {
        const product = selectedPromotionProducts.find(p => p.id === productId);
        if (product) {
            product.descuento_porcentaje = parseFloat(discount) || 0;
        }
    }

    // Función para remover producto de la promoción
    function removeProductFromPromotion(productId) {
        selectedPromotionProducts = selectedPromotionProducts.filter(p => p.id !== productId);
        updateSelectedProductsDisplay();
    }

    // Función para crear promoción
    async function createPromotion(event) {
        event.preventDefault();

        const title = document.getElementById('promotionTitle').value.trim();
        if (!title) {
            alert('Por favor ingresa un título para la promoción');
            return;
        }

        if (selectedPromotionProducts.length === 0) {
            alert('Por favor selecciona al menos un producto');
            return;
        }

        // Verificar que todos los productos tengan descuento válido
        const invalidProducts = selectedPromotionProducts.filter(p => p.descuento_porcentaje <= 0 || p.descuento_porcentaje > 100);
        if (invalidProducts.length > 0) {
            alert('Todos los productos deben tener un descuento válido (1-100%)');
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        

        const promotionData = {
            titulo: title,
            items: selectedPromotionProducts.map(p => ({
                producto_id: p.id,
                descuento_porcentaje: p.descuento_porcentaje
            }))
        };

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/promotions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(promotionData)
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Si es error de límite de promociones, ofrecer activar licencia
                if (errorData.requiresLicense && errorData.activateUrl) {
                    const activate = confirm(errorData.message + '\n\n' + errorData.suggestion + '\n\n¿Deseas activar una licencia ahora?');
                    if (activate) {
                        window.open(errorData.activateUrl, '_blank');
                    }
                    return;
                }

                throw new Error(errorData.error || 'Error al crear promoción');
            }

            const result = await response.json();
            alert('Promoción creada exitosamente');
            closeCreatePromotionModal();
            loadPromotions(); // Recargar la lista

        } catch (error) {
            console.error('Error creating promotion:', error);
            alert('Error al crear promoción: ' + error.message);
        }
    }

    // Función para expandir/contraer promoción
    async function togglePromotion(headerElement) {
        const card = headerElement.closest('.promotion-card');
        const details = card.querySelector('.promotion-details');
        const icon = headerElement.querySelector('.collapse-icon');
        const promotionId = card.querySelector('.edit-button').getAttribute('onclick').match(/deletePromotion\((\d+)\)/)[1];

        card.classList.toggle('collapsed');

        if (card.classList.contains('collapsed')) {
            details.style.display = 'none';
            icon.textContent = '▶';
        } else {
            details.style.display = 'block';
            icon.textContent = '▼';
            // Cargar productos de la promoción
            await loadPromotionProducts(promotionId, details);
        }
    }

    // Función para cargar productos de una promoción
    async function loadPromotionProducts(promotionId, detailsContainer) {
        const loading = detailsContainer.querySelector('.promotion-loading');
        loading.style.display = 'block';

        const headers = { 'Content-Type': 'application/json' };
        

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/promotions/${promotionId}`, { headers });
            if (!response.ok) throw new Error('Error al cargar productos de la promoción');

            const promotion = await response.json();

            loading.style.display = 'none';

            if (promotion.items && promotion.items.length > 0) {
                detailsContainer.innerHTML = `
                    <h5 style="margin-bottom: 15px; color: #ffff;">Productos en Promoción:</h5>
                    <div class="promotion-products">
                        ${promotion.items.map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #030303; border-radius: 6px; margin-bottom: 8px; background: white;">
                                <div>
                                    <strong>${item.producto_nombre}</strong><br>
                                    <small style="color: #fff;">Precio original: $${item.precio_original}</small>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div>
                                        <label style="font-size: 12px; display: block;">Descuento %:</label>
                                        <input type="number" min="0" max="100" value="${item.descuento_porcentaje}"
                                               onchange="updatePromotionItemDiscount(${promotionId}, ${item.id}, this.value)"
                                               style="width: 60px; padding: 4px; border: 1px solid #030303; border-radius: 4px;">
                                    </div>
                                    <button type="button" onclick="removeProductFromPromotion(${promotionId}, ${item.id})"
                                            style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 15px; text-align: right;">
                        <button onclick="savePromotionChanges(${promotionId})" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Guardar Cambios</button>
                    </div>
                `;
            } else {
                detailsContainer.innerHTML = '<p style="color: #666; margin: 0;">Esta promoción no tiene productos.</p>';
            }

        } catch (error) {
            console.error('Error loading promotion products:', error);
            loading.textContent = 'Error al cargar productos';
        }
    }

    // Función para actualizar descuento de un item en promoción
    function updatePromotionItemDiscount(promotionId, itemId, newDiscount) {
        // Esta función se puede implementar si queremos actualizar en tiempo real
        // Por ahora, los cambios se guardan cuando se hace clic en "Guardar Cambios"
        console.log(`Update discount for promotion ${promotionId}, item ${itemId} to ${newDiscount}%`);
    }

    // Función para remover producto de promoción
    async function removeProductFromPromotion(promotionId, productId) {
        if (!confirm('¿Estás seguro de que quieres remover este producto de la promoción?')) {
            return;
        }

        // Por simplicidad, recrearemos la promoción sin este producto
        // En una implementación más avanzada, podríamos tener un endpoint específico
        try {
            // Obtener la promoción actual
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/promotions/${promotionId}`, { headers });
            if (!response.ok) throw new Error('Error al obtener promoción');

            const promotion = await response.json();

            // Filtrar el producto a remover
            const updatedItems = promotion.items.filter(item => item.id != productId);

            // Si no quedan productos, eliminar la promoción
            if (updatedItems.length === 0) {
                await deletePromotion(promotionId);
                return;
            }

            // Recrear la promoción con los productos restantes
            await deletePromotion(promotionId);

            // Crear nueva promoción
            const createResponse = await fetch(`${window.ApiClient.API_BASE}/promotions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    titulo: promotion.titulo,
                    items: updatedItems.map(item => ({
                        producto_id: item.producto_id,
                        descuento_porcentaje: item.descuento_porcentaje
                    }))
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.error || 'Error al actualizar promoción');
            }

            alert('Producto removido de la promoción');
            loadPromotions(); // Recargar la lista

        } catch (error) {
            console.error('Error removing product from promotion:', error);
            alert('Error al remover producto: ' + error.message);
        }
    }

    // Función para guardar cambios en promoción
    async function savePromotionChanges(promotionId) {
        // Esta función guardaría los cambios realizados en los descuentos
        // Por ahora, simplemente recargamos las promociones
        alert('Cambios guardados (funcionalidad básica implementada)');
        loadPromotions();
    }

    // Función para mostrar opciones de reset
    function showResetOptionsModal() {
        // Mostrar modal de opciones de reset (autenticación se verifica al ejecutar el reset)
        document.getElementById('resetModal').classList.add('show');
    }

    // Función para ejecutar el reset selectivo
    async function performSelectiveReset() {
        // Verificar autenticación antes de proceder
        if (!isLoggedIn) {
            const username = prompt('Usuario:');
            const password = prompt('Contraseña:');
            if (username && password) {
                authCredentials = { username, password };
                isLoggedIn = true;
                sessionStorage.setItem('authCredentials', JSON.stringify(authCredentials));
                updateUIBasedOnAuth();
            } else {
                alert('Credenciales requeridas para resetear datos');
                return;
            }
        }

        // Obtener opciones seleccionadas
        const resetVentas = document.getElementById('resetVentas').checked;
        const resetCierres = document.getElementById('resetCierres').checked;
        const resetProveedores = document.getElementById('resetProveedores').checked;
        const resetPromociones = document.getElementById('resetPromociones').checked;
        const resetLog = document.getElementById('resetLog').checked;
        const resetMetricas = document.getElementById('resetMetricas').checked;

        // Verificar que al menos una opción esté seleccionada
        if (!resetVentas && !resetCierres && !resetProveedores && !resetPromociones && !resetLog) {
            alert('Debe seleccionar al menos una opción para resetear');
            return;
        }

        // Confirmación final
        const confirmMessage = '¿Está seguro de que desea resetear los datos seleccionados? Esta acción no se puede deshacer.';
        if (!confirm(confirmMessage)) {
            return;
        }

        // Cerrar modal
        closeResetOptionsModal();

        // Headers para autenticación
        const headers = { 'Content-Type': 'application/json' };
        

        try {
            showAlert('Reseteando datos...', 'success');

            // Enviar opciones de reset al servidor
            const response = await fetch(`${window.ApiClient.API_BASE}/reset-data-selective`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    resetVentas,
                    resetCierres,
                    resetProveedores,
                    resetPromociones,
                    resetLog
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al resetear datos');
            }

            const result = await response.json();
            showAlert(result.message || 'Datos reseteados exitosamente', 'success');

            // Recargar datos para actualizar la interfaz
            fetchAndDisplayData();

        } catch (error) {
            console.error('Error reseteando datos:', error);
            showAlert('Error al resetear datos: ' + error.message, 'error');
        }
    }

    // Función para crear backup de datos
    async function createBackup() {
        // Pedir credenciales primero
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para crear backup');
            return;
        }

        if (!confirm('¿Desea crear una copia de respaldo de todos los datos del sistema? Esto incluirá productos, ventas, proveedores, promociones y cierres de caja.')) {
            return;
        }

        showAlert('Creando copia de respaldo...', 'success');

        try {
            const headers = { 'Content-Type': 'application/json' };
            headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

            // Recolectar todos los datos importantes
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {}
            };

            // Productos
            try {
                const productsRes = await fetch(`${window.ApiClient.API_BASE}/products`, { headers });
                if (productsRes.ok) {
                    backupData.data.products = await productsRes.json();
                }
            } catch (e) {
                console.warn('Error backing up products:', e);
                backupData.data.products = [];
            }

            // Ventas
            try {
                const salesRes = await fetch(`${window.ApiClient.API_BASE}/sales`, { headers });
                if (salesRes.ok) {
                    backupData.data.sales = await salesRes.json();
                }
            } catch (e) {
                console.warn('Error backing up sales:', e);
                backupData.data.sales = [];
            }

            // Proveedores
            try {
                const suppliersRes = await fetch(`${window.ApiClient.API_BASE}/suppliers`, { headers });
                if (suppliersRes.ok) {
                    backupData.data.suppliers = await suppliersRes.json();
                }
            } catch (e) {
                console.warn('Error backing up suppliers:', e);
                backupData.data.suppliers = [];
            }

            // Promociones
            try {
                const promotionsRes = await fetch(`${window.ApiClient.API_BASE}/promotions`, { headers });
                if (promotionsRes.ok) {
                    const promotions = await promotionsRes.json();
                    // Obtener detalles completos de cada promoción
                    backupData.data.promotions = [];
                    for (const promo of promotions) {
                        try {
                            const detailRes = await fetch(`${window.ApiClient.API_BASE}/promotions/${promo.id}`, { headers });
                            if (detailRes.ok) {
                                const detail = await detailRes.json();
                                backupData.data.promotions.push(detail);
                            } else {
                                backupData.data.promotions.push(promo);
                            }
                        } catch (e) {
                            backupData.data.promotions.push(promo);
                        }
                    }
                }
            } catch (e) {
                console.warn('Error backing up promotions:', e);
                backupData.data.promotions = [];
            }

            // Cierres de caja
            try {
                const cierresRes = await fetch(`${window.ApiClient.API_BASE}/cierres`, { headers });
                if (cierresRes.ok) {
                    backupData.data.cierres_caja = await cierresRes.json();
                }
            } catch (e) {
                console.warn('Error backing up cierres:', e);
                backupData.data.cierres_caja = [];
            }

            // Registro de operaciones
            try {
                const operationsRes = await fetch(`${window.ApiClient.API_BASE}/operations-log?limit=10000`, { headers });
                if (operationsRes.ok) {
                    backupData.data.operations_log = await operationsRes.json();
                }
            } catch (e) {
                console.warn('Error backing up operations log:', e);
                backupData.data.operations_log = [];
            }

            // Estadísticas generales
            try {
                const statsRes = await fetch(`${window.ApiClient.API_BASE}/stats`, { headers });
                if (statsRes.ok) {
                    backupData.data.stats = await statsRes.json();
                }
            } catch (e) {
                console.warn('Error backing up stats:', e);
                backupData.data.stats = {};
            }

            // Crear archivo JSON y descargarlo
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `backup_pos_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showAlert('✅ Copia de respaldo creada exitosamente', 'success');

        } catch (error) {
            console.error('Error creating backup:', error);
            showAlert('❌ Error al crear la copia de respaldo: ' + error.message, 'error');
        }
    }

    // Función para restaurar backup desde archivo JSON
    async function restoreBackup(fileInput) {
        const file = fileInput.files[0];
        if (!file) {
            return;
        }

        // Pedir credenciales primero
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para restaurar backup');
            fileInput.value = '';
            return;
        }

        if (!confirm('⚠️ ¿Está seguro de que desea restaurar el backup? Esta acción reemplazará todos los datos actuales del sistema.')) {
            fileInput.value = '';
            return;
        }

        showAlert('🔄 Restaurando backup...', 'success');

        try {
            const fileContent = await file.text();
            const backupData = JSON.parse(fileContent);

            // Validar estructura del backup
            if (!backupData.data || !backupData.timestamp || !backupData.version) {
                throw new Error('El archivo de backup no tiene la estructura correcta');
            }

            const headers = { 'Content-Type': 'application/json' };
            headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

            const response = await fetch(`${window.ApiClient.API_BASE}/restore-backup`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(backupData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al restaurar el backup');
            }

            const result = await response.json();
            showAlert('✅ Backup restaurado exitosamente', 'success');

            // Limpiar input file
            fileInput.value = '';

            // Recargar datos para actualizar la interfaz
            fetchAndDisplayData();

        } catch (error) {
            console.error('Error restoring backup:', error);
            showAlert('❌ Error al restaurar el backup: ' + error.message, 'error');
            fileInput.value = '';
        }
    }

    // Función para regresar al POS
    function returnToPOS() {
        // Establecer una bandera en sessionStorage para indicar que se debe refrescar
        sessionStorage.setItem('refreshPOSData', 'true');
        // Redirigir a index.html
        window.location.href = 'index.html';
    }

    // Función para limpiar promociones duplicadas
    async function cleanDuplicatePromotions() {
        // Pedir credenciales primero
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para limpiar promociones duplicadas');
            return;
        }

        if (!confirm('¿Estás seguro de que quieres limpiar productos duplicados en promociones?\n\nEsto removerá productos que están en múltiples promociones, manteniendo solo la promoción más antigua para cada producto.')) {
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

        try {
            showAlert('🧹 Limpiando promociones duplicadas...', 'success');

            const response = await fetch(`${window.ApiClient.API_BASE}/clean-duplicate-promotions`, {
                method: 'POST',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al limpiar promociones duplicadas');
            }

            const result = await response.json();

            if (result.success) {
                showAlert(`✅ ${result.message}`, 'success');
                if (result.details && result.details.length > 0) {
                    console.log('Detalles de limpieza:', result.details);
                    alert(`Detalles de la limpieza:\n\n${result.details.map(d => `• ${d.producto}: mantenido en "${d.mantenido_en}"`).join('\n')}`);
                }
                loadPromotions(); // Recargar la lista de promociones
            } else {
                throw new Error(result.message || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error cleaning duplicate promotions:', error);
            showAlert('❌ Error al limpiar promociones duplicadas: ' + error.message, 'error');
        }
    }

    // Función para eliminar promoción
    async function deletePromotion(promotionId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/promotions/${promotionId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar promoción');
            }

            alert('Promoción eliminada exitosamente');
            loadPromotions(); // Recargar la lista

        } catch (error) {
            console.error('Error deleting promotion:', error);
            alert('Error al eliminar promoción: ' + error.message);
        }
    }

    /**
     * Función para manejar el clic en el botón de cierre de caja
     * Esta función actúa como respaldo al event listener
     */
    function handleCloseRegisterClick() {
        console.log('🎯 Clic directo en botón closeRegisterBtn detectado');

        // Verificar si la función del modal existe
        if (typeof window.openCierreModal === 'function') {
            console.log('🚀 Ejecutando window.openCierreModal()');
            try {
                window.openCierreModal();
                console.log('✅ Modal de cierre abierto exitosamente');
            } catch (error) {
                console.error('❌ Error al abrir modal:', error);
                alert('Error al abrir modal de cierre: ' + error.message);
            }
        } else {
            console.error('❌ Función window.openCierreModal no disponible');
            console.log('Funciones disponibles:', Object.keys(window).filter(key => key.toLowerCase().includes('cierre') || key.toLowerCase().includes('modal')));

            // Intentar abrir el modal directamente si existe
            const modal = document.getElementById('cierreModal');
            if (modal) {
                console.log('🔧 Intentando abrir modal directamente');
                modal.classList.add('show');
                // Resetear el modal
                if (typeof resetCierreModal === 'function') {
                    resetCierreModal();
                }
            } else {
                alert('Error: Modal de cierre de caja no encontrado. Verifica que cierre-caja-functions.js esté cargado correctamente.');
            }
        }
    }

    // >>> FUNCIONES PARA CIERRES DE CAJA

    // Función para cargar clientes
    async function loadClientes() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/customers`, { headers });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener clientes');

            const response_data = await response.json();
            
            // El endpoint devuelve { success: true, data: rows, count: rows.length }
            // Compatibilidad: buscar en 'clientes', 'data', o directamente en el array
            let clientes = [];
            if (response_data.clientes) {
                clientes = response_data.clientes;
            } else if (response_data.data && Array.isArray(response_data.data)) {
                clientes = response_data.data;
            } else if (Array.isArray(response_data)) {
                clientes = response_data;
            } else {
                console.error('Formato de respuesta inesperado:', response_data);
                clientes = [];
            }
            
            displayClientesTable(clientes);

        } catch (error) {
            const table = document.getElementById('clientes-table');
            const loading = document.querySelector('#clientes-section .loading');
            if (table) {
                table.style.display = 'none';
            }
            if (loading) {
                loading.textContent = 'Error al cargar clientes: ' + error.message;
                loading.style.display = 'block';
            }
        }
    }

    // Función mejorada para actualizar precios de deudas con indicador de carga
    async function updateDebtsPrices() {
        // Confirmación previa
        const confirmMessage = '¿Está seguro de que desea actualizar los precios de todas las deudas pendientes?\n\nEsta operación sincronizará los precios de las deudas con los precios actuales de los productos.';
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Mostrar indicador de carga con animación
            showLoadingIndicator('Actualizando precios de deudas...', '🔄');

            const headers = { 'Content-Type': 'application/json' };
            

            // Realizar la solicitud con timeout extendido
            const response = await fetch(`${window.ApiClient.API_BASE}/debts/update-prices`, {
                method: 'POST',
                headers: headers
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al actualizar precios de deudas');

            const result = await response.json();

            // Ocultar indicador y mostrar resultados
            hideLoadingIndicator();
            showDebtsUpdateSummary(result);

            // Recargar clientes para mostrar cambios
            loadClientes();

        } catch (error) {
            hideLoadingIndicator();
            showDebtsUpdateError(error.message);
        }
    }

    // Función para mostrar indicador de carga
    function showLoadingIndicator(message = 'Procesando...', icon = '⏳') {
        // Crear overlay de carga
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(2px);
        `;

        // Crear contenedor del indicador
        const loaderContainer = document.createElement('div');
        loaderContainer.style.cssText = `
            background: #2d2d2d;
            padding: 30px 40px;
            border-radius: 12px;
            border: 2px solid #17a2b8;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            min-width: 300px;
            animation: pulse 1.5s infinite;
        `;

        // Icono animado
        const iconElement = document.createElement('div');
        iconElement.style.cssText = `
            font-size: 48px;
            margin-bottom: 15px;
            animation: spin 2s linear infinite;
        `;
        iconElement.textContent = icon;

        // Texto de mensaje
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            font-size: 16px;
            color: #ffffff;
            font-weight: bold;
            margin-bottom: 10px;
        `;
        messageElement.textContent = message;

        // Barra de progreso
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 200px;
            height: 8px;
            background: #3d3d3d;
            border-radius: 4px;
            margin: 15px auto;
            overflow: hidden;
            border: 1px solid #555;
        `;

        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #17a2b8, #28a745);
            animation: progress 2s ease-in-out infinite;
        `;

        progressBar.appendChild(progressFill);

        // Mensaje de estado
        const statusElement = document.createElement('div');
        statusElement.style.cssText = `
            font-size: 12px;
            color: #cccccc;
        `;
        statusElement.textContent = 'Esta operación puede tomar unos momentos...';

        // Añadir todos los elementos
        loaderContainer.appendChild(iconElement);
        loaderContainer.appendChild(messageElement);
        loaderContainer.appendChild(progressBar);
        loaderContainer.appendChild(statusElement);
        overlay.appendChild(loaderContainer);

        // Añadir al DOM
        document.body.appendChild(overlay);

        // Añadir animaciones CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            @keyframes progress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }
        `;
        document.head.appendChild(style);
    }

    // Función para ocultar indicador de carga
    function hideLoadingIndicator() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Función para mostrar tabla de clientes
    function displayClientesTable(clientes) {
        const table = document.getElementById('clientes-table');
        const loading = document.querySelector('#clientes-section .loading');
        const tbody = table.querySelector('tbody');

        if (!table || !loading) return;

        if (clientes && clientes.length > 0) {
            table.style.display = 'table';
            loading.style.display = 'none';

            tbody.innerHTML = '';

            clientes.forEach(cliente => {
                const row = document.createElement('tr');

                // Calcular totales de deudas (aceptar distintos nombres de campo del backend)
                const totalDeudas = cliente.total_deuda || cliente.total_deudas || cliente.total || 0;
                const totalPendiente = cliente.total_deuda || cliente.total_pendiente || cliente.total_pendiente || totalDeudas || 0;
                const deudasPendientes = cliente.cantidad_deudas || cliente.deudas_pendientes || 0;
                const deudasVencidas = cliente.deudas_vencidas || 0;

                // Determinar estado basado en deudas
                let estadoClass = '';
                let estadoText = 'Sin deudas';
                if (deudasVencidas > 0) {
                    estadoClass = 'lote-vencido';
                    estadoText = 'Con deudas vencidas';
                } else if (deudasPendientes > 0) {
                    estadoClass = 'lote-proximo-vencer';
                    estadoText = 'Con deudas pendientes';
                }

                row.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${cliente.nombre}</td>
                    <td>${cliente.telefono || '-'}</td>
                    <td>${cliente.dni || '-'}</td>
                    <td>${cliente.direccion || '-'}</td>
                    <td style="text-align: right; font-weight: bold;">${formatCurrency(totalPendiente)}</td>
                    <td style="text-align: center;">${deudasPendientes}</td>
                    <td style="text-align: center;"><span class="status-badge ${estadoClass}">${deudasVencidas}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="viewClientDebts(${cliente.id})" style="font-size: 12px; padding: 4px 8px; background: #17a2b8; color: white; margin-right: 5px;">💳 Ver Deudas</button>
                        <button class="btn btn-secondary" onclick="editClient(${cliente.id})" style="font-size: 12px; padding: 4px 8px; background: #28a745; color: white; margin-right: 5px;">✏️ Editar</button>
                        <button class="btn btn-secondary" onclick="deleteClient(${cliente.id})" style="font-size: 12px; padding: 4px 8px; background: #dc3545; color: white;">🗑️ Eliminar</button>
                    </td>
                `;

                tbody.appendChild(row);
            });

        } else {
            table.style.display = 'none';
            loading.textContent = 'No hay clientes registrados.';
            loading.style.display = 'block';
        }
    }

    // Función para abrir modal de agregar cliente
    function openAddClientModal() {
        document.getElementById('addClientForm').reset();
        document.getElementById('addClientModal').classList.add('show');
    }

    // Función para cerrar modal de agregar cliente
    function closeAddClientModal() {
        document.getElementById('addClientModal').classList.remove('show');
        document.getElementById('addClientForm').reset();
    }

    // Función para buscar clientes existentes
    async function checkExistingClient() {
        const dni = document.getElementById('addClientDni').value.trim();
        if (!dni) {
            alert('Por favor ingresa el DNI para buscar clientes existentes');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/customers?dni=${dni}`, { headers });
            if (response.ok) {
                const clients = await response.json();
                if (clients && clients.length > 0) {
                    const client = clients[0];
                    const confirmUseExisting = confirm(`Ya existe un cliente con DNI ${dni}: ${client.nombre}. ¿Desea usar este cliente existente?`);
                    if (confirmUseExisting) {
                        // Seleccionar el cliente existente
                        selectClientForSale(client);
                        closeAddClientModal();
                        return true;
                    }
                } else {
                    alert('No se encontró ningún cliente con ese DNI. Puede continuar con la creación.');
                }
            }
        } catch (error) {
            console.error('Error checking existing client:', error);
            alert('Error al buscar cliente existente: ' + error.message);
        }
        return false;
    }

    // Función para crear cliente
    async function createClient(event) {
        event.preventDefault();

        const formData = {
            nombre: document.getElementById('addClientNombre').value.trim(),
            telefono: document.getElementById('addClientTelefono').value.trim(),
            dni: document.getElementById('addClientDni').value.trim(),
            direccion: document.getElementById('addClientDireccion').value.trim(),
            nota: document.getElementById('addClientNota').value.trim()
        };

        // Validaciones básicas
        if (!formData.nombre) {
            alert('Por favor ingresa el nombre del cliente');
            return;
        }

        // Validar DNI si está presente
        if (formData.dni && !/^\d{7,8}$/.test(formData.dni)) {
            alert('El DNI debe contener entre 7 y 8 dígitos numéricos');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            

            // Verificar si ya existe un cliente con el mismo DNI
            if (formData.dni) {
                const checkResponse = await fetch(`${window.ApiClient.API_BASE}/customers?dni=${formData.dni}`, { headers });
                if (checkResponse.ok) {
                    const existingClients = await checkResponse.json();
                    if (existingClients && existingClients.length > 0) {
                        throw new Error(`Ya existe un cliente con el DNI ${formData.dni}. Por favor verifique los datos.`);
                    }
                }
            }

            const response = await fetch(`${window.ApiClient.API_BASE}/customers`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409) {
                    throw new Error(errorData.error || 'Cliente duplicado detectado. Por favor verifique si el cliente ya existe en el sistema.');
                }
                throw new Error(errorData.error || 'Error al crear cliente');
            }

            const result = await response.json();
            alert('Cliente creado exitosamente');
            closeAddClientModal();
            loadClientes(); // Recargar la lista

        } catch (error) {
            console.error('Error creating client:', error);
            alert('Error al crear cliente: ' + error.message);
        }
    }

    // Función para editar cliente
    async function editClient(clienteId) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/customers/${clienteId}`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener cliente');

            const cliente = await response.json();

            // Llenar el formulario con los datos actuales
            document.getElementById('editClientId').value = cliente.id;
            document.getElementById('editClientNombre').value = cliente.nombre;
            document.getElementById('editClientTelefono').value = cliente.telefono || '';
            document.getElementById('editClientDni').value = cliente.dni || '';
            document.getElementById('editClientDireccion').value = cliente.direccion || '';
            document.getElementById('editClientNota').value = cliente.nota || '';

            // Mostrar el modal
            document.getElementById('editClientModal').classList.add('show');

        } catch (error) {
            console.error('Error al cargar cliente para editar:', error);
            alert('Error al cargar cliente para editar: ' + error.message);
        }
    }

    // Función para cerrar modal de editar cliente
    function closeEditClientModal() {
        document.getElementById('editClientModal').classList.remove('show');
        document.getElementById('editClientForm').reset();
    }

    // Función para guardar cambios del cliente
    async function saveClientChanges(event) {
        event.preventDefault();

        const clienteId = document.getElementById('editClientId').value;
        const formData = {
            nombre: document.getElementById('editClientNombre').value.trim(),
            telefono: document.getElementById('editClientTelefono').value.trim(),
            dni: document.getElementById('editClientDni').value.trim(),
            direccion: document.getElementById('editClientDireccion').value.trim(),
            nota: document.getElementById('editClientNota').value.trim()
        };

        // Validaciones básicas
        if (!formData.nombre) {
            alert('Por favor ingresa el nombre del cliente');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/customers/${clienteId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar cliente');
            }

            const result = await response.json();
            alert('Cliente actualizado exitosamente');
            closeEditClientModal();
            loadClientes(); // Recargar la lista

        } catch (error) {
            console.error('Error al guardar cambios del cliente:', error);
            alert('Error al guardar cambios: ' + error.message);
        }
    }

    // Función para eliminar cliente
    async function deleteClient(clienteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/customers/${clienteId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar cliente');
            }

            const result = await response.json();
            alert('Cliente eliminado exitosamente');
            loadClientes(); // Recargar la lista

        } catch (error) {
            console.error('Error eliminando cliente:', error);
            alert('Error al eliminar cliente: ' + error.message);
        }
    }

    // Función para ver deudas del cliente
    async function viewClientDebts(clienteId) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            // Obtener deudas del cliente
            const response = await fetch(`${window.ApiClient.API_BASE}/debts?cliente_id=${clienteId}`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener deudas');

            const deudas = await response.json();

            // DIAGNÓSTICO: Log de deudas obtenidas
            console.log('🔍 [viewClientDebts] Deudas obtenidas:', deudas.length);
            console.log('🔍 [viewClientDebts] Deudas con precios:', deudas.map(d => ({
                producto: d.producto_nombre,
                precio_unitario: d.precio_unitario,
                precio_actual: d.precio_actual_producto,
                cantidad: d.producto_cantidad
            })));

            displayClientDebts(deudas);
            document.getElementById('clientDebtsModal').classList.add('show');

        } catch (error) {
            console.error('Error obteniendo deudas del cliente:', error);
            alert('Error al cargar deudas del cliente: ' + error.message);
        }
    }

    // Función para mostrar las deudas del cliente
    function displayClientDebts(deudas) {
        const content = document.getElementById('clientDebtsContent');

        if (!deudas || deudas.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h4 style="color: #ffffff;">No hay deudas registradas</h4>
                    <p>Este cliente no tiene deudas pendientes en este momento.</p>
                </div>
            `;
            return;
        }

        // ========== AGRUPAR DEUDAS POR FACTURA ==========
        const facturasAgrupadas = {};
        
        deudas.forEach(deuda => {
            const numFactura = deuda.venta_numero_factura || 'SIN_FACTURA';
            
            if (!facturasAgrupadas[numFactura]) {
                facturasAgrupadas[numFactura] = {
                    fecha: deuda.venta_fecha,
                    productos: [],
                    totalPendiente: 0,
                    tienePendiente: false,
                    estado: deuda.estado
                };
            }
            
            // Calcular pendiente: si no está pagado, usar subtotal; si está pagado, es 0
            const pendienteItem = deuda.producto_pagado === 0 || deuda.producto_pagado === '0' || !deuda.producto_pagado 
                ? parseFloat(deuda.producto_subtotal) || 0 
                : 0;
            
            facturasAgrupadas[numFactura].productos.push(deuda);
            facturasAgrupadas[numFactura].totalPendiente += pendienteItem;
            if (pendienteItem > 0) {
                facturasAgrupadas[numFactura].tienePendiente = true;
            }
        });

        // Calcular totales generales
        const totalPendiente = Object.values(facturasAgrupadas).reduce((sum, f) => sum + f.totalPendiente, 0);
        const facturasPendientes = Object.values(facturasAgrupadas).filter(f => f.tienePendiente).length;
        const facturasTotales = Object.keys(facturasAgrupadas).length;

        let deudasHtml = `
            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Resumen de Cuenta Corriente</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Total Pendiente:</strong>
                        <div style="font-size: 18px; font-weight: bold; color: #28a745; margin-top: 5px;">${formatCurrency(totalPendiente)}</div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Facturas Pendientes:</strong>
                        <div style="font-size: 18px; font-weight: bold; color: #ffc107; margin-top: 5px;">${facturasPendientes} de ${facturasTotales}</div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Total Facturas:</strong>
                        <div style="font-size: 18px; font-weight: bold; color: #17a2b8; margin-top: 5px;">${facturasTotales}</div>
                    </div>
                </div>
            </div>

            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Detalles por Factura</h4>
                <div style="overflow-x: auto;">
                    <table class="client-debts-table" style="width: 100%; border-collapse: collapse; background: #3d3d3d; color: #ffffff;">
                        <thead>
                            <tr style="background: #4a4a4a;">
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Factura</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Fecha</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Producto</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">Cantidad</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">Precio de compra</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">Precio Actual</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">Diferencia</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">Pendiente</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Vencimiento</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Estado</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #555;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Iterar sobre las facturas agrupadas (las más nuevas primero)
        // Ordenar por número de factura en orden descendente (las más nuevas primero)
        // Usar ordenamiento numérico para manejar correctamente FAC-1, FAC-2, FAC-10, etc.
        const facturasOrdenadas = Object.keys(facturasAgrupadas).sort((a, b) => {
            // Extraer el número de factura para ordenamiento numérico correcto
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numB - numA; // Orden descendente (mayor a menor = más nuevo primero)
        });
        
        facturasOrdenadas.forEach(numFactura => {
            const factura = facturasAgrupadas[numFactura];
            const fechaFormateada = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-AR') : '-';
            const primerProducto = factura.productos[0];
            const cantidadProductos = factura.productos.length;
            
            // Determinar estado general de la factura basado en productos pendientes
            const tieneProductosPendientes = factura.productos.some(p => 
                p.producto_pagado === 0 || p.producto_pagado === '0' || !p.producto_pagado
            );
            const estadoClass = !tieneProductosPendientes ? 'lote-vigente' : 'lote-proximo-vencer';
            const estadoText = !tieneProductosPendientes ? 'Pagada' : 'Pendiente';

            // Renderizar cada producto de esta factura
            factura.productos.forEach((deuda, idx) => {
                const fechaVencimiento = deuda.fecha_vencimiento ? new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR') : '-';
                const productoEstadoClass = deuda.estado === 'vencida' ? 'lote-vencido' : deuda.estado === 'pendiente' ? 'lote-proximo-vencer' : 'lote-vigente';
                const productoEstadoText = deuda.estado === 'vencida' ? 'Vencida' : deuda.estado === 'pendiente' ? 'Pendiente' : 'Pagada';

                let precioActual;
                let nombreProducto;
                const cantidad = deuda.producto_cantidad || 1;

                precioActual = deuda.precio_actual_producto;
                nombreProducto = deuda.producto_nombre;

                // Calcular pendiente: si no está pagado, usar subtotal; si está pagado, es 0
            const pendienteRecalc = deuda.producto_pagado === 0 || deuda.producto_pagado === '0' || !deuda.producto_pagado 
                ? parseFloat(deuda.producto_subtotal) || 0 
                : 0;
            const diferenciaTotal = precioActualTotal - precioOriginalTotal;

                let precioActualDisplay = '-';
                let diferenciaDisplay = '-';
                let diferenciaClass = '';

                if (precioActual !== undefined && precioActual !== null && deuda.precio_unitario !== undefined && deuda.precio_unitario !== null) {
                    precioActualDisplay = formatCurrency(precioActualTotal);
                    diferenciaClass = diferenciaTotal > 0 ? 'color: #dc3545;' : diferenciaTotal < 0 ? 'color: #28a745;' : '';
                    diferenciaDisplay = `${diferenciaTotal >= 0 ? '+' : ''}${formatCurrency(diferenciaTotal)}`;
                } else {
                    precioActualDisplay = precioActual ? formatCurrency(precioActualTotal) : '-';
                    diferenciaDisplay = 'No calculable';
                }

                // Mostrar siempre la información de la factura y fecha en cada fila
                // Esto evita problemas con rowspan cuando hay filas ocultas por el filtro
                const facturaCell = `<td style="padding: 10px;"><strong>${numFactura}</strong></td>`;
                const fechaCell = `<td style="padding: 10px;">${fechaFormateada}</td>`;
                
                // Determinar si este producto específico tiene deuda pendiente
                const pendienteItem = deuda.producto_pagado === 0 || deuda.producto_pagado === '0' || !deuda.producto_pagado;
                
                // Generar botones de acción para cada producto individualmente
                let accionesHtml = '';
                if (pendienteItem) {
                    // Calcular el monto pendiente de este producto
                    const pendienteEsteProducto = deuda.producto_pagado === 0 || deuda.producto_pagado === '0' || !deuda.producto_pagado 
                        ? parseFloat(deuda.producto_subtotal) || 0 
                        : 0;
                    accionesHtml = `
                        <button onclick="registerPayment(${deuda.id}, ${pendienteEsteProducto}, '${numFactura}', ${deuda.producto_id})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">Pagar ${pendienteEsteProducto}</button>
                        <button onclick="showPaymentHistory(${deuda.id})" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Historial</button>
                    `;
                } else {
                    accionesHtml = '<span style="color: #28a745; font-weight: bold;">Pagada</span>';
                }
                
                deudasHtml += `
                    <tr style="border-bottom: 1px solid #555;">
                        ${facturaCell}
                        ${fechaCell}
                        <td style="padding: 10px;">${nombreProducto}</td>
                        <td style="padding: 10px; text-align: right;">${cantidad}</td>
                        <td style="padding: 10px; text-align: right;">${formatCurrency(precioOriginalTotal)}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">${precioActualDisplay}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; ${diferenciaClass}">${diferenciaDisplay}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: ${pendienteRecalc > 0 ? '#dc3545' : '#28a745'};">${formatCurrency(pendienteRecalc)}</td>
                        <td style="padding: 10px;">${fechaVencimiento}</td>
                        <td style="padding: 10px;"><span class="status-badge ${productoEstadoClass}">${productoEstadoText}</span></td>
                        <td style="padding: 10px; text-align: center;">${accionesHtml}</td>
                    </tr>
                `;
            });
        });

        content.innerHTML = deudasHtml;
    }

    // Función para registrar un pago de deuda
    async function registerPayment(deudaId, montoPago, numeroFactura, productoId = null) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            let endpoint;
            let body;
            
            if (productoId) {
                endpoint = `${window.ApiClient.API_BASE}/debts/${deudaId}/producto/${productoId}/payment`;
                body = JSON.stringify({ monto: montoPago });
            } else {
                endpoint = `${window.ApiClient.API_BASE}/debts/${deudaId}/payment`;
                body = JSON.stringify({ monto: montoPago });
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar pago');
            }

            const result = await response.json();
            alert('Pago registrado exitosamente');
            
            if (result.cliente_id) {
                viewClientDebts(result.cliente_id);
            }

        } catch (error) {
            console.error('Error registrando pago:', error);
            alert('Error al registrar pago: ' + error.message);
        }
    }

    // Función para cerrar modal de deudas
    function closeClientDebtsModal() {
        document.getElementById('clientDebtsModal').classList.remove('show');
    }

    // Función para mostrar historial de pagos de una deuda
    async function showPaymentHistory(deudaId) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/debts/${deudaId}/payments`, { headers });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al obtener historial de pagos');
            }

            const payments = await response.json();
            displayPaymentHistory(payments);
            document.getElementById('paymentHistoryModal').classList.add('show');

        } catch (error) {
            console.error('Error obteniendo historial de pagos:', error);
            alert('Error al cargar historial de pagos: ' + error.message);
        }
    }

    // Función para mostrar el historial de pagos en el modal
    function displayPaymentHistory(payments) {
        const content = document.getElementById('paymentHistoryContent');

        if (!payments || payments.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h4 style="color: #ffffff;">No hay pagos registrados</h4>
                    <p>No se han realizado pagos para esta deuda.</p>
                </div>
            `;
            return;
        }

        let paymentsHtml = `
            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Historial de Pagos</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Total Pagado:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #28a745; margin-top: 5px;">
                            ${formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0))}
                        </div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Pagos Realizados:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #17a2b8; margin-top: 5px;">
                            ${payments.length}
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Detalles de Pagos</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: #3d3d3d; color: #ffffff;">
                        <thead>
                            <tr style="background: #4a4a4a;">
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Fecha</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Monto</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Método</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #555;">Registrado Por</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        payments.forEach(payment => {
            const fecha = new Date(payment.fecha).toLocaleString('es-AR');
            paymentsHtml += `
                <tr style="border-bottom: 1px solid #555;">
                    <td style="padding: 10px;">${fecha}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #28a745;">${formatCurrency(payment.monto)}</td>
                    <td style="padding: 10px;">${payment.metodo_pago || 'No especificado'}</td>
                    <td style="padding: 10px;">${payment.registrado_por || 'Sistema'}</td>
                </tr>
            `;
        });

        paymentsHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        content.innerHTML = paymentsHtml;
    }

    // Función para cerrar modal de historial de pagos
    function closePaymentHistoryModal() {
        document.getElementById('paymentHistoryModal').classList.remove('show');
    }

    // Función para mostrar resumen de actualización de precios de deudas
    function showDebtsUpdateSummary(result) {
        const content = document.getElementById('debtsUpdateSummaryContent');
        const rollbackBtn = document.getElementById('rollbackBtn');

        let summaryHtml = `
            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #28a745;">✅ Actualización Exitosa</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        `;

        // Mostrar estadísticas
        if (result.updated_debts !== undefined) {
            summaryHtml += `
                <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                    <strong style="color: #ffffff;">Deudas Actualizadas:</strong>
                    <div style="font-size: 24px; font-weight: bold; color: #17a2b8; margin-top: 5px;">${result.updated_debts}</div>
                </div>
            `;
        }

        if (result.total_impact !== undefined) {
            summaryHtml += `
                <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                    <strong style="color: #ffffff;">Impacto Total:</strong>
                    <div style="font-size: 24px; font-weight: bold; color: ${result.total_impact >= 0 ? '#28a745' : '#dc3545'}; margin-top: 5px;">${formatCurrency(result.total_impact)}</div>
                </div>
            `;
        }

        summaryHtml += `
                </div>
            </div>
        `;

        // Mostrar detalles si están disponibles
        if (result.details && result.details.length > 0) {
            summaryHtml += `
                <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
                    <h5 style="margin: 0 0 15px 0; color: #ffffff;">📋 Detalles de Cambios</h5>
                    <div style="max-height: 200px; overflow-y: auto;">
            `;

            result.details.forEach((detail, index) => {
                summaryHtml += `
                    <div style="padding: 8px; border-bottom: 1px solid #555; display: flex; justify-content: space-between;">
                        <span style="color: #ffffff;">${detail.cliente} - ${detail.producto}</span>
                        <span style="color: ${detail.impact >= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${formatCurrency(detail.impact)}</span>
                    </div>
                `;
            });

            summaryHtml += `
                    </div>
                </div>
            `;
        }

        content.innerHTML = summaryHtml;

        // Mostrar botón de rollback si hay cambios
        if (result.updated_debts > 0) {
            rollbackBtn.style.display = 'inline-block';
        } else {
            rollbackBtn.style.display = 'none';
        }

        // Mostrar modal
        document.getElementById('debtsUpdateSummaryModal').classList.add('show');
    }

    // Función para mostrar error de actualización con opción de rollback
    function showDebtsUpdateError(errorMessage) {
        const content = document.getElementById('debtsUpdateSummaryContent');
        const rollbackBtn = document.getElementById('rollbackBtn');

        content.innerHTML = `
            <div style="background: #4a2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                <h4 style="margin: 0 0 15px 0; color: #ff9999;">❌ Error en la Actualización</h4>
                <p style="margin: 0; color: #cccccc;">${errorMessage}</p>
                <p style="margin: 10px 0 0 0; color: #cccccc; font-size: 14px;">
                    Si se realizaron cambios parciales, puede intentar deshacerlos usando la opción de rollback.
                </p>
            </div>
        `;

        // Mostrar botón de rollback
        rollbackBtn.style.display = 'inline-block';

        // Mostrar modal
        document.getElementById('debtsUpdateSummaryModal').classList.add('show');
    }

    // Función para cerrar modal de resumen
    function closeDebtsUpdateSummaryModal() {
        document.getElementById('debtsUpdateSummaryModal').classList.remove('show');
    }

    // Función para hacer rollback de la actualización
    async function rollbackDebtsUpdate() {
        if (!confirm('¿Está seguro de que desea deshacer los cambios realizados en la actualización de precios?\n\nEsta acción restaurará los precios anteriores de las deudas.')) {
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            

            showAlert('Deshaciendo cambios...', 'success');

            const response = await fetch(`${window.ApiClient.API_BASE}/rollback-debts-update`, {
                method: 'POST',
                headers: headers
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al deshacer cambios');
            }

            const result = await response.json();
            alert('Cambios deshechos exitosamente');
            closeDebtsUpdateSummaryModal();
            loadClientes(); // Recargar clientes

        } catch (error) {
            console.error('Error haciendo rollback:', error);
            alert('Error al deshacer cambios: ' + error.message);
        }
    }

    // Nota: la actualización de precios ahora se ejecuta automáticamente.
    // Se eliminó la función para mostrar el modal manualmente.

    // Función para cerrar modal de actualización de precios
    // closeUpdateDebtsModal() eliminada: modal removido

    // Función para confirmar y ejecutar la actualización de precios de deudas
    async function confirmUpdateDebtsPrices() {
        closeUpdateDebtsModal();

        // Confirmación final
        const confirmMessage = '¿Está seguro de que desea actualizar los precios de todas las deudas pendientes?\n\nEsta operación sincronizará los precios de las deudas con los precios actuales de los productos y no se puede deshacer automáticamente.';
        if (!confirm(confirmMessage)) {
            return;
        }

        await updateDebtsPrices();
    }

    // Función mejorada para actualizar precios de deudas con validación y manejo de errores
    async function updateDebtsPrices() {
        try {
            // Mostrar indicador de carga
            showLoadingIndicator('Actualizando precios de deudas...', '🔄');

            const headers = { 'Content-Type': 'application/json' };
            

            // Paso 1: Obtener todas las deudas pendientes
            const debtsResponse = await fetch(`${window.ApiClient.API_BASE}/debts?estado=pendiente`, { headers });
            if (debtsResponse.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!debtsResponse.ok) throw new Error('Error al obtener deudas');

            const deudas = await debtsResponse.json();

            if (deudas.length === 0) {
                hideLoadingIndicator();
                showAlert('No hay deudas pendientes para actualizar', 'info');
                return;
            }

            // Paso 3: Enviar solicitud de actualización al backend
            const updateResponse = await fetch(`${window.ApiClient.API_BASE}/debts/update-prices`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    page: 1,
                    limit: 1000
                })
            });

            if (updateResponse.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Error al actualizar precios de deudas');
            }

            const result = await updateResponse.json();

            // Paso 4: Mostrar resultados
            hideLoadingIndicator();

            if (result.updated > 0) {
                showAlert(`✅ Se actualizaron ${result.updated} deudas. Los precios se sincronizaron con los precios actuales.`, 'success');
            } else {
                showAlert('No hay deudas con precios desactualizados', 'info');
            }

            // Paso 5: Recargar datos
            loadClientes();

        } catch (error) {
            hideLoadingIndicator();
            showDebtsUpdateError(error.message);
        }
    }

    // Función para mostrar resumen de deudas por cliente
    async function showDebtsSummary() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            // Obtener clientes con deudas
            const response = await fetch(`${window.ApiClient.API_BASE}/customers?with_debts=true`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener resumen de deudas');

            const data = await response.json();
            // Response puede ser paginado con .clientes o un array simple
            const clientes = data.clientes || data;

            displayDebtsSummary(clientes);
            document.getElementById('debtsSummaryModal').classList.add('show');

        } catch (error) {
            console.error('Error obteniendo resumen de deudas:', error);
            showAlert('Error al cargar resumen de deudas: ' + error.message, 'error');
        }
    }

    // Función para cerrar modal de resumen de deudas
    function closeDebtsSummaryModal() {
        document.getElementById('debtsSummaryModal').classList.remove('show');
    }



    // Función para mostrar el resumen de deudas
    function displayDebtsSummary(clientes) {
        const content = document.getElementById('debtsSummaryContent');

        if (!clientes || clientes.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h4 style="color: #ffffff;">No hay clientes con deudas</h4>
                    <p>No se encontraron clientes con deudas registradas en el sistema.</p>
                </div>
            `;
            return;
        }

        // Calcular totales generales
        const totalClientes = clientes.length;
        const totalDeudas = clientes.reduce((sum, c) => sum + (c.total_pendiente || 0), 0);
        const totalDeudasPendientes = clientes.reduce((sum, c) => sum + (c.deudas_pendientes || 0), 0);
        const totalDeudasVencidas = clientes.reduce((sum, c) => sum + (c.deudas_vencidas || 0), 0);

        let summaryHtml = `
            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Resumen General</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Clientes con Deudas:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #17a2b8; margin-top: 5px;">${totalClientes}</div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Total Deuda:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #dc3545; margin-top: 5px;">${formatCurrency(totalDeudas)}</div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Deudas Pendientes:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #ffc107; margin-top: 5px;">${totalDeudasPendientes}</div>
                    </div>
                    <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                        <strong style="color: #ffffff;">Deudas Vencidas:</strong>
                        <div style="font-size: 24px; font-weight: bold; color: #dc3545; margin-top: 5px;">${totalDeudasVencidas}</div>
                    </div>
                </div>
            </div>

            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Detalles por Cliente</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: #3d3d3d; color: #ffffff;">
                        <thead>
                            <tr style="background: #4a4a4a;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #555;">Cliente</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #555;">Teléfono</th>
                                <th style="padding: 12px; text-align: right; border: 1px solid #555;">Total Deuda</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #555;">Deudas Pendientes</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #555;">Deudas Vencidas</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #555;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        clientes.forEach(cliente => {
            const totalDeudas = cliente.total_pendiente || 0;
            const deudasPendientes = cliente.deudas_pendientes || 0;
            const deudasVencidas = cliente.deudas_vencidas || 0;

            let estadoClass = '';
            let estadoText = 'Sin deudas';
            if (deudasVencidas > 0) {
                estadoClass = 'lote-vencido';
                estadoText = 'Con deudas vencidas';
            } else if (deudasPendientes > 0) {
                estadoClass = 'lote-proximo-vencer';
                estadoText = 'Con deudas pendientes';
            }

            summaryHtml += `
                <tr style="border-bottom: 1px solid #555;">
                    <td style="padding: 12px; border: 1px solid #555;">${cliente.nombre}</td>
                    <td style="padding: 12px; border: 1px solid #555;">${cliente.telefono || '-'}</td>
                    <td style="padding: 12px; border: 1px solid #555; text-align: right; font-weight: bold; color: #dc3545;">${formatCurrency(totalDeudas)}</td>
                    <td style="padding: 12px; border: 1px solid #555; text-align: center;">${deudasPendientes}</td>
                    <td style="padding: 12px; border: 1px solid #555; text-align: center;"><span class="status-badge ${estadoClass}">${deudasVencidas}</span></td>
                    <td style="padding: 12px; border: 1px solid #555; text-align: center;"><span class="status-badge ${estadoClass}">${estadoText}</span></td>
                </tr>
            `;
        });

        summaryHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        content.innerHTML = summaryHtml;
    }

    // Función para exportar resumen de deudas a CSV
    function exportDebtsSummary() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            fetch(`${window.ApiClient.API_BASE}/customers?with_debts=true`, { headers })
                .then(response => response.json())
                .then(clientes => {
                    if (!clientes || clientes.length === 0) {
                        alert('No hay datos para exportar');
                        return;
                    }

                    // Crear CSV
                    let csv = 'Cliente,Teléfono,DNI,Dirección,Total Deuda,Deudas Pendientes,Deudas Vencidas,Estado\n';

                    clientes.forEach(cliente => {
                        const totalDeudas = cliente.total_pendiente || 0;
                        const deudasPendientes = cliente.deudas_pendientes || 0;
                        const deudasVencidas = cliente.deudas_vencidas || 0;

                        let estado = 'Sin deudas';
                        if (deudasVencidas > 0) estado = 'Con deudas vencidas';
                        else if (deudasPendientes > 0) estado = 'Con deudas pendientes';

                        csv += `"${cliente.nombre}","${cliente.telefono || ''}","${cliente.dni || ''}","${cliente.direccion || ''}",${totalDeudas},${deudasPendientes},${deudasVencidas},"${estado}"\n`;
                    });

                    // Descargar CSV
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `resumen_deudas_${new Date().toISOString().split('T')[0]}.csv`;
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    showAlert('Resumen de deudas exportado exitosamente', 'success');

                })
                .catch(error => {
                    console.error('Error exportando resumen:', error);
                    showAlert('Error al exportar resumen: ' + error.message, 'error');
                });

        } catch (error) {
            console.error('Error exportando resumen:', error);
            showAlert('Error al exportar resumen: ' + error.message, 'error');
        }
    }

    // Event listeners para formularios de clientes
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', createClient);
    }
    const editClientForm = document.getElementById('editClientForm');
    if (editClientForm) {
        editClientForm.addEventListener('submit', saveClientChanges);
    }

    // Event listeners para modales de clientes
    const addClientModal = document.getElementById('addClientModal');
    if (addClientModal) {
        addClientModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddClientModal();
            }
        });
    }

    const editClientModal = document.getElementById('editClientModal');
    if (editClientModal) {
        editClientModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditClientModal();
            }
        });
    }

    const clientDebtsModal = document.getElementById('clientDebtsModal');
    if (clientDebtsModal) {
        clientDebtsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeClientDebtsModal();
            }
        });
    }

    const debtsUpdateSummaryModal = document.getElementById('debtsUpdateSummaryModal');
    if (debtsUpdateSummaryModal) {
        debtsUpdateSummaryModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeDebtsUpdateSummaryModal();
            }
        });
    }

    // Event listener removido: updateDebtsModal ya no existe (actualización automática)

    const debtsSummaryModal = document.getElementById('debtsSummaryModal');
    if (debtsSummaryModal) {
        debtsSummaryModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeDebtsSummaryModal();
        }
    });

    // Función para cargar registro de operaciones
    async function loadOperationsLog() {
        const headers = { 'Content-Type': 'application/json' };
        

        const container = document.getElementById('operations-log-container');
        const loading = document.querySelector('#operations-log-section .loading');
        const list = document.getElementById('operations-list');

        try {
            loading.style.display = 'block';
            container.style.display = 'none';

            // Cargar estado del logging
            await loadLoggingStatus();

            const response = await fetch(`${window.ApiClient.API_BASE}/operations-log?limit=50`, { headers });
            if (!response.ok) throw new Error('Error al cargar registro de operaciones');

            const operations = await response.json();

            loading.style.display = 'none';
            container.style.display = 'block';

            if (operations.length === 0) {
                list.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No hay operaciones registradas</div>';
                return;
            }

            list.innerHTML = operations.map(operation => {
                const fecha = new Date(operation.created_at).toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });

                let icon = '📝';
                let bgColor = '#e8f4f8';

                switch (operation.tipo_operacion) {
                    case 'VENTA':
                        icon = '💰';
                        bgColor = '#d4edda';
                        break;
                    case 'PRODUCTO_CREADO':
                        icon = '📦';
                        bgColor = '#d1ecf1';
                        break;
                    case 'PRODUCTO_EDITADO':
                        icon = '✏️';
                        bgColor = '#fff3cd';
                        break;
                    case 'PROMOCION_CREADA':
                        icon = '🎉';
                        bgColor = '#f8d7da';
                        break;
                    case 'LOG_LIMPIADO':
                        icon = '🗑️';
                        bgColor = '#f8d7da';
                        break;
                    case 'CONFIGURACION_ACTUALIZADA':
                        icon = '⚙️';
                        bgColor = '#e8f4f8';
                        break;
                }

                return `
                    <div style="display: flex; align-items: flex-start; margin-bottom: 10px; padding: 10px; border-radius: 6px; background: ${bgColor}; border-left: 4px solid #17a2b8;">
                        <div style="font-size: 18px; margin-right: 10px;">${icon}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #3a74ae;">${operation.descripcion}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 2px;">
                                ${fecha} • ${operation.usuario || 'Sistema'}
                                ${operation.entidad_afectada ? ` • ${operation.entidad_afectada}` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading operations log:', error);
            loading.textContent = 'Error al cargar registro de operaciones';
        }
    }

    // Variable global para almacenar los cierres
    let globalCierresData = [];

    // Función para cargar historial de cierres de caja
    async function loadCierres() {
        const headers = { 'Content-Type': 'application/json' };
        

        const table = document.getElementById('historial-cierres-table');
        const loading = document.querySelector('#historial-cierres-section .loading');
        const tbody = table.querySelector('tbody');
        const cierreSelect = document.getElementById('cierre-select');

        try {
            loading.style.display = 'block';
            table.style.display = 'none';

            const response = await fetch(`${window.ApiClient.API_BASE}/cierres`, { headers });
            if (!response.ok) throw new Error('Error al cargar historial de cierres');

            const cierres = await response.json();
            globalCierresData = cierres; // Almacenar globalmente

            loading.style.display = 'none';
            table.style.display = 'table';

            if (cierres.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay cierres registrados</td></tr>';
                if (cierreSelect) {
                    cierreSelect.innerHTML = '<option value="">No hay cierres disponibles</option>';
                    cierreSelect.disabled = true;
                }
                return;
            }

            // Poblar el dropdown de cierres
            if (cierreSelect) {
                cierreSelect.innerHTML = '<option value="">Seleccionar cierre...</option>';
                cierres.forEach((cierre, index) => {
                    const option = document.createElement('option');
                    option.value = cierre.id;
                    const fecha = new Date(cierre.fecha_cierre || cierre.fecha).toLocaleDateString('es-AR');
                    const total = formatCurrency(cierre.total_ventas || 0);
                    option.textContent = `${fecha} - ${total}`;
                    cierreSelect.appendChild(option);
                });
                cierreSelect.disabled = false;
            }

            tbody.innerHTML = cierres.map(cierre => {
                const fecha = new Date(cierre.fecha_cierre || cierre.fecha).toLocaleDateString('es-AR');
                const dineroInicial = formatCurrency(cierre.dinero_inicial || 0);
                const totalVentas = formatCurrency(cierre.total_ventas || 0);
                const totalEsperado = formatCurrency(cierre.total_esperado || 0);
                const diferencia = formatCurrency(cierre.diferencia || 0);
                const cantidadVentas = cierre.cantidad_ventas || 0;

                return `
                    <tr>
                        <td>${fecha}</td>
                        <td>${dineroInicial}</td>
                        <td>${totalVentas}</td>
                        <td>${totalEsperado}</td>
                        <td style="color: ${cierre.diferencia < 0 ? '#dc3545' : '#28a745'};">${diferencia}</td>
                        <td>${cantidadVentas}</td>
                        <td><button class="btn btn-primary" onclick="showCierreDetails(${cierre.id})" style="font-size: 12px; padding: 4px 8px;">Ver Detalles</button></td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading cierres:', error);
            loading.textContent = 'Error al cargar historial de cierres';
            if (cierreSelect) {
                cierreSelect.innerHTML = '<option value="">Error al cargar cierres</option>';
                cierreSelect.disabled = true;
            }
        }
    }

    // Función para manejar cambios en el dropdown de cierres
    function handleCierreSelection() {
        const cierreSelect = document.getElementById('cierre-select');
        const viewBtn = document.getElementById('view-cierre-btn');
        const clearBtn = document.getElementById('clear-cierre-selection-btn');

        if (cierreSelect.value !== '') {
            viewBtn.disabled = false;
            clearBtn.disabled = false;
            // Resaltar la fila correspondiente
            highlightCierreRow(cierreSelect.value);
        } else {
            viewBtn.disabled = true;
            clearBtn.disabled = false;
            clearCierreHighlight();
        }
    }

    // Función para resaltar la fila del cierre seleccionado
    function highlightCierreRow(cierreId) {
        clearCierreHighlight();
        const index = globalCierresData.findIndex(c => c.id == cierreId);
        const rows = document.querySelectorAll('#historial-cierres-table tbody tr');
        if (rows[index]) {
            rows[index].style.backgroundColor = '#e3f2fd';
            rows[index].style.borderLeft = '4px solid #2196f3';
        }
    }

    // Función para limpiar el resaltado de cierres
    function clearCierreHighlight() {
        const rows = document.querySelectorAll('#historial-cierres-table tbody tr');
        rows.forEach(row => {
            row.style.backgroundColor = '';
            row.style.borderLeft = '';
        });
    }

    // Función para mostrar detalles del cierre seleccionado
    function showCierreDetails(cierreId = null) {
        let cierre;
        if (cierreId) {
            cierre = globalCierresData.find(c => c.id == cierreId);
        } else {
            const cierreSelect = document.getElementById('cierre-select');
            const selectedId = cierreSelect.value;
            cierre = globalCierresData.find(c => c.id == selectedId);
        }

        if (!cierre) {
            showAlert('Cierre no encontrado', 'error');
            return;
        }

        // Crear modal con detalles
        const fecha = new Date(cierre.fecha_cierre || cierre.fecha).toLocaleDateString('es-AR');
        const hora = new Date(cierre.fecha_cierre || cierre.fecha).toLocaleTimeString('es-AR');

        const modalContent = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">Detalles del Cierre de Caja</h3>

                <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Fecha:</strong>
                        <span>${fecha}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Hora:</strong>
                        <span>${hora}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Dinero Inicial:</strong>
                        <span>${formatCurrency(cierre.dinero_inicial || 0)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Total Ventas:</strong>
                        <span>${formatCurrency(cierre.total_ventas || 0)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Total Esperado:</strong>
                        <span>${formatCurrency(cierre.total_esperado || 0)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: ${cierre.diferencia < 0 ? '#f8d7da' : '#d4edda'}; border-radius: 6px;">
                        <strong>Diferencia:</strong>
                        <span style="color: ${cierre.diferencia < 0 ? '#721c24' : '#155724'};">${formatCurrency(cierre.diferencia || 0)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Cantidad de Ventas:</strong>
                        <span>${cierre.cantidad_ventas || 0}</span>
                    </div>

                    ${cierre.tipo_cierre ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Tipo de Cierre:</strong>
                        <span>${cierre.tipo_cierre}</span>
                    </div>
                    ` : ''}

                    ${cierre.notas ? `
                    <div style="padding: 10px; background: #fff3cd; border-radius: 6px;">
                        <strong>Notas:</strong><br>
                        <span>${cierre.notas}</span>
                    </div>
                    ` : ''}
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="document.querySelector('.cierre-details-modal').remove()" class="btn btn-secondary" style="font-size: 14px; padding: 10px 20px;">Cerrar</button>
                </div>
            </div>
        `;

    }

    // Función para limpiar selección de cierre
    function clearCierreSelection() {
        const cierreSelect = document.getElementById('cierre-select');
        const viewBtn = document.getElementById('view-cierre-btn');

        cierreSelect.value = '';
        viewBtn.disabled = true;
        clearCierreHighlight();
    }

    // Función para limpiar registro de operaciones
    async function clearOperationsLog() {
        // Pedir credenciales primero
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para limpiar el registro de operaciones');
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/operations-log`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al limpiar registro');
            }

            alert('Registro de operaciones limpiado exitosamente');
            loadOperationsLog(); // Recargar la lista

        } catch (error) {
            console.error('Error clearing operations log:', error);
            alert('Error al limpiar registro: ' + error.message);
        }
    }

    // Función para cargar el estado del logging
    async function loadLoggingStatus() {
        const headers = { 'Content-Type': 'application/json' };
        

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/settings/logging-enabled`, { headers });
            if (!response.ok) throw new Error('Error al cargar configuración de logging');

            const data = await response.json();
            const toggle = document.getElementById('logging-toggle');
            const status = document.getElementById('logging-status');

            toggle.checked = data.enabled;
            status.textContent = data.enabled ? 'Habilitado' : 'Deshabilitado';
            status.style.color = data.enabled ? '#28a745' : '#dc3545';

        } catch (error) {
            console.error('Error loading logging status:', error);
            document.getElementById('logging-status').textContent = 'Error al cargar';
            document.getElementById('logging-status').style.color = '#dc3545';
        }
    }

    // Función para alternar el estado del logging
    async function toggleLogging(enabled) {
        // Verificar si tiene licencia para activar logging
        if (enabled) {
            try {
                const licenseResponse = await fetch(`${window.ApiClient.API_BASE}/can-generate-reports`);
                const licenseData = await licenseResponse.json();

                if (!licenseData.canGenerate) {
                    const activate = confirm('Requiere licencia para activar el registro de operaciones.\n\n¿Deseas activar una licencia ahora?');
                    if (activate) {
                        window.open('/activate', '_blank');
                    }
                    document.getElementById('logging-toggle').checked = false;
                    return;
                }
            } catch (error) {
                console.error('Error checking license for logging:', error);
                alert('Error al verificar permisos para logging');
                document.getElementById('logging-toggle').checked = false;
                return;
            }
        }

        const headers = { 'Content-Type': 'application/json' };
        

        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/settings/logging-enabled`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ enabled: enabled })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar configuración');
            }

            const result = await response.json();
            const status = document.getElementById('logging-status');

            status.textContent = enabled ? 'Habilitado' : 'Deshabilitado';
            status.style.color = enabled ? '#28a745' : '#dc3545';

            alert(result.message);

        } catch (error) {
            console.error('Error toggling logging:', error);
            alert('Error al cambiar configuración: ' + error.message);
            // Revertir el toggle en caso de error
            document.getElementById('logging-toggle').checked = !enabled;
        }
    }

    // Event listeners para checkboxes de productos (solo para selección única)
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('product-checkbox')) {
            // Para selección única, desmarcar otros
            if (e.target.checked) {
                document.querySelectorAll('.product-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            }
        }
    });

    // Función especial para mostrar ventas agrupadas por factura
    function displaySalesGrouped(sales) {
        // Buscar el contenedor en la sección de ventas
        const container = document.querySelector('#ventas-container');
        const section = document.querySelector('#ventas-section');
        const loading = section ? section.querySelector('.loading') : null;

        if (!container) {
            return;
        }

        if (sales && sales.length > 0) {
            // Asegurar que el contenedor sea visible
            container.style.display = 'block';

            // Ocultar loading si existe
            if (loading) {
                loading.style.display = 'none';
            }


            // Generar HTML para las ventas
            const salesHTML = sales.map(sale => `
                <div class="invoice-card collapsed" style="border: 1px solid rgb(238, 238, 238); border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #fffbfbeb;">
                    <div class="invoice-header" style="border-bottom: 2px solid rgb(238, 238, 238); padding-bottom: 10px; margin-bottom: 15px; position: relative;">
                        <span class="collapse-icon" onclick="toggleInvoice(this)" title="Expandir/Contraer" style="cursor: pointer; font-size: 18px; color: #cccccc;">▶</span>
                        <h3 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: black; font-weight: bold;">Factura: ${sale.numero_factura}</h3>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                           <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;"><strong style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Fecha:</strong> ${new Date(sale.fecha).toLocaleString('es-AR', {
                               year: 'numeric',
                               month: '2-digit',
                               day: '2-digit',
                               hour: '2-digit',
                               minute: '2-digit',
                               second: '2-digit',
                               hour12: false
                           })}</span>
                           <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;"><strong style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Pago:</strong> ${formatPaymentMethod(sale.metodo_pago, sale)}</span>
                           <span style="color: #000000; font-weight: bold;">Total: ${formatCurrency(sale.total)}</span>
                        </div>
                    </div>

                    <div class="invoice-items" style="margin-bottom: 15px;">
                        <h4 style="margin: 5px 0; color: #000; font-weight: bold;">Productos:</h4>
                        ${sale.items && sale.items.length > 0 ? `
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <thead>
                                    <tr style="background: #fffdfd;">
                                        <th style="padding: 8px; text-align: left; border: 1px solid #666; font-weight: bold; font-size: 0.9em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Producto</th>
                                        <th style="padding: 8px; text-align: center; border: 1px solid #666; font-weight: bold; font-size: 0.9em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Cant</th>
                                        <th style="padding: 8px; text-align: center; border: 1px solid #666; font-weight: bold; font-size: 0.9em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Precio Unitario</th>
                                        <th style="padding: 8px; text-align: center; border: 1px solid #666; font-weight: bold; font-size: 0.9em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Tipo</th>
                                        <th style="padding: 8px; text-align: right; border: 1px solid #666; font-weight: bold; font-size: 0.9em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sale.items.map(item => {
                                        const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
                                        const hasDiscount = descuentoPorcentaje > 0;
                                        const precioOriginal = parseFloat(item.precio_original || item.precio_unitario);
                                        const precioUnitario = parseFloat(item.precio_unitario);
                                        const cantidad = item.cantidad || 0;
                                        const subtotal = precioUnitario * cantidad;

                                        console.log('Item discount check:', item.nombre, 'descuento_porcentaje:', item.descuento_porcentaje, 'hasDiscount:', hasDiscount);

                                        let precioDisplay = '';
                                        let tipoDisplay = '';

                                        if (hasDiscount) {
                                            precioDisplay = `<span style="text-decoration: line-through; color: #7f8c8d; margin-right: 5px;">${formatCurrency(precioOriginal)}</span><span style="color: #e74c3c; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                                            tipoDisplay = `<span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">${descuentoPorcentaje}% OFF</span>`;
                                        } else {
                                            precioDisplay = `<span style="color: #27ae60; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                                            tipoDisplay = `<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">Regular</span>`;
                                        }

                                        return `
                                            <tr style="${hasDiscount ? 'background: linear-gradient(90deg, #4a2d2d 0%, #3d3d3d 100%);' : 'background: #fff;'}">
                                                <td style="padding: 8px; border: 1px solid #666; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">${item.nombre || 'Producto desconocido'}</td>
                                                <td style="padding: 8px; border: 1px solid #666; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">${cantidad}</td>
                                                <td style="padding: 8px; border: 1px solid #666; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">${precioDisplay}</td>
                                                <td style="padding: 8px; border: 1px solid #666; text-align: center;">${tipoDisplay}</td>
                                                <td style="padding: 8px; border: 1px solid #666; text-align: right; font-weight: bold; ${hasDiscount ? 'color: #000000;' : 'color: #000000;'}">${formatCurrency(subtotal)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : '<div style="padding: 10px; color: #cccccc;">No hay productos en esta venta</div>'}
                    </div>

                    <div class="invoice-total" style="text-align: right; font-size: 18px; font-weight: bold; color: #66ff66; border-top: 2px solid #666; padding-top: 10px;">
                        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #000000;">Total: ${formatCurrency(sale.total || 0)}</span>
                        <button class="btn btn-primary" style="margin-left: 10px; background: #17a2b8; color: white; font-size: 12px; padding: 5px 10px;" onclick="showInvoiceDetails(${sale.id})">
                            👁️ Ver Detalles
                        </button>
                        <button class="btn btn-secondary" style="margin-left: 10px; background: #28a745; color: white; font-size: 12px; padding: 5px 10px;" onclick="printInvoice(${sale.id})">
                            🖨️ Imprimir
                        </button>
                        <button class="btn btn-secondary" style="margin-left: 10px; background: #dc3545; color: white; font-size: 12px; padding: 5px 10px;" onclick="cancelSale(${sale.id}, '${sale.numero_factura}')">
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            `).join('');

            container.innerHTML = salesHTML;

        } else {
            container.style.display = 'none';
            if (loading) {
                loading.textContent = 'No hay ventas registradas.';
                loading.style.display = 'block';
            }

        }
    }


    // Función para expandir/contraer facturas
    function toggleInvoice(iconElement) {
        const invoiceCard = iconElement.closest('.invoice-card');
        invoiceCard.classList.toggle('collapsed');

        // Cambiar el icono
        if (invoiceCard.classList.contains('collapsed')) {
            iconElement.textContent = '▶';
        } else {
            iconElement.textContent = '▼';
        }
    }

    // Función para filtrar ventas por fecha
    async function filterSales() {
        const date = document.getElementById('sales-date').value;
        const startDate = document.getElementById('sales-start-date').value;
        const endDate = document.getElementById('sales-end-date').value;

        let url = `${window.ApiClient.API_BASE}/sales`;

        // Construir parámetros de consulta
        const params = [];
        if (date) {
            params.push(`date=${date}`);
        } else if (startDate && endDate) {
            params.push(`start_date=${startDate}&end_date=${endDate}`);
        } else if (startDate) {
            params.push(`start_date=${startDate}`);
        } else if (endDate) {
            params.push(`end_date=${endDate}`);
        }

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const headers = { 'Content-Type': 'application/json' };
        

        try {
            showAlert('Cargando ventas filtradas...', 'success');
            const response = await fetch(url, { headers });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }

            if (!response.ok) throw new Error('Error al filtrar ventas');

            const ventas = await response.json();
            displaySalesGrouped(ventas);
            showAlert('Ventas filtradas exitosamente', 'success');

        } catch (error) {
            console.error('Error filtering sales:', error);
            showAlert('Error al filtrar ventas: ' + error.message, 'error');
        }
    }

    // Función para limpiar filtros y mostrar todas las ventas
    async function clearSalesFilter() {
        document.getElementById('sales-date').value = '';
        document.getElementById('sales-start-date').value = '';
        document.getElementById('sales-end-date').value = '';

        // Recargar ventas por defecto (hoy)
        await fetchAndDisplayData();
        showAlert('Filtros limpiados - mostrando ventas de hoy', 'success');
    }

    // Función para mostrar ventas de hoy
    async function showTodaySales() {
        document.getElementById('sales-date').value = '';
        document.getElementById('sales-start-date').value = '';
        document.getElementById('sales-end-date').value = '';

        // Recargar ventas por defecto (hoy)
        await fetchAndDisplayData();
        showAlert('Mostrando ventas de hoy', 'success');
    }

    // Función para cancelar una venta
    async function cancelSale(saleId, numeroFactura) {
        if (!confirm(`¿Está seguro de que desea cancelar la venta ${numeroFactura}?\n\nEsta acción no se puede deshacer y restaurará el stock de los productos.`)) {
            return;
        }

        // Pedir credenciales para cancelar venta
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para cancelar la venta');
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

        try {
            showAlert('Cancelando venta...', 'success');

            const response = await fetch(`${window.ApiClient.API_BASE}/sales/${saleId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cancelar la venta');
            }

            const result = await response.json();
            showAlert(result.message || 'Venta cancelada exitosamente', 'success');

            // Recargar las ventas para actualizar la vista
            await fetchAndDisplayData();

        } catch (error) {
            console.error('Error cancelando venta:', error);
            showAlert('Error al cancelar la venta: ' + error.message, 'error');
        }
    }

    // Función para mostrar detalles de factura
    async function showInvoiceDetails(saleId) {
        try {
            const sale = await window.ApiClient.apiRequest(`/sales/${saleId}`);

            displayInvoiceDetails(sale);

            // Mostrar modal
            document.getElementById('invoiceDetailsModal').classList.add('show');

        } catch (error) {
            showAlert('Error al cargar detalles de la factura: ' + error.message, 'error');
        }
    }

    // Función para mostrar los detalles de la factura en el modal
    function displayInvoiceDetails(sale) {
        const content = document.getElementById('invoiceDetailsContent');

        const fecha = new Date(sale.fecha).toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const metodoPago = formatPaymentMethod(sale.metodo_pago, sale);

        let itemsHtml = '';
        if (sale.items && sale.items.length > 0) {
            itemsHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: #2d2d2d; color: #ffffff;">
                    <thead>
                        <tr style="background: #3d3d3d;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #555;">Producto</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #555;">Cantidad</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #555;">Precio Unitario</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #555;">Tipo</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #555;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            sale.items.forEach(item => {
                const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
                const hasDiscount = descuentoPorcentaje > 0;
                const precioOriginal = parseFloat(item.precio_original || item.precio_unitario);
                const precioUnitario = parseFloat(item.precio_unitario);
                const cantidad = item.cantidad || 0;
                const subtotal = precioUnitario * cantidad;

                let precioDisplay = '';
                let tipoDisplay = '';

                if (hasDiscount) {
                    precioDisplay = `<span style="text-decoration: line-through; color: #7f8c8d; margin-right: 5px;">${formatCurrency(precioOriginal)}</span><span style="color: #e74c3c; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                    tipoDisplay = `<span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">${descuentoPorcentaje}% OFF</span>`;
                } else {
                    precioDisplay = `<span style="color: #27ae60; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                    tipoDisplay = `<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">Regular</span>`;
                }

                itemsHtml += `
                    <tr style="${hasDiscount ? 'background: linear-gradient(90deg, #4a2d2d 0%, #3d3d3d 100%);' : 'background: #2d2d2d;'}">
                        <td style="padding: 12px; border: 1px solid #555; font-weight: bold;">${item.nombre || 'Producto desconocido'}</td>
                        <td style="padding: 12px; border: 1px solid #555; text-align: center;">${cantidad}</td>
                        <td style="padding: 12px; border: 1px solid #555; text-align: center;">${precioDisplay}</td>
                        <td style="padding: 12px; border: 1px solid #555; text-align: center;">${tipoDisplay}</td>
                        <td style="padding: 12px; border: 1px solid #555; text-align: right; font-weight: bold; ${hasDiscount ? 'color: #000000;' : 'color: #ffffff;'}">${formatCurrency(subtotal)}</td>
                    </tr>
                `;
            });

            itemsHtml += `
                    </tbody>
                </table>
            `;
        } else {
            itemsHtml = '<div style="padding: 20px; color: #cccccc; text-align: center;">No hay productos en esta venta</div>';
        }

        content.innerHTML = `
            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Información General</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <strong style="color: #ffffff;">Factura N°:</strong>
                        <span style="color: #17a2b8; font-weight: bold;">${sale.numero_factura}</span>
                    </div>
                    <div>
                        <strong style="color: #ffffff;">Fecha y Hora:</strong>
                        <span style="color: #ffffff;">${fecha}</span>
                    </div>
                    <div>
                        <strong style="color: #ffffff;">Método de Pago:</strong>
                        <span style="color: #ffffff;">${metodoPago}</span>
                    </div>
                    <div>
                        <strong style="color: #ffffff;">Total:</strong>
                        <span style="color: #28a745; font-weight: bold; font-size: 18px;">${formatCurrency(sale.total)}</span>
                    </div>
                </div>
            </div>

            <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #ffffff;">Productos Vendidos</h4>
                ${itemsHtml}
            </div>
        `;
    }

    // Función para cerrar modal de detalles de factura
    function closeInvoiceDetailsModal() {
        document.getElementById('invoiceDetailsModal').classList.remove('show');
    }

    // Función para imprimir factura
    function printInvoice() {
        const modal = document.getElementById('invoiceDetailsModal');
        const content = document.getElementById('invoiceDetailsContent').innerHTML;

        // Crear una ventana de impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Factura ${document.querySelector('#invoiceDetailsContent strong').nextElementSibling.textContent}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                    th { background-color: #f2f2f2; }
                    .total { font-weight: bold; font-size: 18px; color: #28a745; }
                    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }


    // Funciones de autenticación
    function login() {
        if (unifiedLogin('Usuario para Panel de Control:')) {
            alert('✅ Sesión iniciada correctamente');
            fetchAndDisplayData(); // Recargar datos después del login
        }
    }

    function logout() {
        authCredentials = null;
        isLoggedIn = false;
        sessionStorage.removeItem('authCredentials');
        updateUIBasedOnAuth();
        alert('👋 Sesión cerrada');
        // Redirigir al inicio si se cierra sesión desde dashboard
        window.location.href = 'index.html';
    }

    function updateUIBasedOnAuth() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.textContent = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión';
            loginBtn.onclick = isLoggedIn ? logout : login;
        }
    }

    // Verificar autenticación al cargar dashboard
    function checkDashboardAccess() {
        if (!isLoggedIn) {
            // Mostrar modal de login en lugar de redirigir
            showLoginModal('Debes iniciar sesión para acceder al Panel de Control:', () => {
                // Callback cuando el login sea exitoso
                loadLicenseStatus();
                fetchAndDisplayData();
            });
            return false;
        }
        return true;
    }

    // Cargar y mostrar estado de licencia
    async function loadLicenseStatus() {
        try {
            const response = await fetch(`${window.ApiClient.API_BASE}/license-status`);
            const data = await response.json();

            const indicator = document.getElementById('license-indicator');

            if (data.activated) {
                indicator.innerHTML = '<span style="color: #28a745;">✅ Licencia Activada - Características Premium Disponibles</span>';
            } else {
                indicator.innerHTML = '<span style="color: #dc3545;">⚠️ Sin Licencia - Características Limitadas</span>';
            }
        } catch (error) {
            console.error('Error loading license status:', error);
            document.getElementById('license-indicator').innerHTML = '<span style="color: #ffc107;">⚠️ Error al cargar estado de licencia</span>';
        }
    }


    // Cargar credenciales al iniciar
    function loadAuthFromStorage() {
        const stored = sessionStorage.getItem('authCredentials');
        if (stored) {
            authCredentials = JSON.parse(stored);
            isLoggedIn = true;
        }
        updateUIBasedOnAuth();
    }

    // Función para ejecutar acción de datos seleccionada
    function executeDataAction() {
        const action = document.getElementById('dataActionSelect').value;
        switch(action) {
            case 'backup':
                createBackup();
                break;
            case 'restore':
                document.getElementById('backupFileInput').click();
                break;
            case 'report':
                generateReport();
                break;
            case 'reset':
                showResetModal();
                break;
            default:
                alert('Selecciona una acción válida');
        }
    }

    // Función para ejecutar acción del sistema seleccionada
    function executeSystemAction() {
        const action = document.getElementById('systemActionSelect').value;
        switch(action) {
            case 'support':
                showSupportModal();
                break;
            case 'session':
                if (isLoggedIn) {
                    logout();
                } else {
                    login();
                }
                break;
            case 'license':
                loadLicenseStatus();
                alert('Estado de licencia actualizado');
                break;
            case 'settings':
                alert('Configuraciones del sistema - Funcionalidad próximamente');
                break;
            default:
                alert('Selecciona una acción válida');
        }
    }

    // Función para generar reporte y enviar por email
    async function generateReport() {
        // Pedir credenciales siempre para esta operación crítica
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (!username || !password) {
            alert('Credenciales requeridas para generar el reporte');
            return;
        }
        const tempCredentials = { username, password };

        // Mostrar modal de opciones de reporte
        document.getElementById('reportOptionsModal').classList.add('show');
    }

    // Función para cerrar modal de opciones de reporte
    function closeReportOptionsModal() {
        document.getElementById('reportOptionsModal').classList.remove('show');
    }

    // Función para mostrar modal de soporte
    function showSupportModal() {
        document.getElementById('supportModal').classList.add('show');
    }

    // Función para cerrar modal de soporte
    function closeSupportModal() {
        document.getElementById('supportModal').classList.remove('show');
    }

    // >>> FUNCIONES PARA PEDIDOS A PROVEEDORES

    // Función para abrir modal de crear pedido
    function openCreateOrderModal() {
        // Limpiar formulario
        document.getElementById('orderSupplierId').value = '';
        document.getElementById('orderDeliveryDate').value = '2025-11-07';
        document.getElementById('orderNotes').value = '';
        document.getElementById('orderItemsContainer').innerHTML = '';

        // Cargar proveedores
        loadSuppliersForOrder();

        document.getElementById('createOrderModal').classList.add('show');
    }

    // Función para cerrar modal de crear pedido
    function closeCreateOrderModal() {
        document.getElementById('createOrderModal').classList.remove('show');
    }

    // Función para cargar proveedores en el select del pedido
    async function loadSuppliersForOrder() {
        try {
            // Siempre cargar desde API para asegurar datos actualizados
            const headers = { 'Content-Type': 'application/json' };
            
            const response = await fetch(`${window.ApiClient.API_BASE}/suppliers`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener proveedores');
            const suppliers = await response.json();

            // Actualizar datos globales
            globalSuppliersData = suppliers;

            const select = document.getElementById('orderSupplierId');
            select.innerHTML = '<option value="">Seleccionar proveedor...</option>';

            if (suppliers && suppliers.length > 0) {
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.nombre_proveedor;
                    select.appendChild(option);
                });
            } else {
                // Si no hay proveedores, mostrar mensaje
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay proveedores registrados';
                option.disabled = true;
                select.appendChild(option);
            }
        } catch (error) {
            console.error('Error loading suppliers for order:', error);
            const select = document.getElementById('orderSupplierId');
            select.innerHTML = '<option value="">Error al cargar proveedores</option>';
            showAlert('Error al cargar proveedores para el pedido', 'error');
        }
    }

    // Función para agregar item al pedido
    function addOrderItem() {
        const container = document.getElementById('orderItemsContainer');

        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            padding: 10px;
            background: #314e6a;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        `;

        itemDiv.innerHTML = `
            <select class="order-product-select" style="flex: 2; padding: 8px; border: 2px solid #030303; border-radius: 6px;" onchange="updateProductPrice(this)">
                <option value="">Seleccionar producto...</option>
            </select>
            <input type="number" class="order-quantity" placeholder="Cant." min="1" value="1" style="width: 80px; padding: 8px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;" onchange="calculateOrderItemTotal(this)">
            <input type="number" class="order-price" placeholder="Precio" step="0.01" min="0" value="0.00" style="width: 100px; padding: 8px; border: 2px solid #030303; border-radius: 6px; background: #f8f9fa;" onchange="calculateOrderItemTotal(this)">
            <span class="order-subtotal" style="font-weight: bold; min-width: 80px;">$0,00</span>
            <button type="button" onclick="removeOrderItem(this)" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">✕</button>
        `;

        container.appendChild(itemDiv);
        loadProductsForOrder(itemDiv.querySelector('.order-product-select'));
    }

    // Función para remover item del pedido
    function removeOrderItem(button) {
        button.closest('.order-item').remove();
        calculateOrderTotal();
    }

    // Función para cargar productos en el select del item
    async function loadProductsForOrder(selectElement) {
        try {
            const products = await fetchProductsData();

            selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.nombre} (${product.codigo})`;
                option.dataset.price = product.precio;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading products for order:', error);
        }
    }

    // Función para actualizar precio cuando se selecciona producto
    function updateProductPrice(selectElement) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        const priceInput = selectElement.closest('.order-item').querySelector('.order-price');
        const quantityInput = selectElement.closest('.order-item').querySelector('.order-quantity');

        if (selectedOption.value && selectedOption.dataset.price) {
            priceInput.value = parseFloat(selectedOption.dataset.price).toFixed(2);
            if (quantityInput.value) {
                calculateOrderItemTotal(quantityInput);
            }
        }
    }

    // Función para calcular total del item
    function calculateOrderItemTotal(element) {
        const itemDiv = element.closest('.order-item');
        const quantity = parseFloat(itemDiv.querySelector('.order-quantity').value) || 0;
        const price = parseFloat(itemDiv.querySelector('.order-price').value) || 0;
        const subtotal = quantity * price;

        itemDiv.querySelector('.order-subtotal').textContent = formatCurrency(subtotal);
        calculateOrderTotal();
    }

    // Función para calcular total del pedido
    function calculateOrderTotal() {
        const items = document.querySelectorAll('.order-item');
        let total = 0;

        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.order-quantity').value) || 0;
            const price = parseFloat(item.querySelector('.order-price').value) || 0;
            total += quantity * price;
        });

        document.getElementById('orderTotal').textContent = formatCurrency(total);
    }

    // Función para crear pedido
    async function createOrder() {
        const supplierId = document.getElementById('orderSupplierId').value;
        const deliveryDate = document.getElementById('orderDeliveryDate').value;
        const notes = document.getElementById('orderNotes').value;

        if (!supplierId) {
            showAlert('Debe seleccionar un proveedor', 'error');
            return;
        }

        const items = [];
        const itemElements = document.querySelectorAll('.order-item');

        for (const itemElement of itemElements) {
            const productSelect = itemElement.querySelector('.order-product-select');
            const quantityInput = itemElement.querySelector('.order-quantity');
            const priceInput = itemElement.querySelector('.order-price');

            const productId = productSelect.value;
            const quantity = parseInt(quantityInput.value);
            const price = parseFloat(priceInput.value);

            if (!productId || !quantity || !price) {
                showAlert('Todos los campos de los items son requeridos', 'error');
                return;
            }

            items.push({
                producto_id: productId,
                cantidad: quantity,
                precio_unitario: price
            });
        }

        if (items.length === 0) {
            showAlert('Debe agregar al menos un item al pedido', 'error');
            return;
        }

        try {
            showAlert('Creando pedido...', 'success');

            const headers = { 'Content-Type': 'application/json' };
            
            const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    proveedor_id: supplierId,
                    fecha_entrega_estimada: deliveryDate || null,
                    items: items,
                    notas: notes
                })
            });

            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear el pedido');
            }

            const result = await response.json();
            showAlert(result.message || 'Pedido creado exitosamente', 'success');

            closeCreateOrderModal();
            loadSupplierOrders();

        } catch (error) {
            console.error('Error creating order:', error);
            showAlert('Error al crear el pedido: ' + error.message, 'error');
        }
    }

    // Helper para renderizar una fila de pedido a proveedor
    function renderSupplierOrderRow(order) {
        const estadoClass = {
            'pendiente': 'status-pending',
            'en_proceso': 'status-process',
            'entregado': 'status-entregado',
            'cancelado': 'status-cancelled'
        }[order.estado] || '';
        const estadoText = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'entregado': 'Entregado',
            'cancelado': 'Cancelado'
        }[order.estado] || order.estado;
        return `
            <td>${order.id}</td>
            <td>${order.numero_pedido}</td>
            <td>${order.nombre_proveedor}</td>
            <td>${new Date(order.fecha_pedido).toLocaleDateString('es-AR')}</td>
            <td>${order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString('es-AR') : '-'}</td>
            <td><span class="status-badge ${estadoClass}">${estadoText}</span></td>
            <td>${formatCurrency(order.total)}</td>
            <td>
                <button onclick="viewOrderDetails(${order.id})" class="btn" style="font-size: 12px; padding: 6px 12px; background: #17a2b8; color: white; margin-right: 5px;">Ver</button>
                <select onchange="handleOrderStatusChange(this, ${order.id}, ${!!order.fecha_entrega})" style="font-size: 12px; padding: 4px;">
                    <option value="">Cambiar estado</option>
                    <option value="pendiente"${order.estado === 'pendiente' ? ' selected' : ''}>Pendiente</option>
                    <option value="en_proceso"${order.estado === 'en_proceso' ? ' selected' : ''}>En Proceso</option>
                    <option value="entregado"${order.estado === 'entregado' ? ' selected' : ''}>Entregado</option>
                    <option value="cancelado"${order.estado === 'cancelado' ? ' selected' : ''}>Cancelado</option>
                </select>
            </td>
        `;
    }

    // Refactor: Cargar pedidos a proveedores y renderizar usando helper
    async function loadSupplierOrders() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            
            const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener pedidos');
            const orders = await response.json();

            const tableBody = document.querySelector('#pedidos-table tbody');
            if (!tableBody) return;
            tableBody.innerHTML = '';

            if (orders.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No hay pedidos registrados</td></tr>';
                return;
            }

            orders.forEach(order => {
                const row = document.createElement('tr');
                row.innerHTML = renderSupplierOrderRow(order);
                tableBody.appendChild(row);
            });

            const pedidosTable = document.querySelector('#pedidos-table');
            const loadingElement = document.querySelector('#orders-loading');
            if (pedidosTable) pedidosTable.style.display = 'table';
            if (loadingElement) loadingElement.style.display = 'none';
        } catch (error) {
            console.error('Error loading supplier orders:', error);
            document.querySelector('#orders-loading').innerHTML = 'Error al cargar pedidos';
        }
    }

    // Refactor: Manejar cambio de estado de pedido (incluye bugfix)
    function handleOrderStatusChange(select, orderId, hasDeliveryDate) {
        const newStatus = select.value;
        if (!newStatus) return;
        // Si el nuevo estado es "entregado", abrir modal de confirmación
        if (newStatus === 'entregado') {
            openConfirmDeliveryModal(orderId, select);
            return;
        }
        updateOrderStatus(orderId, newStatus, hasDeliveryDate, select);
    }

    // Modificar updateOrderStatus para aceptar select y refrescar UI correctamente
    async function updateOrderStatus(orderId, newStatus, hasDeliveryDate, selectElement) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            
            const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders/${orderId}/status`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ estado: newStatus })
            });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar estado');
            }
            const result = await response.json();
            showAlert(result.message || 'Estado actualizado exitosamente', 'success');
            // Siempre recargar la lista para reflejar el estado real
            await loadSupplierOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            showAlert('Error al actualizar estado: ' + error.message, 'error');
            // Si hay un select, revertir visualmente al valor anterior
            if (selectElement) {
                await loadSupplierOrders();
            }
        }
    }


    // Función para ver detalles del pedido
    async function viewOrderDetails(orderId) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            
            const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders/${orderId}`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Error al obtener detalles del pedido');
            const order = await response.json();

            let detailsHtml = `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <h3 style="color: #151414; border-bottom: 2px solid #eee; padding-bottom: 10px;">Detalles del Pedido ${order.numero_pedido}</h3>

                    <div style="background: #303437; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Proveedor:</strong> ${order.nombre_proveedor}</p>
                        <p><strong>Contacto:</strong> ${order.nombre_contacto || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> ${order.telefono || 'N/A'}</p>
                        <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
                        <p><strong>Fecha del Pedido:</strong> ${new Date(order.fecha_pedido).toLocaleDateString('es-AR')}</p>
                        <p><strong>Fecha de Entrega:</strong> ${order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString('es-AR') : 'No especificada'}</p>
                        <p><strong>Estado:</strong> <span style="padding: 4px 8px; border-radius: 4px; background: ${getStatusColor(order.estado)};">${getStatusText(order.estado)}</span></p>
                        ${order.notas ? `<p><strong>Notas:</strong> ${order.notas}</p>` : ''}
                    </div>

                    <h4 style="color: #34495e; margin-top: 20px;">Items del Pedido</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background: #37a388; color: white;">
                                <th style="padding: 10px; text-align: left; border: 1px solid #030303;">Producto</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #030303;">Cantidad</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #030303;">Precio Unit.</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #030303;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            order.items.forEach(item => {
                detailsHtml += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #030303;">${item.producto_nombre} (${item.producto_codigo})</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #030303;">${item.cantidad}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #030303;">${formatCurrency(item.precio_unitario)}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #030303;">${formatCurrency(item.subtotal)}</td>
                    </tr>
                `;
            });

            detailsHtml += `
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #030303; color: #000000;">TOTAL:</td>
                                <td style="padding: 10px; text-align: right; border: 1px solid #030303; color: #000000;">${formatCurrency(order.total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            // Mostrar modal con detalles
            const modalContent = `
                <div style="background: white; padding: 20px; border-radius: 12px; max-width: 90%; max-height: 90%; overflow-y: auto;">
                    ${detailsHtml}
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="document.querySelector('.order-details-modal').remove()" class="btn btn-secondary" style="font-size: 14px; padding: 10px 20px;">Cerrar</button>
                    </div>
                </div>
            `;

            createModal('order-details-modal', modalContent);

        } catch (error) {
            console.error('Error loading order details:', error);
            showAlert('Error al cargar detalles del pedido', 'error');
        }
    }

    // Funciones auxiliares para colores y textos de estado
    function getStatusColor(status) {
        const colors = {
            'pendiente': '#ffc107',
            'en_proceso': '#17a2b8',
            'entregado': '#28a745',
            'cancelado': '#dc3545'
        };
        return colors[status] || '#6c757d';
    }

    function getStatusText(status) {
        const texts = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'entregado': 'Entregado',
            'cancelado': 'Cancelado'
        };
        return texts[status] || status;
    }

    // Función para contactar soporte
    function contactSupport() {
        // Abrir email client con asunto predefinido
        const subject = encodeURIComponent('Soporte Técnico - Sistema POS');
        const body = encodeURIComponent('Hola,\n\nNecesito ayuda con el Sistema POS.\n\nDescripción del problema:\n\n');
        const mailtoUrl = `mailto:mikhail.njr@gmail.com?subject=${subject}&body=${body}`;
        window.open(mailtoUrl, '_blank');

        // También mostrar mensaje de confirmación
        alert('Se abrió tu cliente de email. Si no se abre automáticamente, puedes contactarnos directamente a: mikhail.njr@gmail.com o +543434721177');

        closeSupportModal();
    }

    // Función para cargar productos más vendidos
    async function loadTopProducts(limit = 10) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            

            const response = await fetch(`${window.ApiClient.API_BASE}/stats?limit=${limit}`, { headers });
            if (response.status === 401) {
                isLoggedIn = false;
                updateUIBasedOnAuth();
                throw new Error('Autenticación requerida');
            }
            if (!response.ok) throw new Error('Network response for stats was not ok');

            const stats = await response.json();

            // Mostrar los productos más vendidos
            displayTopProducts(stats.top_products);

            // Mostrar/ocultar botón "Cargar Más" según si hay más productos
            const loadMoreContainer = document.getElementById('load-more-container');
            const loadMoreBtn = document.getElementById('load-more-btn');

            if (stats.top_products && stats.top_products.length >= limit) {
                loadMoreContainer.style.display = 'block';
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = `📊 Cargar Más Productos (${limit} mostrados)`;
            } else {
                loadMoreContainer.style.display = 'none';
            }

        } catch (error) {
            console.error('Error loading top products:', error);
            const loading = document.getElementById('top-products-loading');
            if (loading) {
                loading.textContent = 'Error al cargar productos más vendidos';
            }
        }
    }

    // Función para mostrar productos más vendidos
    function displayTopProducts(products) {
        const table = document.getElementById('top-products-table');
        const tbody = table.querySelector('tbody');
        const loading = document.getElementById('top-products-loading');

        if (products && products.length > 0) {
            table.style.display = 'table';
            if (loading) loading.style.display = 'none';

            tbody.innerHTML = '';
            products.forEach((product, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${product.nombre}</td>
                    <td>${product.codigo}</td>
                    <td>${product.total_vendido}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            table.style.display = 'none';
            if (loading) {
                loading.textContent = 'No hay productos vendidos aún';
                loading.style.display = 'block';
            }
        }
    }

    // Función para cargar más productos
    function loadMoreTopProducts() {
        currentTopProductsLimit += 10; // Aumentar límite en 10
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = '⏳ Cargando...';

        loadTopProducts(currentTopProductsLimit).then(() => {
            // El botón se actualiza automáticamente en loadTopProducts
        }).catch(error => {
            console.error('Error loading more products:', error);
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = '❌ Error - Reintentar';
        });
    }

    // Función para cerrar modal de opciones de reset
    function closeResetModal() {
        document.getElementById('resetModal').classList.remove('show');
    }

    // Función para seleccionar todas las secciones de reset
    function selectAllResetSections() {
        document.getElementById('resetVentas').checked = true;
        document.getElementById('resetLotes').checked = true;
        document.getElementById('resetCierres').checked = true;
        document.getElementById('resetProveedores').checked = true;
        document.getElementById('resetPedidos').checked = true;
        document.getElementById('resetPromociones').checked = true;
        document.getElementById('resetLog').checked = true;
        document.getElementById('resetMetricas').checked = true;
    }

    // Función para deseleccionar todas las secciones de reset
    function deseleccionarAllResetSections() {
        document.getElementById('resetVentas').checked = false;
        document.getElementById('resetLotes').checked = false;
        document.getElementById('resetCierres').checked = false;
        document.getElementById('resetProveedores').checked = false;
        document.getElementById('resetPedidos').checked = false;
        document.getElementById('resetPromociones').checked = false;
        document.getElementById('resetLog').checked = false;
        document.getElementById('resetMetricas').checked = false;
    }

    // Función para seleccionar todas las secciones
    function selectAllSections() {
        document.getElementById('includeFacturas').checked = true;
        document.getElementById('includeCierres').checked = true;
        document.getElementById('includeProductos').checked = true;
        document.getElementById('includeProveedores').checked = true;
        document.getElementById('includeLotes').checked = true;
    }

    // Función para deseleccionar todas las secciones
    function deselectAllSections() {
        document.getElementById('includeFacturas').checked = false;
        document.getElementById('includeCierres').checked = false;
        document.getElementById('includeProductos').checked = false;
        document.getElementById('includeProveedores').checked = false;
        document.getElementById('includeLotes').checked = false;
    }

    // >>> FUNCIONES PARA GESTIÓN DE LOTES

    // Función para cargar sugerencia de lote
    async function loadLoteSuggestion() {
        try {
            const response = await window.ApiClient.apiRequest('/lotes/suggest');
            const suggestionElement = document.getElementById('loteSuggestion');
            const suggestedSpan = document.getElementById('suggestedLote');

            if (response.suggested) {
                suggestedSpan.textContent = response.suggested;
                suggestionElement.style.display = 'block';
            } else {
                suggestionElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Error cargando sugerencia de lote:', error);
            document.getElementById('loteSuggestion').style.display = 'none';
        }
    }

    // Función para usar la sugerencia de lote
    function useLoteSuggestion() {
        const suggestedSpan = document.getElementById('suggestedLote');
        const loteInput = document.getElementById('loteNumero');

        if (suggestedSpan && suggestedSpan.textContent) {
            loteInput.value = suggestedSpan.textContent;
            // Ocultar la sugerencia después de usarla
            document.getElementById('loteSuggestion').style.display = 'none';
            // Verificar disponibilidad del lote
            checkLoteAvailability();
        }
    }

    // Función para verificar lote en tiempo real
    async function checkLoteAvailability() {
        const loteInput = document.getElementById('loteNumero');
        const numeroLote = loteInput.value.trim();

        if (numeroLote.length === 0) {
            loteInput.style.borderColor = '#030303';
            return;
        }

        try {
            const response = await window.ApiClient.apiRequest(`/lotes/check/${encodeURIComponent(numeroLote)}`);
            if (response.exists) {
                loteInput.style.borderColor = '#dc3545'; // Rojo para lote existente
                showAlert('⚠️ Este número de lote ya existe', 'error');
            } else {
                loteInput.style.borderColor = '#28a745'; // Verde para lote disponible
            }
        } catch (error) {
            console.error('Error verificando lote:', error);
            loteInput.style.borderColor = '#030303';
        }
    }

    // Función para abrir modal de crear lote
    async function openCreateLoteModal() {
        try {
            const products = await fetchProductsData();
            const select = document.getElementById('loteProductoId');
            select.innerHTML = '<option value="">Cargando productos...</option>';

            let options = '<option value="">Seleccionar producto</option>';
            products.forEach(product => {
                options += `<option value="${product.id}">${product.nombre} (${product.codigo}) [${product.codigo_barras || 'Sin código'}] - Stock: ${product.stock}</option>`;
            });
            select.innerHTML = options;

            // Cargar sugerencia de lote
            loadLoteSuggestion();

            // Mostrar modal
            document.getElementById('createLoteModal').classList.add('show');
        } catch (error) {
            console.error('Error cargando productos:', error);
            showAlert('Error al cargar productos', 'error');
        }
    }

    // Función para cerrar modal de crear lote
    function closeCreateLoteModal() {
        document.getElementById('createLoteModal').classList.remove('show');
        document.getElementById('createLoteForm').reset();
        // Limpiar sugerencia
        document.getElementById('loteSuggestion').style.display = 'none';
    }

    // Función para crear lote
    async function createLote() {
        const formData = {
            producto_id: parseInt(document.getElementById('loteProductoId').value),
            numero_lote: document.getElementById('loteNumero').value.trim(),
            fecha_vencimiento: document.getElementById('loteFechaVencimiento').value,
            cantidad_inicial: parseInt(document.getElementById('loteCantidadInicial').value),
            costo_unitario: parseFloat(document.getElementById('loteCostoUnitario').value) || null,
            notas: document.getElementById('loteNotas').value.trim()
        };

        // Validaciones
        if (!formData.producto_id || !formData.numero_lote || !formData.fecha_vencimiento || !formData.cantidad_inicial) {
            showAlert('Todos los campos marcados con * son requeridos', 'error');
            return;
        }

        if (formData.cantidad_inicial <= 0) {
            showAlert('La cantidad inicial debe ser mayor a 0', 'error');
            return;
        }

        // Verificar si el lote ya existe
        try {
            const checkResponse = await apiRequest(`/lotes/check/${encodeURIComponent(formData.numero_lote)}`);
            if (checkResponse.exists) {
                showAlert('❌ Este número de lote ya existe. Use un número diferente.', 'error');
                return;
            }
        } catch (error) {
            console.error('Error verificando lote:', error);
            // Continuar con la creación si falla la verificación
        }

        try {
            const response = await window.ApiClient.apiRequest('/lotes', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            closeCreateLoteModal();
            showAlert('✅ Lote creado exitosamente', 'success');
            loadLotes(); // Recargar lista de lotes

        } catch (error) {
            console.error('Error creando lote:', error);
            showAlert('❌ Error al crear lote: ' + error.message, 'error');
        }
    }

    // Función para cargar lotes
    async function loadLotes(productId = null, statusFilter = null) {
        try {
            let url = '/lotes';
            if (productId) {
                url = `/products/${productId}/lotes`;
            }

            const lotes = await window.ApiClient.apiRequest(url);
            displayLotesTable(lotes, statusFilter);

        } catch (error) {
            console.error('Error cargando lotes:', error);
            const container = document.querySelector('#lotes-section');
            if (container) {
                container.innerHTML = '<div class="error">Error al cargar lotes. Asegúrate de que el servidor esté activo.</div>';
            }
        }
    }

    // Función para mostrar tabla de lotes
    function displayLotesTable(lotes, statusFilter = null) {
        const table = document.getElementById('lotes-table');
        const loading = document.getElementById('lotes-loading');

        if (!table || !loading) return;

        // Aplicar filtro de estado si existe
        let filteredLotes = lotes;
        if (statusFilter) {
            filteredLotes = lotes.filter(lote => {
                switch (statusFilter) {
                    case 'vigente':
                        return lote.estado_vencimiento === 'vigente';
                    case 'proximo_vencer':
                        return lote.estado_vencimiento === 'proximo_vencer';
                    case 'vencido':
                        return lote.estado_vencimiento === 'vencido';
                    default:
                        return true;
                }
            });
        }

        if (filteredLotes && filteredLotes.length > 0) {
            table.style.display = 'table';
            loading.style.display = 'none';

            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';

            filteredLotes.forEach(lote => {
                const fechaVencimiento = new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR');
                const diasRestantes = lote.dias_para_vencer;
                let estadoClass = 'lote-vigente';
                let estadoText = 'Vigente';
                let diasClass = 'dias-vencimiento normal';

                if (lote.estado_vencimiento === 'vencido') {
                    estadoClass = 'lote-vencido';
                    estadoText = 'Vencido';
                    diasClass = 'dias-vencimiento urgente';
                } else if (lote.estado_vencimiento === 'proximo_vencer') {
                    estadoClass = 'lote-proximo-vencer';
                    estadoText = 'Próximo a vencer';
                    diasClass = 'dias-vencimiento advertencia';
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${lote.id}</td>
                    <td>${lote.producto_nombre} (${lote.producto_codigo})</td>
                    <td>${lote.numero_lote}</td>
                    <td>${fechaVencimiento}</td>
                    <td>${lote.cantidad_inicial}</td>
                    <td>${lote.cantidad_actual}</td>
                    <td><span class="status-badge ${estadoClass}">${estadoText}</span></td>
                    <td><span class="${diasClass}">${diasRestantes >= 0 ? `${diasRestantes} días` : `${Math.abs(diasRestantes)} días vencido`}</span></td>
                    <td>
                        <button class="edit-button" onclick="editLote(${lote.id})" style="font-size: 12px; padding: 4px 8px;">Editar</button>
                        <button class="btn btn-secondary" onclick="deleteLote(${lote.id})" style="background: #dc3545; color: white; margin-left: 5px; font-size: 12px; padding: 4px 8px;">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

        } else {
            table.style.display = 'none';
            loading.textContent = 'No hay lotes registrados.';
            loading.style.display = 'block';
        }
    }

    // Función para filtrar lotes
    function filterLotes() {
        const productId = document.getElementById('lote-filter').value;
        const statusFilter = document.getElementById('lote-status-filter').value;

        loadLotes(productId || null, statusFilter);
    }

    // Función para limpiar filtro de lotes
    function clearLoteFilter() {
        document.getElementById('lote-filter').value = '';
        document.getElementById('lote-status-filter').value = '';
        loadLotes();
    }

    // Función para editar lote
    async function editLote(loteId) {
        try {
            // Obtener datos del lote
            const lotes = await window.ApiClient.apiRequest('/lotes');
            const lote = lotes.find(l => l.id === loteId);

            if (!lote) {
                showAlert('Lote no encontrado', 'error');
                return;
            }

            // Llenar formulario
            document.getElementById('editLoteId').value = lote.id;
            document.getElementById('editLoteNumero').value = lote.numero_lote;
            document.getElementById('editLoteFechaVencimiento').value = lote.fecha_vencimiento;
            document.getElementById('editLoteCostoUnitario').value = lote.costo_unitario || '';
            document.getElementById('editLoteNotas').value = lote.notas || '';

            // Mostrar modal
            document.getElementById('editLoteModal').classList.add('show');

        } catch (error) {
            console.error('Error al cargar lote para editar:', error);
            showAlert('Error al cargar lote para editar', 'error');
        }
    }

    // Función para cerrar modal de editar lote
    function closeEditLoteModal() {
        document.getElementById('editLoteModal').classList.remove('show');
        document.getElementById('editLoteForm').reset();
    }

    // Función para actualizar lote
    async function updateLote() {
        const loteId = document.getElementById('editLoteId').value;
        const formData = {
            numero_lote: document.getElementById('editLoteNumero').value.trim(),
            fecha_vencimiento: document.getElementById('editLoteFechaVencimiento').value,
            costo_unitario: parseFloat(document.getElementById('editLoteCostoUnitario').value) || null,
            notas: document.getElementById('editLoteNotas').value.trim()
        };

        try {
            await window.ApiClient.apiRequest(`/lotes/${loteId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            closeEditLoteModal();
            showAlert('✅ Lote actualizado exitosamente', 'success');
            loadLotes(); // Recargar lista

        } catch (error) {
            console.error('Error actualizando lote:', error);
            showAlert('❌ Error al actualizar lote: ' + error.message, 'error');
        }
    }

    // Función para eliminar lote
    async function deleteLote(loteId) {
        if (!confirm('¿Estás seguro de eliminar este lote? Si tiene stock disponible, será reducido del inventario total.')) {
            return;
        }

        try {
            await window.ApiClient.apiRequest(`/lotes/${loteId}`, {
                method: 'DELETE'
            });

            showAlert('✅ Lote eliminado exitosamente', 'success');
            loadLotes(); // Recargar lista

        } catch (error) {
            console.error('Error eliminando lote:', error);
            showAlert('❌ Error al eliminar lote: ' + error.message, 'error');
        }
    }

    // Función para cargar reporte de lotes
    async function loadLotesReport() {
        try {
            const [expiringSoon, expired, allLotes] = await Promise.all([
                window.ApiClient.apiRequest('/lotes/expiring-soon?days=30'),
                window.ApiClient.apiRequest('/lotes/expired'),
                window.ApiClient.apiRequest('/lotes')
            ]);

            // Generar reporte HTML
            let reportHtml = `
                <div style="max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <h2 style="color: #f3f7fb; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">📊 Reporte de Lotes y Vencimientos</h2>
                    <p style="text-align: center; color: #666;">Generado el ${new Date().toLocaleDateString('es-AR')}</p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; color: #1976d2;">${allLotes.length}</h3>
                            <p style="margin: 5px 0 0 0; color: #666;">Total de Lotes</p>
                        </div>
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; color: #f57c00;">${expiringSoon.length}</h3>
                            <p style="margin: 5px 0 0 0; color: #666;">Próximos a Vencer</p>
                        </div>
                        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; color: #dc3545;">${expired.length}</h3>
                            <p style="margin: 5px 0 0 0; color: #666;">Vencidos</p>
                        </div>
                    </div>
            `;

            // Sección de lotes próximos a vencer
            if (expiringSoon.length > 0) {
                reportHtml += `
                    <h3 style="color: #f57c00; margin-top: 30px;">⚠️ Lotes Próximos a Vencer</h3>
                    <div style="border: 1px solid #ffeaa7; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #fff3cd;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Producto</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Lote</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Vence</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Días</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                expiringSoon.forEach(lote => {
                    reportHtml += `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.producto_nombre}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.numero_lote}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR')}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.dias_para_vencer}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.cantidad_actual}</td>
                        </tr>
                    `;
                });

                reportHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            // Sección de lotes vencidos
            if (expired.length > 0) {
                reportHtml += `
                    <h3 style="color: #dc3545; margin-top: 30px;">🚨 Lotes Vencidos</h3>
                    <div style="border: 1px solid #f5c6cb; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8d7da;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Producto</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Lote</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Venció</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Días</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                expired.forEach(lote => {
                    reportHtml += `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.producto_nombre}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.numero_lote}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR')}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.dias_vencido}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${lote.cantidad_actual}</td>
                        </tr>
                    `;
                });

                reportHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            reportHtml += `
                </div>
            `;

            // Mostrar modal con el reporte
            const modalContent = `
                <div style="background: white; padding: 20px; border-radius: 12px; max-width: 90%; max-height: 90%; overflow-y: auto;">
                    ${reportHtml}
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="this.closest('.lotes-report-modal').remove()" class="btn btn-secondary" style="font-size: 14px; padding: 10px 20px;">Cerrar</button>
                    </div>
                </div>
            `;

            createModal('lotes-report-modal', modalContent);

        } catch (error) {
            console.error('Error generando reporte de lotes:', error);
            showAlert('Error al generar reporte de lotes', 'error');
        }
    }

    // Función para generar reporte con secciones seleccionadas
    async function generateSelectedReport() {
        // Verificar si tiene licencia para generar reportes
        try {
            const licenseResponse = await fetch(`${window.ApiClient.API_BASE}/can-generate-reports`);
            const licenseData = await licenseResponse.json();

            if (!licenseData.canGenerate) {
                const activate = confirm(licenseData.message + '\n\n¿Deseas activar una licencia ahora?');
                if (activate) {
                    window.open('/activate', '_blank');
                }
                closeReportOptionsModal();
                return;
            }
        } catch (error) {
            console.error('Error checking license for reports:', error);
            alert('Error al verificar permisos para reportes');
            closeReportOptionsModal();
            return;
        }

        // Obtener credenciales (ya verificadas en generateReport)
        let tempCredentials = authCredentials;
        if (!tempCredentials) {
            const username = prompt('Usuario:');
            const password = prompt('Contraseña:');
            if (username && password) {
                tempCredentials = { username, password };
            } else {
                alert('Credenciales requeridas para generar el reporte');
                return;
            }
        }

        // Pedir email
        const email = prompt('Ingrese el correo electrónico del destinatario:');
        if (!email || !email.includes('@')) {
            alert('Correo electrónico inválido');
            return;
        }

        // Pedir fecha opcional
        const dateInput = prompt('Ingrese la fecha (YYYY-MM-DD) o deje vacío para toda la información:');
        let filterDate = null;
        if (dateInput && dateInput.trim()) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
                alert('Formato de fecha inválido. Use YYYY-MM-DD');
                return;
            }
            filterDate = dateInput.trim();
        }

        // Obtener secciones seleccionadas
        const includeFacturas = document.getElementById('includeFacturas').checked;
        const includeCierres = document.getElementById('includeCierres').checked;
        const includeProductos = document.getElementById('includeProductos').checked;
        const includeProveedores = document.getElementById('includeProveedores').checked;
        const includeLotes = document.getElementById('includeLotes').checked;

        // Cerrar modal
        closeReportOptionsModal();

        // Headers para autenticación
        const headers = { 'Content-Type': 'application/json' };
        if (tempCredentials) {
            headers['Authorization'] = 'Basic ' + btoa(tempCredentials.username + ':' + tempCredentials.password);
        }

        try {
            // Mostrar loading
            showAlert('Generando reporte...', 'success');

            // Fetch ventas
            const salesRes = await fetch(`${window.ApiClient.API_BASE}/sales`, { headers });
            if (!salesRes.ok) throw new Error('Error al obtener ventas');
            let sales = await salesRes.json();

            // Filtrar por fecha si se especificó
            if (filterDate) {
                sales = sales.filter(sale => sale.fecha.startsWith(filterDate));
            }

            // Fetch productos
            const productsRes = await fetch(`${window.ApiClient.API_BASE}/products`, { headers });
            if (!productsRes.ok) throw new Error('Error al obtener productos');
            const products = await productsRes.json();

            // Calcular total de unidades en stock
            const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

            // Fetch proveedores (opcional)
            let suppliers = [];
            try {
                const suppliersRes = await fetch(`${window.ApiClient.API_BASE}/suppliers`, { headers });
                if (suppliersRes.ok) {
                    suppliers = await suppliersRes.json();
                }
            } catch (e) {
                console.log('Proveedores no disponibles');
            }

            // Fetch cierres de caja
            const cierresRes = await fetch(`${window.ApiClient.API_BASE}/cierres`, { headers });
            if (!cierresRes.ok) throw new Error('Error al obtener cierres de caja');
            const cierres = await cierresRes.json();

            // Fetch lotes (opcional)
            let lotes = [];
            if (includeLotes) {
                try {
                    const lotesRes = await fetch(`${window.ApiClient.API_BASE}/lotes`, { headers });
                    if (lotesRes.ok) {
                        lotes = await lotesRes.json();
                    }
                } catch (e) {
                    console.log('Lotes no disponibles');
                }
            }

            // Generar PDF con mejor formato
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Configuración de página
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            let y = 30;

            // Título principal
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE DE ESTADO DEL COMERCIO', pageWidth / 2, y, { align: 'center' });
            y += 15;

            // Línea separadora
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            // Fecha del reporte
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-AR')}`, margin, y);
            y += 10;

            if (filterDate) {
                doc.text(`Datos filtrados por fecha: ${filterDate}`, margin, y);
                y += 15;
            }

            // ==========================================
            // SECCIÓN 1: RESUMEN GENERAL
            // ==========================================
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN GENERAL', margin, y);
            y += 8;
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Total productos
            doc.text(`Productos en stock: ${totalStock} unidades`, margin, y);
            y += 8;

            // Resumen de ventas
            const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
            doc.text(`Total de ventas realizadas: ${sales.length}`, margin, y);
            y += 8;
            doc.text(`Monto total de ventas: ${formatCurrency(totalSales)}`, margin, y);
            y += 15;

            // ==========================================
            // SECCIÓN 2: DETALLE DE VENTAS
            // ==========================================
            if (includeFacturas && sales.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('DETALLE DE VENTAS', margin, y);
                y += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                sales.forEach((sale, index) => {
                    if (y > 250) {
                        doc.addPage();
                        y = 30;
                    }

                    // Encabezado de factura (formato profesional)
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`FACTURA: ${sale.numero_factura}`, margin, y);
                    y += 8;

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Fecha: ${new Date(sale.fecha).toLocaleDateString('es-AR')}`, margin, y);
                    doc.text(`Hora: ${new Date(sale.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, 80, y);

                    // Método de pago
                    let metodoPago = 'No especificado';
                    if (Array.isArray(sale.metodo_pago) && sale.metodo_pago.length > 0) {
                        if (sale.metodo_pago[0].metodo) {
                            metodoPago = sale.metodo_pago.map(p => `${p.metodo.toUpperCase()}: ${formatCurrency(p.monto)}`).join(' + ');
                        }
                    } else if (typeof sale.metodo_pago === 'string') {
                        metodoPago = sale.metodo_pago.toUpperCase();
                    }
                    doc.text(`Pago: ${metodoPago}`, 140, y);
                    y += 8;

                    // Línea separadora del encabezado
                    doc.setLineWidth(0.3);
                    doc.setDrawColor(100, 100, 100); // Color gris oscuro para líneas
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 5;

                    // Items de la venta - Formato de tabla estructurada
                    if (sale.items && sale.items.length > 0) {
                        // Título de la sección de productos
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('DETALLE DE PRODUCTOS', margin, y);
                        y += 6;

                        // Encabezados de tabla
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Producto', margin + 5, y);
                        doc.text('Cant', 100, y);
                        doc.text('Precio Unit.', 120, y);
                        doc.text('Tipo', 160, y);
                        doc.text('Subtotal', 185, y);
                        y += 4;

                        // Línea separadora
                        doc.setLineWidth(0.2);
                        doc.setDrawColor(100, 100, 100);
                        doc.line(margin + 5, y, pageWidth - margin, y);
                        y += 3;

                        doc.setFont('helvetica', 'normal');

                        sale.items.forEach(item => {
                            if (y > 270) {
                                doc.addPage();
                                y = 30;
                                // Repetir encabezados en nueva página
                                doc.setFontSize(8);
                                doc.setFont('helvetica', 'bold');
                                doc.text('Producto', margin + 5, y);
                                doc.text('Cant', 100, y);
                                doc.text('Precio Unit.', 120, y);
                                doc.text('Tipo', 160, y);
                                doc.text('Subtotal', 185, y);
                                y += 4;
                                doc.line(margin + 5, y, pageWidth - margin, y);
                                y += 3;
                                doc.setFont('helvetica', 'normal');
                            }

                            const precioOriginal = parseFloat(item.precio_original || item.precio_unitario);
                            const precioUnitario = parseFloat(item.precio_unitario);
                            const descuento = parseFloat(item.descuento_porcentaje || 0);
                            const subtotal = precioUnitario * item.cantidad;

                            // Nombre del producto (truncar si es muy largo)
                            const productName = item.nombre.length > 20 ? item.nombre.substring(0, 17) + '...' : item.nombre;
                            doc.text(productName, margin + 5, y);

                            // Cantidad
                            doc.text(item.cantidad.toString(), 100, y);

                            // Precio unitario
                            if (descuento > 0) {
                                // Mostrar precio original tachado y precio con descuento
                                doc.setFontSize(7);
                                doc.text(`${formatCurrency(precioOriginal)}`, 120, y - 1);
                                doc.setLineWidth(0.1);
                                doc.line(120, y, 120 + doc.getTextWidth(formatCurrency(precioOriginal)), y);
                                doc.setFontSize(8);
                                doc.setFont('helvetica', 'bold');
                                doc.text(`${formatCurrency(precioUnitario)}`, 120, y + 2);
                                doc.setFont('helvetica', 'normal');
                            } else {
                                doc.text(formatCurrency(precioUnitario), 120, y);
                            }

                            // Tipo (Regular o % OFF)
                            if (descuento > 0) {
                                doc.setFont('helvetica', 'bold');
                                doc.text(`${descuento}% OFF`, 160, y);
                                doc.setFont('helvetica', 'normal');
                            } else {
                                doc.setFontSize(7);
                                doc.text('Regular', 160, y);
                                doc.setFontSize(8);
                            }

                            // Subtotal
                            doc.setFont('helvetica', 'bold');
                            doc.text(formatCurrency(subtotal), 185, y);
                            doc.setFont('helvetica', 'normal');

                            y += 6;
                        });

                        // Línea final de la tabla
                        doc.setLineWidth(0.3);
                        doc.setDrawColor(100, 100, 100);
                        doc.line(margin + 5, y, pageWidth - margin, y);
                        y += 8;
                    }
                    y += 5;

                    // Total de la factura (formato profesional)
                    if (y > 250) {
                        doc.addPage();
                        y = 30;
                    }

                    // Espacio antes del total
                    y += 3;

                    // Línea separadora
                    doc.setLineWidth(0.5);
                    doc.setDrawColor(100, 100, 100);
                    doc.line(130, y, pageWidth - margin, y);
                    y += 10;

                    // Total de la factura
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('TOTAL FACTURA:', 130, y);
                    doc.text(formatCurrency(sale.total), pageWidth - margin, y, { align: 'right' });
                    y += 12;

                    // Espacio entre facturas
                    y += 10;
                });
                y += 5;
            }

            // ==========================================
            // SECCIÓN 3: CIERRES DE CAJA
            // ==========================================
            if (includeCierres && cierres.length > 0) {
                if (y > 150) {
                    doc.addPage();
                    y = 30;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('CIERRES DE CAJA', margin, y);
                y += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                cierres.forEach(cierre => {
                    if (y > 250) {
                        doc.addPage();
                        y = 30;
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.text(`Fecha: ${new Date(cierre.fecha).toLocaleDateString('es-AR')}`, margin, y);
                    y += 6;
                    doc.setFont('helvetica', 'normal');

                    doc.text(`Dinero inicial: ${formatCurrency(cierre.dinero_inicial)}`, margin + 5, y);
                    y += 5;
                    doc.text(`Total ventas: ${formatCurrency(cierre.total_ventas)}`, margin + 5, y);
                    y += 5;
                    doc.text(`Total esperado: ${formatCurrency(cierre.total_esperado)}`, margin + 5, y);
                    y += 5;
                    doc.text(`Diferencia: ${formatCurrency(cierre.diferencia)}`, margin + 5, y);
                    y += 8;
                });
            }

            // ==========================================
            // SECCIÓN 4: PRODUCTOS DISPONIBLES
            // ==========================================
            if (includeProductos) {
                if (y > 200) {
                    doc.addPage();
                    y = 30;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('PRODUCTOS DISPONIBLES', margin, y);
                y += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                products.forEach(product => {
                    if (y > 270) {
                        doc.addPage();
                        y = 30;
                    }

                    const hasDiscount = product.descuento_porcentaje && product.descuento_porcentaje > 0;
                    let productLine = `${product.nombre}`;
                    if (hasDiscount) {
                        productLine += ` (${product.descuento_porcentaje}% OFF)`;
                    }

                    doc.text(productLine, margin, y);
                    doc.text(`Stock: ${product.stock}`, 120, y);
                    doc.text(`Precio: ${formatCurrency(product.precio)}`, 160, y);
                    y += 6;
                });
                y += 10;
            }

            // ==========================================
            // SECCIÓN 5: PROVEEDORES
            // ==========================================
            if (includeProveedores && suppliers.length > 0) {
                if (y > 200) {
                    doc.addPage();
                    y = 30;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('PROVEEDORES', margin, y);
                y += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                suppliers.forEach(supplier => {
                    if (y > 270) {
                        doc.addPage();
                        y = 30;
                    }

                    doc.text(`${supplier.nombre_proveedor}`, margin, y);
                    if (supplier.nombre_contacto) {
                        doc.text(`Contacto: ${supplier.nombre_contacto}`, margin + 5, y + 5);
                    }
                    if (supplier.telefono) {
                        doc.text(`Teléfono: ${supplier.telefono}`, 120, y);
                    }
                    if (supplier.email) {
                        doc.text(`Email: ${supplier.email}`, 120, y + 5);
                    }
                    y += 15;
                });
            }

            // ==========================================
            // SECCIÓN 6: LOTES Y VENCIMIENTOS
            // ==========================================
            if (includeLotes && lotes.length > 0) {
                if (y > 200) {
                    doc.addPage();
                    y = 30;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('LOTES Y VENCIMIENTOS', margin, y);
                y += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                // Resumen de lotes
                const totalLotes = lotes.length;
                const lotesVigentes = lotes.filter(l => l.estado_vencimiento === 'vigente').length;
                const lotesProximosVencer = lotes.filter(l => l.estado_vencimiento === 'proximo_vencer').length;
                const lotesVencidos = lotes.filter(l => l.estado_vencimiento === 'vencido').length;

                doc.text(`Total de lotes: ${totalLotes}`, margin, y);
                y += 6;
                doc.text(`Vigentes: ${lotesVigentes}`, margin + 5, y);
                doc.text(`Próximos a vencer: ${lotesProximosVencer}`, 80, y);
                doc.text(`Vencidos: ${lotesVencidos}`, 140, y);
                y += 10;

                // Tabla de lotes
                if (y > 250) {
                    doc.addPage();
                    y = 30;
                }

                // Encabezados de tabla
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Producto', margin, y);
                doc.text('Lote', 90, y);
                doc.text('Vencimiento', 120, y);
                doc.text('Cant. Actual', 160, y);
                doc.text('Estado', 190, y);
                y += 4;

                // Línea separadora
                doc.setLineWidth(0.2);
                doc.line(margin, y, pageWidth - margin, y);
                y += 3;

                doc.setFont('helvetica', 'normal');

                lotes.forEach(lote => {
                    if (y > 270) {
                        doc.addPage();
                        y = 30;
                        // Repetir encabezados en nueva página
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Producto', margin, y);
                        doc.text('Lote', 90, y);
                        doc.text('Vencimiento', 120, y);
                        doc.text('Cant. Actual', 160, y);
                        doc.text('Estado', 190, y);
                        y += 4;
                        doc.line(margin, y, pageWidth - margin, y);
                        y += 3;
                        doc.setFont('helvetica', 'normal');
                    }

                    const fechaVencimiento = new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR');
                    const estadoText = {
                        'vigente': 'Vigente',
                        'proximo_vencer': 'Próximo',
                        'vencido': 'Vencido'
                    }[lote.estado_vencimiento] || lote.estado_vencimiento;

                    // Nombre del producto (truncar si es muy largo)
                    const maxProductLength = 35; // Límite más amplio para nombres completos
                    const productName = lote.producto_nombre.length > maxProductLength
                        ? lote.producto_nombre.substring(0, maxProductLength - 3) + '...'
                        : lote.producto_nombre;

                    doc.text(productName, margin, y);
                    doc.text(lote.numero_lote, 90, y);
                    doc.text(fechaVencimiento, 120, y);
                    doc.text(lote.cantidad_actual.toString(), 160, y);
                    doc.text(estadoText, 190, y);

                    y += 6;
                });
            }

            // Descargar PDF
            doc.save('reporte_comercio.pdf');

            // Abrir Gmail
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent('Reporte de Estado del Comercio')}&body=${encodeURIComponent('Adjunto el reporte del estado del comercio.')}`;
            window.open(gmailUrl, '_blank');

            showAlert('Reporte generado y Gmail abierto. Adjunte el PDF descargado al email.', 'success');

        } catch (error) {
            console.error('Error generando reporte:', error);
            showAlert('Error al generar el reporte: ' + error.message, 'error');
        }
    }

    // Event listeners para filtros de ventas
    document.getElementById('filter-sales-btn').addEventListener('click', filterSales);
    document.getElementById('clear-filter-btn').addEventListener('click', clearSalesFilter);
    document.getElementById('today-sales-btn').addEventListener('click', showTodaySales);

    // Permitir filtrar con Enter en los campos de fecha
    document.getElementById('sales-date').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });
    document.getElementById('sales-start-date').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });
    document.getElementById('sales-end-date').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });

    // Event listeners para dropdowns de acciones
    document.getElementById('dataActionSelect').addEventListener('change', function() {
        const btn = document.getElementById('executeDataActionBtn');
        btn.disabled = !this.value;
    });

    document.getElementById('systemActionSelect').addEventListener('change', function() {
        const btn = document.getElementById('executeSystemActionBtn');
        btn.disabled = !this.value;
    });

    // Event listeners para filtros de lotes
    document.getElementById('filter-lotes-btn').addEventListener('click', filterLotes);
    document.getElementById('clear-lote-filter-btn').addEventListener('click', clearLoteFilter);

    // Función para mostrar/ocultar el selector de iconos
    function initializeIconSelector() {
        const iconSelectorBtn = document.getElementById('iconSelectorBtn');
        const iconDropdown = document.getElementById('iconDropdown');
        const selectedIconDisplay = document.getElementById('selectedIconDisplay');
        const selectedPromotionIcon = document.getElementById('selectedPromotionIcon');

        if (iconSelectorBtn && iconDropdown) {
            // Toggle dropdown visibility
            iconSelectorBtn.addEventListener('click', function(e) {
                e.preventDefault();
                iconDropdown.style.display = iconDropdown.style.display === 'none' ? 'block' : 'none';
            });

            // Handle icon selection
            document.querySelectorAll('.icon-option').forEach(button => {
                button.addEventListener('click', function() {
                    const selectedIcon = this.getAttribute('data-icon');
                    selectedIconDisplay.textContent = selectedIcon;
                    selectedPromotionIcon.value = selectedIcon;
                    iconDropdown.style.display = 'none';
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!iconSelectorBtn.contains(e.target) && !iconDropdown.contains(e.target)) {
                    iconDropdown.style.display = 'none';
                }
            });
        }
    }

    // Función para verificar cierres pendientes
    async function checkPendingClosures() {
        try {
            const response = await fetch('/api/check-pending-closures');
            const data = await response.json();

            const alertDiv = document.getElementById('pendingClosuresAlert');
            const messageDiv = document.getElementById('pendingClosuresMessage');

            if (data.pending_days > 0) {
                messageDiv.textContent = data.message;
                alertDiv.style.display = 'block';

                // Auto-hide after 30 seconds
                setTimeout(() => {
                    if (alertDiv.style.display !== 'none') {
                        dismissPendingAlert();
                    }
                }, 30000);
            } else {
                alertDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error verificando cierres pendientes:', error);
        }
    }

    // Función para descartar alerta de cierres pendientes
    function dismissPendingAlert() {
        document.getElementById('pendingClosuresAlert').style.display = 'none';
    }

    // Función para mostrar modal de cierre retroactivo
    function showRetroactiveClosure() {
        document.getElementById('retroactiveClosureModal').style.display = 'flex';
        document.getElementById('retroFecha').value = '';
        document.getElementById('retroDineroInicial').value = '';
    }

    // Función para cerrar modal de cierre retroactivo
    function closeRetroactiveModal() {
        document.getElementById('retroactiveClosureModal').style.display = 'none';
    }

    // Función para calcular cierre retroactivo
    async function calculateRetroactiveClosure() {
        const fecha = document.getElementById('retroFecha').value;
        const dineroInicial = document.getElementById('retroDineroInicial').value;

        if (!fecha || !dineroInicial) {
            showAlert('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            const response = await fetch('/api/close-register-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:pos123')
                },
                body: JSON.stringify({
                    fechaEspecifica: fecha,
                    dineroInicial: parseFloat(dineroInicial)
                })
            });

            const data = await response.json();

            if (data.existing_close) {
                showAlert('Ya existe un cierre para esta fecha', 'error');
                return;
            }

            if (data.error) {
                showAlert(data.error, 'error');
                return;
            }

            // Mostrar modal de cierre con los datos calculados
            closeRetroactiveModal();
            showCierreModal();

            // Llenar los campos con los datos calculados
            document.getElementById('cierreDineroInicial').value = data.dinero_inicial;
            document.getElementById('cierreFechaEspecifica').value = data.fecha_cierre;

            // Mostrar resultados
            showCierreResults(data);

        } catch (error) {
            console.error('Error calculando cierre retroactivo:', error);
            showAlert('Error al calcular cierre retroactivo', 'error');
        }
    }

    // ============================================
    // EXPORTAR FUNCIONES DE CIERRE DE CAJA A WINDOW
    // ============================================
    window.loadCierres = loadCierres;
    window.handleCierreSelection = handleCierreSelection;
    window.showCierreDetails = showCierreDetails;
    window.checkPendingClosures = checkPendingClosures;
    window.dismissPendingAlert = dismissPendingAlert;
    window.showRetroactiveClosure = showRetroactiveClosure;
    window.closeRetroactiveModal = closeRetroactiveModal;
    window.calculateRetroactiveClosure = calculateRetroactiveClosure;
    console.log('✅ Funciones de cierre de caja exportadas a window');

    // Función para mostrar modal de reset selectivo
    function showResetModal() {
        const modalContent = `
            <div class="edit-form" style="max-width: 600px;">
                <h3 style="margin-bottom: 20px; color: #d32f2f;">🗑️ Resetear Datos Selectivamente</h3>
                <p style="margin-bottom: 20px; color: #666; font-size: 14px;">
                    Selecciona qué datos deseas eliminar. Esta acción no se puede deshacer.
                </p>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Seleccionar datos a resetear:</label>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #1976d2;">
                                <input type="checkbox" id="resetVentas" style="margin-right: 10px; transform: scale(1.2);">
                                📊 Ventas y Facturas
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todas las ventas, items de venta y facturas
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #ff9800;">
                                <input type="checkbox" id="resetCierres" style="margin-right: 10px; transform: scale(1.2);">
                                💰 Cierres de Caja
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todos los registros de cierres de caja
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #9c27b0;">
                                <input type="checkbox" id="resetProveedores" style="margin-right: 10px; transform: scale(1.2);">
                                🏢 Proveedores
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todos los proveedores
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #ff5722;">
                                <input type="checkbox" id="resetPedidos" style="margin-right: 10px; transform: scale(1.2);">
                                📋 Pedidos a Proveedores
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todos los pedidos a proveedores
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #4caf50;">
                                <input type="checkbox" id="resetPromociones" style="margin-right: 10px; transform: scale(1.2);">
                                🎯 Promociones
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todas las promociones activas
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #607d8b;">
                                <input type="checkbox" id="resetLog" style="margin-right: 10px; transform: scale(1.2);">
                                📝 Registro de Operaciones
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina el historial completo de operaciones
                            </p>
                        </div>

                        <div style="border: 2px solid #030303; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; color: #795548;">
                                <input type="checkbox" id="resetLotes" style="margin-right: 10px; transform: scale(1.2);">
                                📦 Lotes
                            </label>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                Elimina todos los lotes (productos permanecen)
                            </p>
                        </div>
                    </div>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                    <strong style="color: #856404;">⚠️ Advertencia:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #856404;">
                        Los productos y configuraciones del sistema permanecerán intactos. Esta acción no se puede deshacer.
                    </p>
                </div>

                <div class="button-group">
                    <button type="button" class="btn btn-secondary" onclick="closeResetModal()">Cancelar</button>
                    <button type="button" class="btn" style="background: #d32f2f; color: white;" onclick="executeSelectiveReset()">
                        🗑️ Ejecutar Reset
                    </button>
                </div>
            </div>
        `;

        const modal = createModal('edit-modal', modalContent);

        // Función para cerrar modal
        window.closeResetModal = function() {
            modal.remove();
        };

        // Función para ejecutar reset selectivo
        window.executeSelectiveReset = async function() {
            const selectedResets = {
                resetVentas: document.getElementById('resetVentas').checked,
                resetCierres: document.getElementById('resetCierres').checked,
                resetProveedores: document.getElementById('resetProveedores').checked,
                resetPedidos: document.getElementById('resetPedidos').checked,
                resetPromociones: document.getElementById('resetPromociones').checked,
                resetLog: document.getElementById('resetLog').checked,
                resetLotes: document.getElementById('resetLotes').checked
            };

            // Verificar que al menos una opción esté seleccionada
            const hasSelection = Object.values(selectedResets).some(checked => checked);
            if (!hasSelection) {
                showAlert('Debes seleccionar al menos una opción para resetear', 'error');
                return;
            }

            // Confirmación adicional
            const selectedItems = Object.entries(selectedResets)
                .filter(([key, checked]) => checked)
                .map(([key, checked]) => {
                    const labels = {
                        resetVentas: 'Ventas y Facturas',
                        resetCierres: 'Cierres de Caja',
                        resetProveedores: 'Proveedores',
                        resetPedidos: 'Pedidos a Proveedores',
                        resetPromociones: 'Promociones',
                        resetLog: 'Registro de Operaciones',
                        resetLotes: 'Lotes'
                    };
                    return labels[key];
                });

            const confirmMessage = `¿Estás seguro de que deseas resetear los siguientes datos?\n\n${selectedItems.join('\n')}\n\nEsta acción no se puede deshacer.`;

            if (!confirm(confirmMessage)) {
                return;
            }

            try {
                showAlert('Ejecutando reset selectivo...', 'info');

                const response = await fetch('/api/reset-data-selective', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + btoa('admin:pos123')
                    },
                    body: JSON.stringify(selectedResets)
                });

                const result = await response.json();

                if (result.success) {
                    showAlert(result.message, 'success');
                    closeResetModal();

                    // Recargar datos si es necesario
                    if (selectedResets.resetVentas || selectedResets.resetCierres || selectedResets.resetProveedores) {
                        setTimeout(() => {
                            fetchAndDisplayData();
                        }, 1000);
                    }
                } else {
                    showAlert('Error: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Error ejecutando reset selectivo:', error);
                showAlert('Error al ejecutar el reset selectivo', 'error');
            }
        };
    }

    // Función para abrir escáner de códigos de barras para agregar producto
    function openBarcodeScannerForAddProduct() {
        // Abrir la página del escáner en una nueva ventana
        const scannerWindow = window.open('barcode-scanner.html', 'barcodeScanner', 'width=800,height=600,scrollbars=yes,resizable=yes');

        // Escuchar mensajes desde la ventana del escáner
        window.addEventListener('message', function handleBarcodeMessage(event) {
            // Verificar que el mensaje viene de la ventana del escáner
            if (event.source === scannerWindow) {
                const barcode = event.data.barcode;
                if (barcode) {
                    // Llenar el campo de código de barras
                    document.getElementById('addBarcode').value = barcode;
                    // Cerrar la ventana del escáner
                    scannerWindow.close();
                    // Remover el listener
                    window.removeEventListener('message', handleBarcodeMessage);
                }
            }
        });
    }

    // Función para abrir escáner de códigos de barras para lote
    function openBarcodeScannerForLote() {
        // Abrir la página del escáner en una nueva ventana
        const scannerWindow = window.open('barcode-scanner.html', 'barcodeScannerLote', 'width=800,height=600,scrollbars=yes,resizable=yes');

        // Escuchar mensajes desde la ventana del escáner
        window.addEventListener('message', function handleBarcodeMessage(event) {
            // Verificar que el mensaje viene de la ventana del escáner
            if (event.source === scannerWindow) {
                const barcode = event.data.barcode;
                if (barcode) {
                    // Llenar el campo de código de barras del lote
                    document.getElementById('loteBarcode').value = barcode;
                    // Cerrar la ventana del escáner
                    scannerWindow.close();
                    // Remover el listener
                    window.removeEventListener('message', handleBarcodeMessage);
                }
            }
        });
    }

    // Función para abrir escáner de códigos de barras para editar producto
    function openBarcodeScannerForEditProduct() {
        // Abrir la página del escáner en una nueva ventana
        const scannerWindow = window.open('barcode-scanner.html', 'barcodeScannerEditProduct', 'width=800,height=600,scrollbars=yes,resizable=yes');

        // Escuchar mensajes desde la ventana del escáner
        window.addEventListener('message', function handleBarcodeMessage(event) {
            // Verificar que el mensaje viene de la ventana del escáner
            if (event.source === scannerWindow) {
                const barcode = event.data.barcode;
                if (barcode) {
                    // Llenar el campo de código de barras del producto en edición
                    document.getElementById('editBarcode').value = barcode;
                    // Cerrar la ventana del escáner
                    scannerWindow.close();
                    // Remover el listener
                    window.removeEventListener('message', handleBarcodeMessage);
                }
            }
        });
    }

    // Función para escanear código de barras para lote (alias de la anterior por compatibilidad)
    function scanBarcodeForLote() {
        openBarcodeScannerForLote();
    }

    // Función para abrir escáner de códigos de barras para editar lote
    function openBarcodeScannerForEditLote() {
        // Abrir la página del escáner en una nueva ventana
        const scannerWindow = window.open('barcode-scanner.html', 'barcodeScannerEditLote', 'width=800,height=600,scrollbars=yes,resizable=yes');

        // Escuchar mensajes desde la ventana del escáner
        window.addEventListener('message', function handleBarcodeMessage(event) {
            // Verificar que el mensaje viene de la ventana del escáner
            if (event.source === scannerWindow) {
                const barcode = event.data.barcode;
                if (barcode) {
                    // Llenar el campo de código de barras del lote en edición
                    document.getElementById('editLoteBarcode').value = barcode;
                    // Cerrar la ventana del escáner
                    scannerWindow.close();
                    // Remover el listener
                    window.removeEventListener('message', handleBarcodeMessage);
                }
            }
        });
    }

    // Función para escanear código de barras para editar lote
    function scanBarcodeForEditLote() {
        openBarcodeScannerForEditLote();
    }

    // Función para mostrar/ocultar la tabla de proveedores
    function toggleProveedoresTable() {
        const table = document.getElementById('proveedores-table');
        const loading = document.querySelector('#proveedores-section .loading');

        if (table && loading) {
            if (table.style.display === 'none' || table.style.display === '') {
                // Mostrar tabla
                table.style.display = 'table';
                loading.style.display = 'none';
            } else {
                // Ocultar tabla
                table.style.display = 'none';
                loading.textContent = 'Tabla oculta. Haz clic en "Mostrar/Ocultar Tabla" para mostrarla.';
                loading.style.display = 'block';
            }
        }
    }




    // Función para verificar el hash de la URL y expandir la sección correspondiente
    function checkUrlHashForSection() {
        const hash = window.location.hash.substring(1); // Remover el '#'
        if (hash) {
            const sectionElement = document.getElementById(hash);
            if (sectionElement && sectionElement.classList.contains('dashboard-section')) {
                // Expandir la sección
                sectionElement.classList.remove('collapsed');
                // Scroll hacia la sección
                sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadAuthFromStorage();
        if (checkDashboardAccess()) {
            loadLicenseStatus(); // Cargar estado de licencia
            fetchAndDisplayData().then(() => {
                // Inicializar el texto del botón de ordenamiento
                updateSortButtonText();

                // Cargar productos para el filtro de lotes
                loadProductsForLoteFilter();

                // Verificar si hay un hash en la URL para expandir una sección específica
                checkUrlHashForSection();
            });

            // Función para cargar productos para el filtro de lotes
            async function loadProductsForLoteFilter() {
                try {
                    const products = await window.ApiClient.apiRequest('/products');
                    const select = document.getElementById('lote-filter');
                    if (select) {
                        select.innerHTML = '<option value="">Todos los productos</option>';
                        products.forEach(product => {
                            select.innerHTML += `<option value="${product.id}">${product.nombre} (${product.codigo}) [${product.codigo_barras || 'Sin código'}]</option>`;
                        });
                    }
                } catch (error) {
                    console.error('Error cargando productos para filtro de lotes:', error);
                }
            }
        }

        // Inicializar selector de iconos
        initializeIconSelector();

        // Agregar event listener para verificar lote en tiempo real
        const loteNumeroInput = document.getElementById('loteNumero');
        if (loteNumeroInput) {
            loteNumeroInput.addEventListener('input', checkLoteAvailability);
            loteNumeroInput.addEventListener('blur', checkLoteAvailability);
        }

        // El botón closeRegisterBtn usa onclick="openCierreModal()" en el HTML
        // No necesitamos registrar un event listener adicional que bloquee el comportamiento
        const closeRegisterBtn = document.getElementById('closeRegisterBtn');
        if (closeRegisterBtn) {
            console.log('✅ Botón closeRegisterBtn encontrado - usa onclick del HTML');
        } else {
            console.error('❌ Botón closeRegisterBtn NO encontrado');
        }
    });
}
