# 📊 Dashboard de Indexación Local

Interfaz web para gestionar y monitorear el sistema de indexación local del proyecto POS.

## 🚀 Inicio Rápido

### Opción 1: Script de Inicio Automático
```bash
cd code-analysis
start-dashboard.bat
```

### Opción 2: Manual
```bash
# 1. Iniciar servidor
cd code-analysis
node local-server.js

# 2. Abrir dashboard en navegador
# Abrir: http://localhost:3001/api
# Abrir: indexer-dashboard.html
```

## 🎯 Funcionalidades

### ⚙️ Comandos de Indexación
- **📊 Indexar Codebase**: Indexa todos los archivos del proyecto (JS, JSON, HTML, CSS, SQL, MD, etc.)
- **🗑️ Limpiar Índice**: Elimina todo el índice actual y optimiza la base de datos
- **🔄 Limpiar y Reindexar**: Realiza una limpieza completa seguida de una indexación completa
- **📈 Ver Estadísticas**: Muestra métricas en tiempo real del proyecto
- **🏥 Verificar Salud**: Comprueba el estado del servidor y la conexión

### 🔍 Búsqueda de Código
- **Búsqueda semántica**: Busca código similar usando palabras clave
- **Resultados en tiempo real**: Visualiza coincidencias instantáneamente
- **Información detallada**: Muestra score, complejidad, coincidencias y vista previa
- **Copiar rutas**: Facilita la navegación al código encontrado

### 📊 Estadísticas en Tiempo Real
- **Archivos indexados**: Cantidad total de archivos procesados
- **Palabras indexadas**: Total de palabras y palabras únicas
- **Tamaño del proyecto**: Tamaño total del código indexado
- **Tamaño de la base de datos**: Espacio ocupado por el índice

## 🖥️ Interfaz de Usuario

### Dashboard Principal
- **Estado del servidor**: Indicador visual del estado del servidor
- **Estadísticas resumidas**: Tarjetas con métricas clave
- **Controles de comandos**: Botones para ejecutar operaciones
- **Área de resultados**: Visualización de salidas y logs

### Búsqueda de Código
- **Campo de búsqueda**: Input para consultas de búsqueda
- **Barra de progreso**: Indicador visual del proceso de búsqueda
- **Resultados**: Lista interactiva de coincidencias
- **Detalles**: Información completa de cada resultado

## 📋 Comandos Disponibles

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `index` | Indexar codebase completo | `node local-indexer.js --index` |
| `clear` | Limpiar índice completo | `node local-indexer.js --clear` |
| `clear-and-index` | Limpiar y reindexar | `node local-indexer.js --clear && node local-indexer.js --index` |
| `stats` | Obtener estadísticas | Consulta API `/api/stats` |
| `health` | Verificar estado | Consulta API `/api/health` |

## 🔧 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/command` | POST | Ejecutar comandos de indexación |
| `/api/search/similar` | POST | Buscar código similar |
| `/api/stats` | GET | Obtener estadísticas |
| `/api/health` | GET | Verificar salud del servidor |
| `/api/analyze/complexity` | POST | Analizar complejidad de código |

## 🎨 Personalización

### Estilos
El dashboard utiliza CSS moderno con variables CSS para fácil personalización:
```css
:root {
    --primary: #007bff;      /* Color principal */
    --success: #28a745;      /* Éxito */
    --danger: #dc3545;       /* Error */
    --warning: #ffc107;      /* Advertencia */
    --info: #17a2b8;         /* Información */
    --dark: #343a40;         /* Texto oscuro */
    --light: #f8f9fa;        /* Fondo claro */
}
```

### Funcionalidades
Puedes extender el dashboard añadiendo:
- Nuevos comandos en el backend
- Más estadísticas en el frontend
- Filtros avanzados de búsqueda
- Exportación de resultados

## 🐛 Solución de Problemas

### Servidor no responde
1. Verifica que Node.js esté instalado: `node --version`
2. Asegúrate de que el puerto 3001 esté libre
3. Revisa los logs del servidor en la terminal

### Dashboard no carga
1. Verifica que el servidor esté activo
2. Comprueba la conexión a http://localhost:3001/api
3. Abre la consola del navegador para ver errores

### Búsqueda lenta
1. El primer uso puede ser más lento mientras se carga el índice
2. Verifica que el índice esté actualizado
3. Considera indexar solo archivos relevantes

## 📁 Estructura de Archivos

```
code-analysis/
├── indexer-dashboard.html    # Interfaz web principal
├── command-runner.js         # Script de ejecución de comandos
├── start-dashboard.bat       # Script de inicio automático
├── local-server.js          # Servidor API
├── local-indexer.js         # Motor de indexación
└── DASHBOARD_README.md      # Documentación (este archivo)
```

## 🤝 Contribución

Para contribuir al dashboard:
1. Clona el proyecto
2. Realiza tus cambios
3. Prueba en el entorno local
4. Documenta los cambios

## 📄 Licencia

Este dashboard es parte del proyecto POS y sigue la misma licencia.