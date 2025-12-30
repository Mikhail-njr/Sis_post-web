# Plan de Implementación: Filtro "Descartado" para Lotes

## Resumen
Agregar la opción "Descartado" al filtro de estado de lotes en el dashboard del sistema POS.

## Cambios a Realizar

### 1. Frontend - dashboard.html

**Ubicación:** Línea 1559-1564 en `frontend/dashboard.html`

**Cambio actual:**
```html
<select id="lote-status-filter" style="padding: 8px; border: 2px solid #030303; border-radius: 6px; font-size: 14px;">
    <option value="">Todos</option>
    <option value="vigente">Vigentes</option>
    <option value="proximo_vencer">Próximos a vencer</option>
    <option value="vencido">Vencidos</option>
</select>
```

**Cambio propuesto:**
```html
<select id="lote-status-filter" style="padding: 8px; border: 2px solid #030303; border-radius: 6px; font-size: 14px;">
    <option value="">Todos</option>
    <option value="vigente">Vigentes</option>
    <option value="proximo_vencer">Próximos a vencer</option>
    <option value="vencido">Vencidos</option>
    <option value="descartado">Descartado</option>
</select>
```

### 2. Backend - API de Lotes

**Nota:** El backend debe ser modificado para que el endpoint de lotes soporte el filtro por estado "descartado". Esto dependerá de cómo esté implementado el sistema de estados de lotes en la base de datos.

## Pasos para la Implementación

1. **Frontend:** Agregar la nueva opción al select en `dashboard.html`
2. **Backend:** Verificar y modificar el endpoint de lotes para que procese el valor "descartado"
3. **Pruebas:** Validar que el filtro funcione correctamente

## Archivos Modificados

- `frontend/dashboard.html` - Línea 1564: Agregar nueva opción al select

## Consideraciones

- El valor del option debe ser "descartado" (en minúsculas) para mantener consistencia con los demás estados
- El texto visible debe ser "Descartado" (con mayúscula inicial) para una mejor presentación
- El backend debe tener soporte para el estado "descartado" en la base de datos de lotes