# Análisis de Estructura de Archivos (ACTUALIZADO)

## 🗂️ ESTRUCTURA ACTUAL ENCONTRADA

### Carpeta RAÍZ actual (34 archivos)
```
├── package.json, package-lock.json, .gitignore, eslint.config.js
├── README.md, README_AUTENTICACION.md
├── pos_database.sqlite
├── backend/, frontend/, shared/, models/, docs/, plans/
├── Y 18 archivos más que necesitan reorganización...
```

### Carpeta `excluded/` ya existente (MUY BIEN ORGANIZADA!)
```
excluded/
├── assets/          (imágenes, audio)
├── backups/         (copias de seguridad)
├── installer/       (instaladores, launcher)
├── logs/            (8 archivos de análisis/logs)
└── tests/           (32 archivos de pruebas!)
```

---

## 📊 ANÁLISIS ACTUALIZADO

### Archivos ESENCIALES (permanecer en raíz)
| Archivo | Justificación |
|---------|---------------|
| package.json | Config npm |
| package-lock.json | Dependencias |
| .gitignore | Git config |
| eslint.config.js | Linting |
| README.md | Docs principal |
| pos_database.sqlite | Base de datos |
| backend/ | Código servidor |
| frontend/ | UI dashboard |
| shared/ | Código compartido |
| docs/ | Documentación |
| plans/ | Planes |

### Archivos que YA tienen lugar en `/excluded/`

#### Archivos de PRUEBAS → `excluded/tests/` (ya tiene 32!)
- test_change_credentials.js
- test_cierre_boton.js
- test_cierres_multiples.js
- Pasos_test.html (HTML de pruebas)

#### Archivos de HERRAMIENTAS/MANTENIMIENTO
- add_backend_logs.js
- add_lote_cif.js
- add_missing_endpoints.js
- add_scanned_product.js
- create_batches_with_products.js
- create_debts_table.js
- pos-batch-runner.js
- pos-tools-helper.js
- run_sql_f2.js
- clear_cuenta_corriente.js

#### Archivos de DIAGNÓSTICO/LOG
- camera_diagnostic.html
- displayClientDebts_agrupado.js
- verify-payments-invoice.js
- solucion_unificacion_endpoints.js

#### Archivos de DATOS/REFERENCIA
- search_customers.json
- search_products.json
- search_query.json
- search_sales.json
- ruta_implementacion_fiado.txt

---

## 🔄 RESUMEN: ACCIONES RECOMENDADAS

### 1. MOVER a `excluded/tests/` (4 archivos):
- test_change_credentials.js
- test_cierre_boton.js
- test_cierres_multiples.js
- Pasos_test.html

### 2. MOVER a `excluded/logs/` (8 archivos):
- camera_diagnostic.html
- displayClientDebts_agrupado.js
- verify-payments-invoice.js
- solucion_unificacion_endpoints.js
- search_customers.json
- search_products.json
- search_query.json
- search_sales.json

### 3. MOVER a `excluded/installer/` o ELIMINAR (10 archivos):
- add_backend_logs.js
- add_lote_cif.js
- add_missing_endpoints.js
- add_scanned_product.js
- create_batches_with_products.js
- create_debts_table.js
- pos-batch-runner.js
- pos-tools-helper.js
- run_sql_f2.js
- clear_cuenta_corriente.js

### 4. ELIMINAR (2 archivos):
- `0` (archivo vacío)
- `🛡️ .kilocodemodes` (creado por sistema)

### 5. MOVER a `docs/` (1 archivo):
- README_AUTENTICACION.md

---

## 📁 ESTRUCTURA FINAL PROPUESTA

```
raíz/
├── package.json, package-lock.json, .gitignore
├── eslint.config.js, .eslintrc.js
├── README.md
├── pos_database.sqlite
├── backend/         (servidor)
├── frontend/        (dashboard)
├── shared/          (código compartido)
├── models/          (modelos ML)
├── docs/            (documentación)
└── plans/           (planes)

excluded/
├── assets/          (imágenes, audio)
├── backups/         (backups)
├── installer/       (instaladores)
├── logs/            (análisis, diagnósticos)
├── tests/           (pruebas - YA EXISTE!)
└── [mover aquí los archivos de raíz]
```

---

## ⚠️ PREGUNTA AL USUARIO

¿Tienes más carpetas fuera del proyecto que deberían estar aquí? Por ejemplo, ¿tienes una carpeta de "backups" externa?
