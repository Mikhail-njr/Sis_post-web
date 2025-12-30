# Sistema POS - Prototipo 2025

🛒 **Sistema de Punto de Venta (POS) Web** - Versión limpia y organizada para producción

## 📋 Tabla de Contenidos
- [Descripción](#descripción)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Características](#características)
- [Endpoints API](#endpoints-api)
- [Autores](#autores)

## 🎯 Descripción

Sistema POS es una aplicación web completa de punto de venta diseñada para comercios minoristas y supermercados. Ofrece una interfaz intuitiva y rápida para la gestión de ventas, productos, clientes y reportes.

### Características Principales
- **Interfaz Web Moderna**: Dashboard limpio y responsive
- **Gestión de Productos**: Búsqueda avanzada, categorías, stock
- **Sistema de Ventas**: Carrito, métodos de pago, facturación
- **Clientes y Cuentas Corrientes**: Gestión de clientes y deudas
- **Reportes**: Estadísticas de ventas y rentabilidad
- **Escáner de Códigos de Barras**: Soporte para escáneres USB y móviles

## 📁 Estructura del Proyecto

```
Post_2025/
├── frontend/              # Interfaz web del POS
│   ├── index.html        # Página principal del dashboard
│   ├── script.js         # Lógica frontend principal
│   ├── style.css         # Estilos CSS
│   ├── utils.js          # Utilidades frontend
│   ├── barcode-scanner.html  # Escáner de códigos de barras
│   └── barcode-scanner.js    # Lógica de escaneo
├── backend/               # Servidor API
│   ├── server.js         # Servidor Express principal
│   ├── database-sqlite.js    # Conexión a base de datos
│   ├── database-utils.js     # Utilidades de base de datos
│   ├── pos_database.sqlite   # Base de datos SQLite
│   └── package.json      # Dependencias del backend
├── shared/                # Código compartido
│   ├── api-client.js     # Cliente API para frontend
│   └── auth.js           # Sistema de autenticación
└── README.md             # Documentación
├── installer/            # Scripts de instalación y configuración
│   ├── install-vscode-extension.bat  # Instalar extensión VS Code
│   ├── integrate-code-analysis.bat   # Integrar análisis de código
│   ├── run_test_from_anywhere.bat    # Ejecutar tests de lotes
│   └── setup_qdrant.bat              # Configurar Qdrant (Docker)
```

## 🚀 Scripts de Instalación

### 📦 Instalación Rápida del Entorno de Desarrollo
Para configurar el entorno de desarrollo completo con análisis de código:

```bash
# Configurar Qdrant (requiere Docker)
installer\setup_qdrant.bat

# Integrar análisis de código
installer\integrate-code-analysis.bat

# Instalar extensión VS Code
installer\install-vscode-extension.bat
```

### 🧪 Pruebas de Control de Stock
Ejecutar pruebas automatizadas para validar el control de stock:

```bash
installer\run_test_from_anywhere.bat
```

### 🚀 Inicio Rápido del Sistema
Para iniciar el sistema POS completo con servidor y ngrok:

```bash
installer\run.bat
```

Este script:
- Inicia el servidor backend en una ventana
- Configura y ejecuta ngrok para acceso remoto
- Ofrece opciones para abrir el navegador
- Muestra las credenciales de acceso

## 🔧 Requisitos

- **Node.js** v14 o superior
- **npm** o **yarn**

## 🚀 Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   # Si estás clonando desde un repositorio
   git clone <url-del-repositorio>
   cd Post_2025
   ```

2. **Instalar dependencias del backend**
   ```bash
   cd backend
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   # Desde la carpeta backend
   node server.js
   ```

4. **Acceder al sistema**
   - Abre tu navegador y ve a: `http://localhost:3000`

## 💡 Uso

### Inicio Rápido
1. **Accede al dashboard**: `http://localhost:3000/index.html`
2. **Busca productos**: Usa el buscador con filtros por nombre, código o ID
3. **Agrega al carrito**: Selecciona productos y añádelos al carrito
4. **Procesa la venta**: Elige el método de pago y confirma
5. **Imprime factura**: Genera y/o imprime la factura de la venta

### Métodos de Pago Soportados
- 💵 Efectivo
- 📲 Transferencia bancaria
- 💳 Débito
- 💳 Crédito
- 💰 Cuenta Corriente (con gestión de deudas)

### Escáner de Códigos de Barras
- **Escáner USB**: Conecta y comienza a escanear
- **Escáner Móvil**: Accede a `barcode-scanner.html` desde tu móvil

## ⚙️ Configuración

### Variables de Entorno
El sistema utiliza autenticación básica. Las credenciales por defecto son:
- **Usuario**: `admin`
- **Contraseña**: `pos123`

### Base de Datos
- **Motor**: SQLite (no requiere instalación adicional)
- **Ubicación**: `backend/pos_database.sqlite`
- **Contenido**: Productos, clientes, ventas, deudas, proveedores, etc.

## 📊 Endpoints API Principales

### Productos
- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear nuevo producto
- `PUT /api/products/:id` - Actualizar producto
- `GET /api/products/search` - Buscar productos con filtros

### Ventas
- `POST /api/sales` - Registrar nueva venta
- `GET /api/sales` - Listar ventas (con paginación)
- `POST /api/sales/cuenta-corriente` - Venta a cuenta corriente

### Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Crear cliente
- `PUT /api/customers/:id` - Actualizar cliente
- `DELETE /api/customers/:id` - Eliminar cliente

### Deudas
- `GET /api/debts` - Listar deudas
- `POST /api/debts` - Crear deuda
- `POST /api/debts/:id/payment` - Registrar pago

### Proveedores y Pedidos
- `GET /api/suppliers` - Listar proveedores
- `GET /api/supplier-orders` - Listar pedidos a proveedores

## 🛠️ Desarrollo

### Estructura de la Base de Datos
El sistema utiliza SQLite con las siguientes tablas principales:
- **productos**: Catálogo de productos
- **ventas**: Registro de ventas
- **clientes**: Gestión de clientes
- **deudas**: Control de cuentas corrientes
- **proveedores**: Proveedores registrados
- **pedidos_proveedores**: Pedidos a proveedores
- **lotes**: Control de inventario por lotes

### Personalización
- **Frontend**: Modifica `frontend/style.css` para cambiar estilos
- **Backend**: Edita `backend/server.js` para añadir funcionalidades
- **Base de datos**: Usa `backend/pos_database.sqlite` para consultas directas

## 📈 Reportes

El sistema incluye reportes de:
- **Rentabilidad por productos**: Margen de ganancia, costos, precios
- **Estadísticas de ventas**: Totales, productos más vendidos
- **Control de stock**: Inventario por productos y lotes

## 🔐 Seguridad

- **Autenticación**: Sistema de login básico
- **Validación**: Validación de datos en frontend y backend
- **Base de datos**: SQLite con acceso restringido

## 🤝 Contribución

1. Haz un fork del proyecto
2. Crea una rama para tu feature: `git checkout -b feature/nombre-feature`
3. Haz commit de tus cambios: `git commit -m "Añade feature"`
4. Sube los cambios: `git push origin feature`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte o consultas:
- Crea un issue en el repositorio
- Contacta al equipo de desarrollo

---

**🛒 Sistema POS - Prototipo 2025**
*Potenciando tu negocio con tecnología*