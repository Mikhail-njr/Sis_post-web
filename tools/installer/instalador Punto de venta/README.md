# 🚀 Instalador del Sistema POS

## 📋 Descripción
Este instalador automatiza la instalación completa del **Sistema POS (Punto de Venta)** incluyendo todas las dependencias necesarias.

## 🎯 Características del Instalador

### ✅ Instalación Automática de Componentes
- **Node.js**: Entorno de ejecución JavaScript
- **ngrok**: Para acceso remoto seguro
- **Dependencias npm**: Todas las librerías requeridas
- **Base de datos**: Configuración inicial de SQLite

### ✅ Aplicación Electron
- **Interfaz nativa**: Ejecutable independiente
- **Sin navegador requerido**: Aplicación de escritorio completa
- **Instalador ejecutable**: Setup fácil para usuarios finales

### ✅ Configuración Completa
- **Datos de ejemplo**: Productos y proveedores incluidos
- **Configuración automática**: Puertos y rutas optimizadas
- **Accesos directos**: En escritorio y menú inicio

## 📦 Contenido del Instalador

### Archivos de Distribución (Comprimidos)
```
📁 Paquete de Distribución/
├── 📄 instalar.bat                 # 🏗️ Script principal de instalación
├── 📄 sistema-pos-electron.zip     # 📦 Sistema comprimido
├── 📄 LEEME_PRIMERO.txt           # 📖 Guía rápida
└── 📄 README.md                   # 📚 Documentación completa
```

### Estructura Completa Descomprimida
```
📁 instalador Punto de venta/
├── 📄 README.md                    # Documentación completa

├── 📄 LEEME_PRIMERO.txt           # Guía rápida de instalación
├── 📄 instalar.bat                # Script principal de instalación
├── 📄 crear_paquete_sistema.bat   # 🛠️ Herramienta para crear ZIP
├── 📁 instaladores/
│   ├── 📄 instalar_nodejs.bat     # Instalador automático de Node.js
│   ├── 📄 instalar_ngrok.bat      # Instalador automático de ngrok
│   └── 📄 configurar_ngrok.bat    # Configuración manual de ngrok
├── 📁 aplicacion/
│   └── 📄 empaquetar_app.bat      # Script para empaquetar la app Electron
├── 📁 utilidades/
│   ├── 📄 backup.bat              # 💾 Utilidad de respaldos
│   ├── 📄 restaurar.bat           # 🔄 Utilidad de restauración
│   └── 📄 diagnostico.bat         # 🔧 Herramienta de diagnóstico
└── 📁 paquetes/                   # 📦 (Creado al empaquetar)
    └── 📄 sistema-pos-electron.zip # Paquete comprimido del sistema
```

### Creación del Paquete de Distribución

Para crear el paquete final de distribución:

```bash
# Ejecutar el script de empaquetado
crear_paquete_sistema.bat

# Esto creará:
# - paquetes/sistema-pos-electron.zip
# - paquetes/paquete_info.txt
```

**Archivos finales para distribución:**
- `instalar.bat`
- `sistema-pos-electron.zip`
- `LEEME_PRIMERO.txt` (opcional)
- `README.md` (opcional)

## 🚀 Instalación Rápida

### Paso 1: Preparar Archivos
Asegúrese de tener ambos archivos en la misma carpeta:
- `instalar.bat` (este instalador)
- `sistema-pos-electron.zip` (paquete del sistema)

### Paso 2: Ejecutar Instalador
```bash
# Haga doble clic en instalar.bat
# O ejecute desde línea de comandos:
instalar.bat
```

### Paso 3: Seguir Asistente
El instalador automáticamente:
1. ✅ Descomprime el paquete del sistema
2. ✅ Verifica requisitos del sistema
3. ✅ Descarga e instala Node.js
4. ✅ Descarga e instala ngrok
5. ✅ Instala dependencias de la aplicación
6. ✅ Configura el sistema completamente
7. ✅ Crea accesos directos

### Paso 3: Primer Uso
- **Ejecutar**: Haga doble clic en "Sistema POS" en el escritorio
- **Acceder**: La aplicación se abrirá automáticamente
- **Usuario**: `admin`
- **Contraseña**: `pos123`

## 🔧 Requisitos del Sistema

### Mínimos
- **SO**: Windows 7 SP1 o superior
- **Procesador**: 1 GHz o superior
- **RAM**: 512 MB
- **Disco**: 500 MB libres
- **Conexión**: Internet para instalación inicial

### Recomendados
- **SO**: Windows 10 o superior
- **Procesador**: 2 GHz dual-core
- **RAM**: 2 GB
- **Disco**: 1 GB libres
- **Cámara**: Para escaneo de códigos de barras

## 📋 Opciones de Instalación

### Instalación Completa (Recomendada)
- ✅ Node.js
- ✅ ngrok
- ✅ Todas las dependencias
- ✅ Datos de ejemplo
- ✅ Accesos directos

### Instalación Mínima
- ✅ Solo aplicación Electron
- ⚠️ Requiere Node.js pre-instalado
- ⚠️ Sin acceso remoto

### Instalación Personalizada
- ✅ Seleccionar componentes individuales
- ✅ Configuración avanzada
- ✅ Opciones de directorio

## 🌐 Modos de Uso

### Modo Local (Predeterminado)
- ✅ Sin configuración de red
- ✅ Funciona sin internet
- ✅ Ideal para uso individual

### Modo Red (con ngrok)
- ✅ Acceso desde cualquier dispositivo
- ✅ URLs públicas seguras
- ✅ Configuración automática

## 🔐 Seguridad

### Credenciales por Defecto
- **Usuario**: admin
- **Contraseña**: pos123

### Recomendaciones
- ✅ Cambie la contraseña por defecto
- ✅ Configure usuarios adicionales
- ✅ Active licencia para funciones premium

## 🆘 Solución de Problemas

### Error: "Node.js no encontrado"
```bash
# Ejecutar instalador de Node.js manualmente
cd instaladores
instalar_nodejs.bat
```

### Error: "ngrok no configurado"
```bash
# Configurar ngrok manualmente
cd instaladores
configurar_ngrok.bat
```

### Error: "Puerto ocupado"
- Cierre otras aplicaciones que usen el puerto 3000
- O configure un puerto diferente en configuración

## 📞 Soporte

### Documentación Incluida
- 📖 **Guía del Usuario**: `documentacion/guia_usuario.pdf`
- 🔧 **Manual Técnico**: `documentacion/manual_tecnico.pdf`
- ❓ **FAQ**: `documentacion/preguntas_frecuentes.pdf`

### Recursos Adicionales
- 📧 **Email**: soporte@sistema-pos.com
- 🌐 **Web**: https://sistema-pos.com
- 📱 **WhatsApp**: +54 9 11 1234-5678

## 📈 Funcionalidades Incluidas

### ✅ Gestión Completa
- 🛒 **Sistema de Ventas** con múltiples métodos de pago
- 📦 **Control de Inventario** con lotes y vencimientos
- 👥 **Gestión de Proveedores** y pedidos
- 📊 **Dashboard** con métricas en tiempo real
- 📱 **Escaneo de Códigos** con cámara integrada

### ✅ Características Avanzadas
- 🎯 **Sistema de Promociones** configurable
- 📋 **Reportes** exportables a PDF
- 💰 **Cierres de Caja** automáticos
- 🔄 **Backup/Restore** integrado
- 🌐 **Acceso Multi-dispositivo**

## 🎉 ¡Listo para Usar!

Después de la instalación, el **Sistema POS** estará completamente funcional con:

- ✅ **Interfaz intuitiva** y moderna
- ✅ **Base de datos** con datos de ejemplo
- ✅ **Funcionalidades completas** activas
- ✅ **Documentación** incluida
- ✅ **Soporte** disponible

---

**¡El Sistema POS está listo para revolucionar su negocio!** 🚀