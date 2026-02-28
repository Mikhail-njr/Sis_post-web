# 🚀 Guía de Demo - Sistema POS

## 📋 Descripción
Esta es una guía completa para demostrar las funcionalidades del **Sistema POS (Punto de Venta)**, un sistema integral de gestión comercial que incluye inventario, ventas, proveedores y reportes.

## 🎯 Funcionalidades Principales

### 1. **Gestión de Productos**
- ✅ Catálogo de productos con códigos únicos
- ✅ Control de stock en tiempo real
- ✅ Categorización de productos
- ✅ Alertas de productos próximos a vencer
- ✅ Gestión de lotes con fechas de vencimiento

### 2. **Sistema de Ventas**
- ✅ Interfaz intuitiva de punto de venta
- ✅ Múltiples métodos de pago (efectivo, débito, crédito, transferencia)
- ✅ Cálculo automático de vuelto
- ✅ Descuentos por producto
- ✅ Historial de ventas completo

### 3. **Gestión de Proveedores**
- ✅ Base de datos de proveedores
- ✅ Sistema de pedidos a proveedores
- ✅ Confirmación de llegada de productos
- ✅ Creación automática de lotes

### 4. **Reportes y Analytics**
- ✅ Dashboard con métricas en tiempo real
- ✅ Reportes de ventas por período
- ✅ Historial de cierres de caja
- ✅ Alertas de stock bajo y vencimientos

### 5. **Sistema de Usuarios**
- ✅ Autenticación segura
- ✅ Control de acceso basado en roles
- ✅ Gestión de sesiones

## 🚀 Inicio Rápido

### Paso 1: Configurar Datos de Demo
```bash
# Desde la carpeta raíz del proyecto
node demo_setup.js
```

### Paso 2: Iniciar el Servidor
```bash
cd backend
npm install
npm start
```

### Paso 3: Acceder al Sistema
- **Interfaz de Ventas**: http://localhost:3000
- **Panel de Control**: http://localhost:3000/dashboard.html

## 📊 Flujo de Demo Recomendado

### 1. **Configuración Inicial**
```bash
node demo_setup.js
```
Esto crea:
- 2 proveedores de ejemplo
- 5 productos con stock inicial
- 1 pedido pendiente de entrega

### 2. **Dashboard - Gestión de Inventario**
1. Accede al dashboard con usuario: `admin`, contraseña: `pos123`
2. Revisa las métricas generales
3. Ve la sección de proveedores y productos
4. Observa el pedido pendiente en "Pedidos a Proveedores"

### 3. **Confirmación de Llegada de Productos**
1. En el dashboard, ve a "Pedidos a Proveedores"
2. Haz clic en "Confirmar Entrega" del pedido `PED-1762872112736`
3. Completa los campos:
   - **Fecha de llegada**: Hoy
   - **Cantidades recibidas**: Completa según pedido
   - **Fechas de vencimiento**: Futuras (ej: +6 meses)
   - **Costos unitarios**: Según listado
4. Confirma la llegada - se crearán automáticamente los lotes

### 4. **Sistema de Ventas**
1. Ve a la interfaz principal (http://localhost:3000)
2. Inicia sesión con cualquier usuario/contraseña
3. Busca productos usando el buscador
4. Agrega productos al carrito
5. Selecciona método de pago
6. Procesa la venta

### 5. **Cierre de Caja**
1. Regresa al dashboard
2. Ve a "Operaciones del Día"
3. Ingresa dinero inicial (ej: $500)
4. Haz clic en "Cierre de Caja"
5. Revisa el resumen de ventas del día

## 📈 Características Técnicas

### Backend
- **Node.js** con Express
- **SQLite** como base de datos
- **Autenticación** básica HTTP
- **API RESTful** completa

### Frontend
- **HTML5/CSS3** responsive
- **JavaScript** vanilla (sin frameworks)
- **Interfaz moderna** con gradientes y animaciones
- **Compatible** con móviles y desktop

### Base de Datos
- **Productos** con control de stock y lotes
- **Proveedores** con información de contacto
- **Ventas** con detalle de items y pagos
- **Cierres de caja** con reportes diarios
- **Lotes** con fechas de vencimiento

## 🎨 Interfaz de Usuario

### Tema Oscuro
- Diseño moderno con tema oscuro
- Gradientes sutiles
- Animaciones suaves
- Iconos emoji para mejor UX

### Responsive Design
- Adaptable a diferentes tamaños de pantalla
- Optimizado para tablets y móviles
- Navegación intuitiva

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
# Archivo .env en /backend
PORT=3000
NODE_ENV=development
DB_PATH=./sysdata.dat
```

### Comandos Útiles
```bash
# Resetear datos
npm run reset-data

# Ejecutar tests
npm test

# Generar reportes
npm run report
```

## 📞 Soporte
- **Email**: soporte@sistema-pos.com
- **Documentación**: `/docs/README.md`
- **Issues**: Reportar en el repositorio

---

**¡El sistema está listo para demostrar todas sus capacidades!** 🎉