# Guía de Mantenimiento del Dashboard

> **Archivo de referencia para decisiones de desarrollo**

Este documento guía las decisiones de mantenimiento y modificación del sistema de componentes del dashboard.

---

## 📋 Índice

1. [Estructura General](#estructura-general)
2. [Cómo Modificar Componentes](#cómo-modificar-componentes)
3. [Agregar Nuevos Componentes](#agregar-nuevos-componentes)
4. [Dependencias y Carga](#dependencias-y-carga)
5. [Solución de Problemas](#solución-de-problemas)

---

## Estructura General

### Archivos Principales

| Archivo | Propósito |
|---------|-----------|
| [`dashboard.html`](frontend/dashboard.html) | Archivo principal original (435 KB) |
| [`dashboard.min.html`](frontend/dashboard.min.html) | Versión reducida con carga dinámica |
| [`dashboard.js`](frontend/dashboard.js) | Lógica JavaScript del dashboard |
| [`dashboard-components/`](frontend/dashboard-components/) | Componentes extraídos |

### Directorio de Componentes

```
dashboard-components/
├── modals/          → 23 archivos HTML de modales
├── sections/        → 7 archivos HTML de secciones
├── dashboard-includes.js    → Loader de componentes
└── AGENT.md         → Este archivo
```

---

## Cómo Modificar Componentes

### 🔧 Scenario 1: Modificar un Modal Existente

**Cuándo usarlo:** Necesitas agregar, quitar o modificar un campo en un formulario.

**Pasos:**
1. Abrir el archivo del modal en [`modals/`](frontend/dashboard-components/modals/)
2. Editar el HTML del formulario
3. **Importante:** Verificar que el JavaScript en [`dashboard.js`](frontend/dashboard.js) maneje los nuevos campos

**Ejemplos:**
- Agregar campo de "email" a cliente → [`modals/addClientModal.html`](frontend/dashboard-components/modals/addClientModal.html)
- Modificar validación de producto → [`modals/editModal.html`](frontend/dashboard-components/modals/editModal.html)

---

### 🔧 Scenario 2: Modificar una Sección del Dashboard

**Cuándo usarlo:** Necesitas cambiar la estructura de una pestaña/sección.

**Pasos:**
1. Abrir el archivo de sección en [`sections/`](frontend/dashboard-components/sections/)
2. Modificar el HTML según necesidad
3. Verificar que las funciones en [`dashboard.js`](frontend/dashboard.js) sigan funcionando

**Ejemplos:**
- Agregar filtros a productos → [`sections/dashboard-productos.html`](frontend/dashboard-components/sections/dashboard-productos.html)
- Modificar tabla de proveedores → [`sections/dashboard-proveedores.html`](frontend/dashboard-components/sections/dashboard-proveedores.html)

---

### 🔧 Scenario 3: Modificar Funcionalidad JavaScript

**Cuándo usarlo:** Cambiar cómo funciona un componente (no solo el HTML).

**Pasos:**
1. El JavaScript está en [`dashboard.js`](frontend/dashboard.js) (funciones principales)
2. También hay lógica en archivos específicos:
   - [`openConfirmDeliveryModal.js`](frontend/openConfirmDeliveryModal.js)
   - [`cierre-caja-functions.js`](frontend/cierre-caja-functions.js)

**Decisión:**
| Necesidad | Dónde buscar |
|-----------|--------------|
| Lógica de productos | [`dashboard.js`](frontend/dashboard.js) - funciones `product*` |
| Lógica de clientes | [`dashboard.js`](frontend/dashboard.js) - funciones `cliente*` |
| Lógica de cierre de caja | [`cierre-caja-functions.js`](frontend/cierre-caja-functions.js) |
| Lógica de pedidos | [`openConfirmDeliveryModal.js`](frontend/openConfirmDeliveryModal.js) |

---

## Agregar Nuevos Componentes

### 📝 Scenario 4: Agregar un Nuevo Modal

**Pasos:**
1. Crear archivo en [`modals/`](frontend/dashboard-components/modals/) con formato:
   ```html
   <!-- Modal de [Nombre] -->
   <div id="[nombre]Modal" class="edit-modal">
       <div class="edit-form">
           <h3>📝 Título del Modal</h3>
           <form id="[nombre]Form">
               <!-- Campos del formulario -->
               <div class="button-group">
                   <button type="button" class="btn btn-secondary" onclick="close[nombre]Modal()">Cancelar</button>
                   <button type="submit" class="btn btn-primary">Guardar</button>
               </div>
           </form>
       </div>
   </div>
   ```

2. Agregar función JavaScript en [`dashboard.js`](frontend/dashboard.js):
   ```javascript
   function open[nombre]Modal() {
       // Lógica para abrir el modal
   }
   
   function close[nombre]Modal() {
       document.getElementById('[nombre]Modal').style.display = 'none';
   }
   ```

3. Agregar botón disparador en la sección correspondiente

---

### 📝 Scenario 5: Agregar una Nueva Sección

**Pasos:**
1. Crear archivo en [`sections/`](frontend/dashboard-components/sections/)
2. Usar estructura:
   ```html
   <div id="[nombre]-section" class="dashboard-section collapsed">
       <h2 class="section-header">
           <span class="section-title">📦 Título</span>
           <span class="section-icon">▶</span>
       </h2>
       <div class="section-content">
           <!-- Contenido -->
       </div>
   </div>
   ```

3. La funcionalidad de expandir/colapsar ya está en [`dashboard.js`](frontend/dashboard.js)

---

## Dependencias y Carga

### Orden de Carga (en dashboard.html)

```
1. dashboard.css          → Estilos
2. jspdf.min.js          → Librería externa
3. auth.js               → Autenticación
4. api-client.js         → Cliente API
5. openConfirmDeliveryModal.js
6. dashboard.js          → Lógica principal
7. cierre-caja-functions.js
8. dashboard-includes.js → Loader de componentes (al final)
```

### Carga de Componentes Dinámicos

Los modales en [`dashboard.min.html`](frontend/dashboard.min.html) se cargan mediante [`dashboard-includes.js`](frontend/dashboard-components/dashboard-includes.js):

```javascript
// Cargar modal bajo demanda
await DashboardLoader.loadComponent('editModal');

// Precargar varios modales
await DashboardLoader.preloadComponents(['editModal', 'addModal']);
```

---

## Solución de Problemas

### ❌ "El modal no se abre"

**Verificar:**
1. ¿El ID del modal existe en el HTML?
2. ¿La función `open[Nombre]Modal()` está definida?
3. ¿Hay errores en la consola del navegador?

**Solución común:**
- Si usas `dashboard.min.html`, el modal debe estar en [`modals/`](frontend/dashboard-components/modals/)
- Verificar que [`dashboard-includes.js`](frontend/dashboard-components/dashboard-includes.js) esté cargado

---

### ❌ "Los datos no se guardan"

**Verificar:**
1. ¿El form tiene los `name` o `id` correctos?
2. ¿El endpoint API existe?
3. ¿Hay errores en la consola?

**Rutas de API típicas:**
- Productos: `/api/products`
- Clientes: `/api/customers`
- Proveedores: `/api/suppliers`

---

### ❌ "La sección no carga datos"

**Verificar:**
1. ¿La función `load[Nombre]()` está siendo llamada?
2. ¿El endpoint API responde correctamente?
3. ¿Hay errores en `fetch`?

---

## 📞 Referencia Rápida

| Necesidad | Archivo a editar |
|-----------|------------------|
| Campo de producto | [`modals/addModal.html`](frontend/dashboard-components/modals/addModal.html) + [`dashboard.js`](frontend/dashboard.js) |
| Campo de cliente | [`modals/addClientModal.html`](frontend/dashboard-components/modals/addClientModal.html) + [`dashboard.js`](frontend/dashboard.js) |
| Estilos del dashboard | [`dashboard.css`](frontend/dashboard.css) |
| Lógica de productos | [`dashboard.js`](frontend/dashboard.js) - buscar `product` |
| Lógica de cierre | [`cierre-caja-functions.js`](frontend/cierre-caja-functions.js) |
| Validaciones | [`dashboard.js`](frontend/dashboard.js) - buscar `validate` |

---

*Última actualización: 2026-03-14*
