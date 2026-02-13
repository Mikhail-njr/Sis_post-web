# Sistema POS - Web

Sistema de Punto de Venta (POS) web para comercios minoristas/supermercados.

## Características

- Dashboard de ventas con interfaz intuitiva
- Búsqueda avanzada de productos por nombre, código, ID y categoría
- Carrito de compras con múltiples métodos de pago
- Gestión de promociones y descuentos
- Alertas de vencimiento de productos
- Modo Plus para funcionalidades avanzadas
- Integración con escáner USB
- URL pública mediante ngrok para acceso remoto

## Estructura del Proyecto

```
Sis_post-web-backup/
├── frontend/           # Archivos del frontend (HTML, CSS, JS)
├── shared/            # Módulos compartidos entre frontend/backend
├── models/            # Modelos de ML (para análisis de productos)
├── plans/             # Documentación de planes y mejoras
├── excluded/          # Archivos y herramientas excluidas del build
└── package.json       # Dependencias del proyecto
```

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/Mikhail-njr/sis_post-web.git
```

2. Instalar dependencias:
```bash
npm install
```

3. Ejecutar el servidor:
```bash
npm start
```

## Uso

Abrir `http://localhost:3000/index.html` en el navegador.

## Tecnologías

- HTML5/CSS3/JavaScript
- Node.js (backend)
- SQLite (base de datos)
- ONNX Runtime (modelos de ML)

## Licencia

Este proyecto es privado.
