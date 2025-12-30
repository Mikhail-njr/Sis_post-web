Perfecto, aquí tienes la lista completa de endpoints que utiliza el Sistema POS y qué hacen:

📋 Lista Completa de Endpoints del Sistema POS
🔗 Endpoints Principales por Funcionalidad
1. Clientes (11 endpoints)
GET /api/clientes - Listar clientes con paginación, búsqueda y deudas
POST /api/clientes - Crear nuevo cliente (con validación de duplicados)
PUT /api/clientes/:id - Actualizar cliente existente
DELETE /api/clientes/:id - Eliminar cliente (con manejo de relaciones)
GET /api/clientes/search - Búsqueda avanzada de clientes
GET /api/clientes/cuenta-corriente - Clientes con deudas pendientes
GET/POST/PUT/DELETE /api/customers → Redirigidos a /api/clientes
2. Productos (8 endpoints)
GET /api/products - Listar productos con promociones, stock y vencimientos
POST /api/products - Crear nuevo producto (con generación de código automático)
PUT /api/products/:id - Actualizar producto existente
GET /api/products/:id - Obtener producto por ID
GET /api/products/search - Búsqueda avanzada (por nombre, código, ID)
GET /api/products/with-discounts - Productos con descuentos activos
GET /api/categories - Listar categorías de productos
3. Ventas (4 endpoints)
GET /api/sales - Listar ventas con filtros por fecha y métodos de pago
POST /api/sales - Crear nueva venta al contado
POST /api/ventas/cuenta-corriente - Crear venta a cuenta corriente
GET /api/debug-sales - Ruta de diagnóstico para ventas
4. Deudas (11 endpoints)
GET /api/debts - Listar deudas con filtros por cliente y estado
POST /api/debts - Crear nueva deuda
POST /api/debts/:id/payment - Registrar pago de deuda
GET /api/debts/:id/payments - Historial de pagos de una deuda
GET /api/debts/:id/calcular-total - Calcular total actual de deuda
GET /api/debts-with-current-total - Deudas con cálculo de total actual
POST /api/debts/update-prices - Actualizar precios de deudas (optimizado)
POST /api/debts/update-prices-selective - Actualización selectiva de precios
GET /api/debts/diagnostics - Diagnóstico de deudas (detectar problemas)
POST /api/debts/fix-missing-products - Corregir deudas sin productos asociados
GET /api/debts/validate-consistency - Validar consistencia de deudas
5. Proveedores (5 endpoints)
GET /api/suppliers - Listar proveedores
POST /api/suppliers - Crear nuevo proveedor
GET /api/suppliers/:id - Obtener proveedor por ID
PUT /api/suppliers/:id - Actualizar proveedor
DELETE /api/suppliers/:id - Eliminar proveedor
6. Lotes (5 endpoints)
GET /api/batches - Listar lotes con estado de vencimiento
POST /api/batches - Crear nuevo lote
GET /api/batches/:id - Obtener lote por ID
PUT /api/batches/:id - Actualizar lote
DELETE /api/batches/:id - Eliminar lote
7. Cierres de Caja (4 endpoints)
GET /api/closures - Listar cierres de caja
POST /api/closures - Crear nuevo cierre de caja
GET /api/closures/:id - Obtener cierre por ID
POST /api/close-register-preview - Calcular cierre de caja (preview)
8. Promociones (5 endpoints)
GET /api/promotions - Listar promociones
POST /api/promotions - Crear nueva promoción
GET /api/promotions/:id - Obtener promoción por ID
PUT /api/promotions/:id - Actualizar promoción
DELETE /api/promotions/:id - Eliminar promoción
9. Métricas y Estadísticas (3 endpoints)
GET /api/stats - Estadísticas generales (productos, ventas, ingresos, top productos)
GET /api/operations-log - Registro de operaciones del sistema
DELETE /api/operations-log - Limpiar registro de operaciones
10. Configuración y Licencias (5 endpoints)
GET /api/license-status - Estado de la licencia (activa, expiración, días restantes)
POST /api/activate - Activar licencia con clave
POST /api/deactivate-license - Desactivar licencia
GET /api/can-generate-reports - Verificar si se pueden generar reportes
GET /api/settings/logging-enabled - Configuración de logging
PUT /api/settings/logging-enabled - Actualizar configuración de logging
11. Autenticación (2 endpoints)
GET /api/test-auth - Test de autenticación (requiere credenciales)
GET /api/auth-test - Test de autenticación (alternativo)
12. Salud del Sistema (1 endpoint)
GET /api/health - Health check del sistema (estado, uptime, versión)
13. Activación del Sistema (2 endpoints)
GET /activate - Página de activación del sistema
POST /api/activate - Activar licencia (duplicado, ver sección 10)
🎯 Resumen Estadístico
Total de Endpoints: 71
Clientes: 11 endpoints
Productos: 8 endpoints
Ventas: 4 endpoints
Deudas: 11 endpoints
Proveedores: 5 endpoints
Lotes: 5 endpoints
Cierres: 4 endpoints
Promociones: 5 endpoints
Métricas: 3 endpoints
Configuración: 5 endpoints
Autenticación: 2 endpoints
Salud: 1 endpoint
Activación: 2 endpoints
📊 Endpoints Más Utilizados
Frontend (Dashboard)
/api/products - Listar productos para el POS
/api/sales - Listar últimas ventas
/api/debts - Listar deudas pendientes
/api/clients - Listar clientes
/api/stats - Estadísticas generales
Frontend (POS)
/api/products/search - Buscar productos
/api/sales - Ver historial de ventas
/api/clients/cuenta-corriente - Clientes con deudas
/api/ventas/cuenta-corriente - Crear ventas a cuenta corriente
Backend (Administración)
/api/debts/update-prices - Actualizar precios de deudas
/api/operations-log - Ver registro de operaciones
/api/license-status - Verificar licencia
🔗 Flujos Principales del Sistema
Flujo de Venta
/api/products/search → Buscar productos
/api/sales → Crear venta
/api/debts → Crear deuda (si es a cuenta corriente)
Gestión de Clientes
/api/clients → Listar clientes
/api/clients/cuenta-corriente → Clientes con deudas
/api/debts → Ver deudas específicas
/api/debts/:id/payment → Registrar pagos
Gestión de Inventario
/api/products → Listar productos
/api/batches → Ver lotes y vencimientos
/api/promotions → Gestionar promociones
⚠️ Consideraciones Importantes
Autenticación
La mayoría de los endpoints de escritura requieren autenticación básica (admin/pos123)
Algunos endpoints están protegidos solo para operaciones de escritura
Las lecturas generalmente no requieren autenticación
Compatibilidad
Los endpoints en español (/api/clientes) son los oficiales
Los endpoints en inglés (/api/customers) son redirigidos automáticamente
Se mantiene backward compatibility total
Performance
Algunos endpoints están optimizados con índices (productos, ventas, lotes)
Endpoints de búsqueda utilizan FTS5 para mejor rendimiento
Endpoints de actualización masiva están optimizados para evitar bloqueos
Esta lista completa te da una visión general de todas las funcionalidades del Sistema POS a través de sus endpoints REST API. ¿Te gustaría que profundice en algún endpoint específico o en cómo se relacionan entre sí?
