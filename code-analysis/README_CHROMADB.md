# 🔄 Migración de Qdrant a ChromaDB

Guía para reemplazar Qdrant por ChromaDB en el sistema de análisis de código.

## 📦 Instalación

### Requisitos
- Docker instalado
- Node.js 18+ 
- npm

### Pasos de Instalación

1. **Instalar dependencias de ChromaDB**:
   ```bash
   cd code-analysis
   npm install chroma-js openai
   ```

2. **Iniciar ChromaDB**:
   ```bash
   npm run chroma:start
   # o directamente
   docker run -d --name chroma-pos -p 8000:8000 chromadb/chroma:latest
   ```

3. **Verificar instalación**:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

## 🛠️ Archivos Modificados

### Servicios
- [`services/chroma.service.js`](services/chroma.service.js) - Cliente ChromaDB
- [`services/chroma-pattern-detector.service.js`](services/chroma-pattern-detector.service.js) - Detector de patrones

### Scripts
- [`scripts/chroma-detect-duplication.js`](scripts/chroma-detect-duplication.js) - Detección de duplicados con ChromaDB

### Configuración
- [`package.json`](package.json) - Nuevas dependencias y scripts
- [`start-chroma.bat`](start-chroma.bat) - Script de inicio

## 🚀 Uso

### Comandos Disponibles

```bash
# Iniciar ChromaDB
npm run chroma:start

# Detectar duplicados con ChromaDB
npm run detect-duplication

# Detectar duplicados con análisis de texto (alternativa)
npm run detect-text

# Verificar salud del sistema
npm run system:health
```

### API Endpoints

```bash
# Health check
GET http://localhost:8000/api/v1/heartbeat

# Listar colecciones
GET http://localhost:8000/api/v1/collections

# Consultar embeddings
POST http://localhost:8000/api/v1/query
```

## 📊 Comparación de Características

| Característica | Qdrant | ChromaDB |
|---------------|--------|----------|
| **Puerto** | 6333 | 8000 |
| **Cliente JS** | `@qdrant/js-client-rest` | `chroma-js` |
| **API** | REST + gRPC | REST |
| **Instalación** | Docker/binario | Docker |
| **Rendimiento** | Alto | Medio-Alto |
| **Comunidad** | Grande | Creciente |

## 🔧 Configuración

### Variables de Entorno
```bash
CHROMA_URL=http://localhost:8000
```

### Conexión en Código
```javascript
const { ChromaService } = require('./services/chroma.service');

const chromaService = new ChromaService({
    url: process.env.CHROMA_URL || 'http://localhost:8000'
});
```

## 🎯 Ventajas de ChromaDB

- ✅ Más ligero que Qdrant
- ✅ Fácil integración con embeddings
- ✅ API REST simple y consistente
- ✅ Buen soporte para metadatos
- ✅ Comunidad en crecimiento

## ⚠️ Consideraciones

- ⚠️ Menos maduro que Qdrant
- ⚠️ Algunas funcionalidades avanzadas pueden no estar disponibles
- ⚠️ Requiere Docker para producción

## 🔄 Migración Gradual

1. **Fase 1**: Instalar ChromaDB y dependencias
2. **Fase 2**: Probar detección de duplicados con ChromaDB
3. **Fase 3**: Reemplazar completamente Qdrant
4. **Fase 4**: Eliminar dependencias de Qdrant

## 📝 Notas de Versión

- **v1.0.0**: Migración inicial de Qdrant a ChromaDB
- **Nuevas dependencias**: chroma-js, openai
- **Nuevos scripts**: detect-duplication, chroma:start
- **Nuevos servicios**: ChromaService, PatternDetector

## 🐛 Solución de Problemas

### ChromaDB no responde
```bash
# Verificar contenedor
docker ps | grep chroma-pos

# Ver logs
docker logs chroma-pos

# Reiniciar
docker restart chroma-pos
```

### Errores de conexión
```bash
# Verificar puerto
netstat -an | grep 8000

# Probar conexión
curl http://localhost:8000/api/v1/heartbeat
```

## 📚 Documentación Adicional

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [ChromaDB GitHub](https://github.com/chroma-core/chroma)
- [chroma-js Package](https://www.npmjs.com/package/chroma-js)