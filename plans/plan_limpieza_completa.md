# Plan de Limpieza del Proyecto POS

## Objetivo
Eliminar archivos temporales, de diagnóstico, testing, backups y código no utilizado del proyecto para reducir el tamaño y mejorar el mantenimiento.

---

## Archivos a Eliminar

### 1. Raíz del Proyecto (`Sis_post-web-backup/`)

#### Archivos de diagnóstico (12 archivos)
- `diagnose-discrepancy-5800-1200.js`
- `diagnose-invoice-paid-status.js`
- `diagnostic-invoice-fac-1771013808622.js`
- `final-diagnosis-invoice.js`

#### Archivos de testing (3 archivos)
- `test_change_credentials.js`
- `test_cierre_boton.js`
- `test_cierres_multiples.js`

#### Archivos de utilería temporal (14 archivos)
- `add_backend_logs.js`
- `add_lote_cif.js`
- `add_missing_endpoints.js`
- `add_scanned_product.js`
- `create_batches_with_products.js`
- `create_debts_table.js`
- `run_sql_f2.js`
- `run-diagnostic-sql.js`
- `solucion_unificacion_endpoints.js`
- `pos-batch-runner.js`
- `pos-tools-helper.js`
- `analyze-real-data.js`

#### Archivos JSON de búsqueda (4 archivos)
- `search_customers.json`
- `search_products.json`
- `search_query.json`
- `search_sales.json`

#### Archivos vacíos o innecesarios (4 archivos)
- `dashboard_matches.txt` (0 bytes)
- `pos_database.sqlite` (0 bytes)
- `0` (archivo extraño de 91 bytes)
- `${workspaceFolder}/` (directorio incorrecto)

---

### 2. Carpeta `code-analysis/` (ELIMINAR COMPLETA)
Esta carpeta contiene herramientas de análisis de código que no son parte del sistema POS principal.

**Incluye:**
- `command-runner.js`
- `indexer-dashboard.html`
- `local-indexer.js`
- `local-server.js`
- `simple-index.js`
- `simple-server.js`
- `services/` (carpeta completa)
- `scripts/` (carpeta completa)
- `vscode-extension/` (carpeta completa)
- `models/Xenova/` (carpeta completa - 22MB)
- Archivos .bat, .yml, .json, .md varios

---

### 3. Backend (`Sis_post-web-backup/backend/`)

#### Archivos de diagnóstico (15 archivos)
- `diagnostic-backend-404.js`
- `diagnostic-clientes.js`
- `debug_cierres_query.js`
- `debug-clientes-cuenta-corriente.js`
- `fix-backend-404.js`
- `quick-fix-404.js`
- `validate-backend-404.js`
- `verificar_datos_inconsistentes.js`
- `check_cierre_table.js`
- `check_cuentas_corrientes.js`
- `check_mika.js`

#### Archivos de testing (6 archivos)
- `test_cierre_endpoint.js`
- `test_cierres_endpoint.js`
- `test_cliente_duplicado.js`
- `test_fetch_productos.js`
- `test-auth-system.js`

#### Archivos de utilería/temporal (20+ archivos)
- `ejecutar_cascade_fix_node.js`
- `eliminar_datos_cuenta_corriente_cascada.js`
- `eliminar_datos_huerfanos.js`
- `identificar_datos_cuenta_corriente.js`
- `insert_products_from_sql.js`
- `install-auth-deps.js`
- `install-complete-auth.js`
- `install-debts-system.js`
- `install-deps.js`
- `integracion-completa.js`
- `integrate-auth.js`
- `migrate-endpoints.js`
- `patch-clientes-500.js`
- `optimize-debt-update.js`

#### Archivos SQL duplicados de cascade (8 archivos)
- `fix_cuenta_corriente_cascade.sql`
- `IMPLEMENTACION_DEFINITIVA_FINAL_CASCADE.sql`
- `IMPLEMENTACION_DEFINITIVA_ULTIMA_FINAL_CASCADE.sql`
- `IMPLEMENTACION_DIRECTA_CASCADE.sql`
- `IMPLEMENTACION_FINAL_DEFINITIVA_ULTIMA_CASCADE.sql`
- `IMPLEMENTACION_ULTIMA_FINAL_DEFINITIVA_CASCADE.sql`
- `RESTAURAR_CASCADE_DELETE.sql`
- `validate_cascade_fix.sql`

#### Archivos vacíos (5 archivos)
- `dashboard_matches.txt` (0 bytes)
- `matches.txt` (0 bytes)
- `scripts_list.txt` (0 bytes)
- `database.db` (0 bytes)
- `database.sqlite` (0 bytes)

#### Backups de base de datos (1 archivo + carpeta backups)
- `pos_database_backup_20260106_171927.sqlite`
- `backups/` (carpeta completa con 30+ backups)

#### Archivos temporales (3 archivos)
- `tmp_index.html`
- `products_response.json`
- `products.json`
- `server.js.backup-optimizacion-cuenta-corriente`

---

### 4. Frontend (`Sis_post-web-backup/frontend/`)

#### Archivos de diagnóstico (3 archivos)
- `diagnostic-pos-cuenta-corriente.js`
- `fix_credentials_modal.js`
- `scan-system-fix.js`

#### Versiones antiguas de barcode-scanner (3 archivos)
- `barcode-scanner-session.js`
- `barcode-scanner-updated.js`

#### Archivos de testing (2 archivos)
- `test_confirm_delivery_modal.js`
- `test_confirm_delivery_valid.js`

---

### 5. Shared (`Sis_post-web-backup/shared/`)

#### Backups (1 archivo)
- `cuenta-corriente-manager.js.backup-original`

---

## Archivos que SE DEBEN CONSERVAR

### Raíz
- `package.json` - Dependencias del proyecto
- `eslint.config.js` - Configuración de linter
- `.eslintrc.js` - Configuración de linter
- `.gitignore` - Configuración de git
- `.kilocodemodes` - Configuración de KiloCode
- `README.md` - Documentación
- `README_AUTENTICACION.md` - Documentación de auth
- `ruta_implementacion_fiado.txt` - Documentación

### Backend (archivos principales)
- `server.js` - Servidor principal
- `auth-middleware.js` - Middleware de autenticación
- `auth-utils.js` - Utilidades de auth
- `credentials-endpoints.js` - Endpoints de credenciales
- `debts-endpoints.js` - Endpoints de deudas
- `users-endpoints.js` - Endpoints de usuarios
- `jwt-auth.js` - Autenticación JWT
- `database-sqlite.js` - Conexión a base de datos
- `api/` - Endpoints de API
- `middleware/` - Middlewares
- `repositories/` - Repositorios de datos
- `utils/` - Utilidades
- `validators/` - Validadores

### Frontend (archivos principales)
- `index.html` - Página principal
- `script.js` - Lógica principal
- `style.css` - Estilos

### Shared (archivos principales)
- `api-client.js` - Cliente de API
- `auth.js` - Autenticación
- `barcode-utils.js` - Utilidades de código de barras
- `cuenta-corriente-manager.js` - Gestión de cuenta corriente

---

## Resumen de Limpieza

| Carpeta | Archivos a eliminar | Estimado de espacio |
|---------|---------------------|---------------------|
| Raíz | ~40 archivos | ~5 MB |
| code-analysis | ~40 archivos + models | ~25 MB |
| backend | ~70 archivos + backups | ~100 MB |
| frontend | ~8 archivos | ~500 KB |
| shared | ~1 archivo | ~15 KB |
| **TOTAL** | **~160+ archivos** | **~130 MB** |
