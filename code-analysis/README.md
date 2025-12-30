# 🔍 Sistema de Análisis de Código con Qdrant

Un sistema inteligente de análisis de código que utiliza Qdrant como base de datos vectorial para detectar patrones, sugerir mejoras y encontrar código similar en tu proyecto Sistema POS.

## 🚀 Características Principales

- **Análisis de Código Inteligente**: Detecta problemas, mide complejidad y sugiere mejoras
- **Búsqueda Semántica**: Encuentra código similar basado en significado, no solo texto
- **Detección de Patrones**: Identifica duplicación de código y patrones comunes
- **Embeddings Avanzados**: Utiliza modelos de transformers para comprensión contextual
- **API REST Completa**: Integración fácil con herramientas existentes
- **Soporte Multi-lenguaje**: JavaScript, TypeScript, Python, Java, SQL y más
- **Extensión VS Code**: Integración nativa con Visual Studio Code

## 📋 Requisitos del Sistema

- **Node.js** 16+ con soporte para ES6+
- **Docker** para ejecutar Qdrant
- **Visual Studio Code** (opcional, para extensión completa)
- **4GB RAM** mínimo recomendado
- **Espacio en disco**: ~2GB para modelos y datos

## 🛠️ Instalación y Configuración

### Opción 1: Instalación Completa (Recomendada)

```bash
# 1. Instalar Docker y Qdrant
setup_qdrant.bat

# 2. Integrar con el proyecto POS
integrate-code-analysis.bat

# 3. Instalar extensión de VS Code (opcional)
install-vscode-extension.bat
```

### Opción 2: Instalación Manual

#### 1. Instalar Docker y Qdrant

Ejecuta el script de instalación automática:

```bash
# En Windows
setup_qdrant.bat

# En Linux/Mac
chmod +x setup_qdrant.sh
./setup_qdrant.sh
```

Esto instalará Docker (si no está presente) y configurará Qdrant automáticamente.

#### 2. Instalar Dependencias

```bash
cd code-analysis
npm install
```

#### 3. Inicializar Colecciones

```bash
npm run init-collections
```

#### 4. Indexar el Codebase

```bash
# Indexar todo el proyecto
npm run index-codebase

# Indexar un directorio específico
npm run index-codebase ../tu-proyecto

# Limpiar y reindexar
npm run index-codebase -- --clear
```

#### 5. Extensión de VS Code (Opcional)

```bash
# Instalar extensión
install-vscode-extension.bat

# O instalar manualmente desde VS Code
# Ctrl+Shift+P -> "Extensions: Install from VSIX"
# Seleccionar: code-analysis/vscode-extension/*.vsix
```

## 🎯 Uso del Sistema

### Desde VS Code (Recomendado)

Una vez instalada la extensión, tienes acceso completo desde VS Code:

#### Comandos Disponibles:
- **Ctrl+Shift+P** → "Code Analysis: Analyze Current File"
- **Ctrl+Shift+P** → "Code Analysis: Search Similar Code"
- **Ctrl+Shift+P** → "Code Analysis: Show Suggestions"
- **Ctrl+Shift+P** → "Code Analysis: Index Workspace"

#### Uso Rápido:
1. **Análisis de Archivo**: Abre cualquier archivo y ejecuta "Analyze Current File"
2. **Búsqueda Similar**: Selecciona código y ejecuta "Search Similar Code"
3. **Sugerencias**: Ejecuta "Show Suggestions" para recomendaciones de mejora
4. **Indexación**: Ejecuta "Index Workspace" para analizar todo el proyecto

#### Indicador de Estado:
- La barra inferior muestra el estado del servidor de análisis
- 🔴 = Servidor offline, 🟢 = Servidor online

### Desde Línea de Comandos

#### Análisis de Archivos Individuales

```bash
# Análisis automático con detección de lenguaje
npm run analyze-file backend/server.js

# Análisis con lenguaje específico
npm run analyze-file script.py python
```

#### API REST

Inicia el servidor de análisis:

```bash
npm start
```

El servidor estará disponible en `http://localhost:3001`

#### Endpoints Principales

```
GET  /health                    - Verificar estado del servicio
POST /api/analyze/file          - Analizar archivo completo
POST /api/search/similar        - Buscar patrones similares
POST /api/analyze/errors        - Detectar errores potenciales
POST /api/suggestions/improvements - Generar sugerencias
POST /api/index/codebase        - Indexar codebase completo
POST /api/search/semantic       - Búsqueda semántica
GET  /api/stats                 - Estadísticas del sistema
```

### Desde el Sistema POS

#### Scripts Integrados

```bash
# Análisis rápido del backend
npm run analyze-backend

# Análisis del frontend
npm run analyze-frontend

# Ver estadísticas del sistema
npm run code-stats

# Iniciar servidor de análisis
npm run start-analysis

# Indexar proyecto completo
npm run index-project
```

#### Interfaz Web

Abre `frontend/code-analysis.html` en tu navegador para una interfaz visual simple.

## 📊 Tipos de Análisis

### 1. Análisis de Complejidad

- **Ciclos Anidados**: Detecta bucles y condicionales profundamente anidados
- **Ramificaciones**: Cuenta if/else, switch, try/catch
- **Funciones Grandes**: Identifica métodos que hacen demasiado
- **Puntuación Global**: Calcula complejidad cognitiva total

### 2. Detección de Problemas

- **Código Muerto**: Variables no utilizadas, imports sin usar
- **Manejo de Errores**: Try/catch faltantes o inadecuados
- **Buenas Prácticas**: Uso de var en lugar de let/const
- **Seguridad**: Problemas potenciales de seguridad

### 3. Sugerencias de Mejora

- **Refactorización**: Dividir funciones complejas
- **Modernización**: Usar sintaxis ES6+
- **Documentación**: Agregar comentarios faltantes
- **Rendimiento**: Optimizar bucles y algoritmos

### 4. Búsqueda Semántica

- **Patrones Similares**: Encuentra implementaciones similares
- **Duplicación**: Detecta código copiado
- **Referencias**: Localiza usos de funciones similares
- **Contextual**: Búsqueda basada en significado

## 🏗️ Arquitectura del Sistema

```
code-analysis/
├── server.js                    # API REST completa
├── vscode-integration.js        # Integración con VS Code
├── services/
│   ├── qdrant.service.js        # Cliente de Qdrant
│   ├── embedding.service.js     # Modelo de embeddings
│   ├── code-analyzer.service.js # Análisis inteligente
│   └── pattern-detector.service.js # Detección de patrones
├── scripts/
│   ├── init-collections.js      # Inicialización BD
│   ├── index-codebase.js        # Indexación masiva
│   └── analyze-file.js          # Análisis individual
├── vscode-extension/            # Extensión completa de VS Code
│   ├── package.json
│   └── extension.js
├── package.json                # Dependencias y scripts
└── README.md                  # Esta documentación
```

### Colecciones de Qdrant

1. **code_patterns**: Patrones de código y análisis
2. **error_patterns**: Patrones de errores detectados
3. **function_signatures**: Firmas de funciones
4. **code_complexity**: Métricas de complejidad
5. **semantic_search**: Búsqueda semántica general

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=tu_api_key_aqui

# Servidor
PORT=3001
NODE_ENV=production

# Modelos
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

### Configuración de VS Code

En VS Code, ve a `Archivo → Preferencias → Configuración → Code Analysis`:

```json
{
  "codeAnalysis.apiUrl": "http://localhost:3001/api",
  "codeAnalysis.enableAutoAnalysis": false,
  "codeAnalysis.showNotifications": true
}
```

### Configuración de Qdrant

```yaml
# docker-compose.yml personalizado
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
```

## 📈 Monitoreo y Estadísticas

### Dashboard de Qdrant

Accede a `http://localhost:6333/dashboard` para ver:
- Número de vectores por colección
- Rendimiento de búsquedas
- Estado del sistema

### Estadísticas del API

```bash
curl http://localhost:3001/api/stats
```

### Logs en VS Code

Los resultados aparecen en el panel "Code Analysis" de salida de VS Code.

## 🐛 Solución de Problemas

### Qdrant no inicia

```bash
# Verificar estado
docker ps

# Reiniciar contenedor
docker restart qdrant-pos

# Ver logs
docker logs qdrant-pos
```

### Error de memoria

```bash
# Aumentar límite de Node.js
node --max-old-space-size=4096 analyze-file.js archivo.js

# O configurar variable
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Modelo de embeddings no carga

```bash
# Limpiar cache de modelos
rm -rf code-analysis/models

# Forzar recarga
npm run init-collections
```

### Extensión de VS Code no funciona

```bash
# Verificar que el servidor esté ejecutándose
curl http://localhost:3001/health

# Reiniciar VS Code
# Verificar configuración de la extensión
```

## 🚀 Casos de Uso en Sistema POS

### 1. Desarrollo de Nuevas Funcionalidades

```javascript
// Al escribir nueva función de cálculo
async function calculateDiscount(items, discountPercent) {
    // La extensión sugiere automáticamente:
    // "Función similar encontrada en sales.js línea 45"
    // "Considera usar reduce() en lugar de for loop"
}
```

### 2. Code Reviews Automáticos

```bash
npm run analyze-backend
# Resultado: "Función getStock() tiene alta complejidad"
# Sugerencia: "Dividir en funciones más pequeñas"
```

### 3. Detección de Bugs

```javascript
// Sistema detecta automáticamente
// "Variable 'total' puede ser undefined"
// "Falta validación de entrada en función processOrder"
```

### 4. Mejoras de Rendimiento

```javascript
// Análisis identifica
// "Bucle anidado puede optimizarse"
// "Consulta SQL sin índice en products.id"
// "Función recursiva puede causar stack overflow"
```

## 📚 API Reference Completo

### POST /api/analyze/file

Analiza un archivo completo y devuelve métricas detalladas.

**Request:**
```json
{
  "content": "código fuente aquí",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "language": "javascript",
    "metrics": { "lines": 150, "functions": 5 },
    "complexity": { "score": 12.5, "level": "medium" },
    "issues": [...],
    "suggestions": [...]
  }
}
```

### POST /api/search/similar

Busca patrones de código similares.

**Request:**
```json
{
  "query": "function validate",
  "language": "javascript",
  "limit": 10,
  "threshold": 0.7
}
```

### POST /api/suggestions/improvements

Genera sugerencias específicas de mejora.

**Request:**
```json
{
  "content": "código fuente",
  "language": "javascript",
  "context": "refactor"
}
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-repo/issues)
- **Documentación**: Este README y archivos en `/docs`
- **Comunidad**: Discord/Slack del proyecto

---

**Desarrollado para optimizar el desarrollo y mantenimiento del Sistema POS mediante análisis inteligente de código integrado con VS Code.**