# Sistema POS Electron

Este proyecto es una conversión del Sistema POS web a una aplicación de escritorio usando Electron.

## Estructura del Proyecto

```
sistema-Pos-Electron/
├── main.js              # Proceso principal de Electron
├── package.json         # Configuración del proyecto
├── frontend/            # Archivos del frontend
│   ├── index.html
│   ├── dashboard.html
│   ├── activate.html
│   ├── script.js
│   ├── style.css
│   └── fondo_almacen2.jpg
└── sysdata.dat          # Archivo de códigos de activación
```

## Instalación

1. Instalar dependencias:
```bash
npm install
```

## Ejecución

Para ejecutar la aplicación:
```bash
npm start
```

## Funcionalidades

- **Sistema POS completo**: Gestión de productos, ventas, inventario
- **Dashboard administrativo**: Panel de control con métricas y gestión
- **Sistema de licencias**: Activación con códigos de 6 dígitos
- **Base de datos SQLite**: Almacenamiento local persistente
- **Interfaz moderna**: Diseño responsive y profesional

## Características Técnicas

- **Backend**: Express.js con SQLite
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Base de datos**: SQLite con WAL mode para mejor rendimiento
- **Autenticación**: Basic Auth para operaciones protegidas
- **Licencias**: Sistema de activación con expiración mensual

## Desarrollo

El proyecto combina el servidor Express y la aplicación Electron en un solo archivo `main.js`, iniciando el servidor automáticamente cuando se abre la aplicación.

## Empaquetado

Para crear una aplicación ejecutable:
```bash
npm run dist
```

Esto generará instaladores en la carpeta `dist/`.