# 📋 Lista Completa de Endpoints del Sistema POS

## 🎯 Resumen General

Esta es la lista completa de todos los endpoints que utiliza el Sistema POS, organizados por funcionalidad y con descripción detallada de lo que hace cada uno.

---

## 🔗 **Endpoints Principales del Sistema**

### **1. Clientes (Clientes del Sistema)**

#### **Endpoints de Clientes**
- **GET** [`/api/clientes`](backend/server.js:1384) - Listar clientes con paginación, búsqueda y deudas
- **POST** [`/api/clientes`](backend/server.js:1453) - Crear nuevo cliente (con validación de duplicados)
- **PUT** [`/api/clientes/:id`](backend/server.js:1504) - Actualizar cliente existente
- **DELETE** [`/api/clientes/:id`](backend/server.js:1558) - Eliminar cliente (con manejo de relaciones)
- **GET** [`/api/clientes/search`](backend/server.js:1620) - Búsqueda avanzada de clientes
- **GET** [`/api/clientes/cuenta-corriente`](backend/server.js:1818) - Clientes con deudas pendientes

#### **Endpoints Redirigidos (Backward Compatibility)**
- **GET** [`/api/customers`](backend/server.js:1791) → [`/api/clientes`](backend/server.js:1791)
- **POST** [`/api/customers`](backend/server.js:1801) → [`/api/clientes`](backend/server.js:1801)
- **PUT** [`/api/customers/:id`](backend/server.js:1805) → [`/api/clientes/:id`](backend/server.js:1805)
- **DELETE** [`/api/customers/:id`](backend/server.js:1809) → [`/api/clientes/:id`](backend/server.js:1809)
- **GET** [`/api/customers/search`](backend/server.js:1813) → [`/api/clientes/search`](backend/server.js:1813)

---

### **2. Productos (Gestión de Inventario)**

#### **Endpoints de Productos**
- **GET** [`/api/products`](backend/server.js:2990) - Listar productos con promociones, stock y vencimientos
- **POST** [`/api/products`](backend/server.js:3039) - Crear nuevo producto (con generación de código automático)
- **PUT** [`/api/products/:id`](backend/server.js:3474) - Actualizar producto existente
- **GET** [`/api/products/:id`](backend/server.js:3442) - Obtener producto por ID
- **GET** [`/api/products/search`](backend/server.js:3275) - Búsqueda avanzada de productos (por nombre, código, ID)
- **GET** [`/api/products/with-discounts`](backend/server.js:3415) - Productos con descuentos activos
- **GET** [`/api/categories`](backend/server.js:1355) - Listar categorías de productos

---

### **3. Ventas (Operaciones de Venta)**

#### **Endpoints de Ventas**
- **GET** [`/api/sales`](backend/server.js:3165) - Listar ventas con filtros por fecha y métodos de pago
- **POST** [`/api/sales`](backend/server.js:3591) - Crear nueva venta al contado
- **POST** [`/api/ventas/cuenta-corriente`](backend/server.js:3785) - Crear venta a cuenta corriente
- **GET** [`/api/debug-sales`](backend/server.js:4046) - Ruta de diagnóstico para ventas

---

### **4. Deudas (Cuenta Corriente)**

#### **Endpoints de Deudas**
- **GET** [`/api/debts`](backend/server.js:1879) - Listar deudas con filtros por cliente y estado
- **POST** [`/api/debts`](backend/server.js:1929) - Crear nueva deuda
- **POST** [`/api/debts/:id/payment`](backend/server.js:2068) - Registrar pago de deuda
- **GET** [`/api/debts/:id/payments`](backend/server.js:2155) - Historial de pagos de una deuda
- **GET** [`/api/debts/:id/calcular-total`](backend/server.js:2188) - Calcular total actual de deuda (con precios actualizados)
- **GET** [`/api/debts-with-current-total`](backend/server.js:2260) - Deudas con cálculo de total actual
- **POST** [`/api/debts/update-prices`](backend/server.js:2348) - Actualizar precios de deudas (optimizado)
- **POST** [`/api/debts/update-prices-selective`](backend/server.js:2497) - Actualización selectiva de precios
- **GET** [`/api/debts/diagnostics`](backend/server.js:2671) - Diagnóstico de deudas (detectar problemas)
- **POST** [`/api/debts/fix-missing-products`](backend/server.js:2728) - Corregir deudas sin productos asociados
- **GET** [`/api/debts/validate-consistency`](backend/server.js:2829) - Validar consistencia de deudas

---

### **5. Proveedores (Gestión de Proveedores)**

#### **Endpoints de Proveedores**
- **GET** [`/api/suppliers`](backend/server.js:338) - Listar proveedores
- **POST** [`/api/suppliers`](backend/server.js:338) - Crear nuevo proveedor
- **GET** [`/api/suppliers/:id`](backend/server.js:338) - Obtener proveedor por ID
- **PUT** [`/api/suppliers/:id`](backend/server.js:338) - Actualizar proveedor
- **DELETE** [`/api/suppliers/:id`](backend/server.js:338) - Eliminar proveedor

---

### **6. Lotes (Gestión de Lotes y Vencimientos)**

#### **Endpoints de Lotes**
- **GET** [`/api/batches`](backend/server.js:338) - Listar lotes con estado de vencimiento
- **POST** [`/api/batches`](backend/server.js:338) - Crear nuevo lote
- **GET** [`/api/batches/:id`](backend/server.js:338) - Obtener lote por ID
- **PUT** [`/api/batches/:id`](backend/server.js:338) - Actualizar lote
- **DELETE** [`/api/batches/:id`](backend/server.js:338) - Eliminar lote

---

### **7. Cierres de Caja (Gestión Financiera)**

#### **Endpoints de Cierres**
- **GET** [`/api/closures`](backend/server.js:338) - Listar cierres de caja
- **POST** [`/api/closures`](backend/server.js:338) - Crear nuevo cierre de caja
- **GET** [`/api/closures/:id`](backend/server.js:338) - Obtener cierre por ID
- **POST** [`/api/close-register-preview`](backend/server.js:4131) - Calcular cierre de caja (preview)

---

### **8. Promociones (Descuentos y Ofertas)**

#### **Endpoints de Promociones**
- **GET** [`/api/promotions`](backend/server.js:338) - Listar promociones
- **POST** [`/api/promotions`](backend/server.js:338) - Crear nueva promoción
- **GET** [`/api/promotions/:id`](backend/server.js:338) - Obtener promoción por ID
- **PUT** [`/api/promotions/:id`](backend/server.js:338) - Actualizar promoción
- **DELETE** [`/api/promotions/:id`](backend/server.js:338) - Eliminar promoción

---

### **9. Métricas y Estadísticas**

#### **Endpoints de Métricas**
- **GET** [`/api/stats`](backend/server.js:3997) - Estadísticas generales (productos, ventas, ingresos, top productos)
- **GET** [`/api/operations-log`](backend/server.js:4030) - Registro de operaciones del sistema
- **DELETE** [`/api/operations-log`](backend/server.js:4063) - Limpiar registro de operaciones

---

### **10. Configuración y Licencias**

#### **Endpoints de Configuración**
- **GET** [`/api/license-status`](backend/server.js:2925) - Estado de la licencia (activa, expiración, días restantes)
- **POST** [`/api/activate`](backend/server.js:2909) - Activar licencia con clave
- **POST** [`/api/deactivate-license`](backend/server.js:2931) - Desactivar licencia
- **GET** [`/api/can-generate-reports`](backend/server.js:2960) - Verificar si se pueden generar reportes
- **GET** [`/api/settings/logging-enabled`](backend/server.js:4085) - Configuración de logging
- **PUT** [`/api/settings/logging-enabled`](backend/server.js:4098) - Actualizar configuración de logging

---

### **11. Autenticación**

#### **Endpoints de Autenticación**
- **GET** [`/api/test-auth`](backend/server.js:2970) - Test de autenticación (requiere credenciales)
- **GET** [`/api/auth-test`](backend/server.js:2975) - Test de autenticación (alternativo)

---

### **12. Salud del Sistema**

#### **Endpoints de Salud**
- **GET** [`/api/health`](backend/server.js:2980) - Health check del sistema (estado, uptime, versión)

---

### **13. Activación del Sistema**

#### **Endpoints de Activación**
- **GET** [`/activate`](backend/server.js:2905) - Página de activación del sistema
- **POST** [`/api/activate`](backend/server.js:2909) - Activar licencia (duplicado, ver sección 10)

---

## 📊 **Resumen por Funcionalidad**

### **Gestión de Negocio**
- **Clientes**: 6 endpoints + 5 redirecciones
- **Productos**: 8 endpoints
- **Ventas**: 4 endpoints
- **Deudas**: 11 endpoints
- **Proveedores**: 5 endpoints

### **Gestión de Inventario**
- **Lotes**: 5 endpoints
- **Promociones**: 5 endpoints

### **Gestión Financiera**
- **Cierres**: 4 endpoints
- **Métricas**: 3 endpoints

### **Configuración del Sistema**
- **Licencias**: 5 endpoints
- **Autenticación**: 2 endpoints
- **Salud**: 1 endpoint
- **Activación**: 2 endpoints

---

## 🎯 **Endpoints Más Utilizados**

### **Frontend (Dashboard)**
1. [`/api/products`](backend/server.js:2990) - Listar productos para el POS
2. [`/api/sales`](backend/server.js:3165) - Listar últimas ventas
3. [`/api/debts`](backend/server.js:1879) - Listar deudas pendientes
4. [`/api/clients`](backend/server.js:1384) - Listar clientes
5. [`/api/stats`](backend/server.js:3997) - Estadísticas generales

### **Frontend (POS)**
1. [`/api/products/search`](backend/server.js:3275) - Buscar productos
2. [`/api/sales`](backend/server.js:3165) - Ver historial de ventas
3. [`/api/clients/cuenta-corriente`](backend/server.js:1818) - Clientes con deudas
4. [`/api/ventas/cuenta-corriente`](backend/server.js:3785) - Crear ventas a cuenta corriente

### **Backend (Administración)**
1. [`/api/debts/update-prices`](backend/server.js:2348) - Actualizar precios de deudas
2. [`/api/operations-log`](backend/server.js:4030) - Ver registro de operaciones
3. [`/api/license-status`](backend/server.js:2925) - Verificar licencia

---

## 🔗 **Relaciones entre Endpoints**

### **Flujo de Venta**
1. [`/api/products/search`](backend/server.js:3275) → Buscar productos
2. [`/api/sales`](backend/server.js:3165) → Crear venta
3. [`/api/debts`](backend/server.js:1879) → Crear deuda (si es a cuenta corriente)

### **Gestión de Clientes**
1. [`/api/clients`](backend/server.js:1384) → Listar clientes
2. [`/api/clients/cuenta-corriente`](backend/server.js:1818) → Clientes con deudas
3. [`/api/debts`](backend/server.js:1879) → Ver deudas específicas
4. [`/api/debts/:id/payment`](backend/server.js:2068) → Registrar pagos

### **Gestión de Inventario**
1. [`/api/products`](backend/server.js:2990) → Listar productos
2. [`/api/batches`](backend/server.js:338) → Ver lotes y vencimientos
3. [`/api/promotions`](backend/server.js:338) → Gestionar promociones

---

## ⚠️ **Consideraciones Importantes**

### **Autenticación**
- La mayoría de los endpoints de escritura requieren autenticación básica (admin/pos123)
- Algunos endpoints están protegidos solo para operaciones de escritura
- Las lecturas generalmente no requieren autenticación

### **Compatibilidad**
- Los endpoints en español ([`/api/clientes`](backend/server.js:1384)) son los oficiales
- Los endpoints en inglés ([`/api/customers`](backend/server.js:1791)) son redirigidos automáticamente
- Se mantiene backward compatibility total

### **Performance**
- Algunos endpoints están optimizados con índices (productos, ventas, lotes)
- Endpoints de búsqueda utilizan FTS5 para mejor rendimiento
- Endpoints de actualización masiva están optimizados para evitar bloqueos

Esta lista completa te da una visión general de todas las funcionalidades del Sistema POS a través de sus endpoints REST API.