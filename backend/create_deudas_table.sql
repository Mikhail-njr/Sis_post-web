-- Crear tablas para el sistema de deudas
-- Tabla principal de deudas
CREATE TABLE IF NOT EXISTS deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    monto_total REAL NOT NULL,
    monto_pendiente REAL NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'parcial', 'vencida', 'pagada')),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    descripcion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- Tabla de productos asociados a cada deuda
CREATE TABLE IF NOT EXISTS deuda_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deuda_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    precio_actual REAL, -- Precio actual del producto para actualizaciones
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_deudas_cliente_id ON deudas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_deudas_estado ON deudas(estado);
CREATE INDEX IF NOT EXISTS idx_deudas_fecha_creacion ON deudas(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_deuda_productos_deuda_id ON deuda_productos(deuda_id);
CREATE INDEX IF NOT EXISTS idx_deuda_productos_producto_id ON deuda_productos(producto_id);

-- Trigger para actualizar la fecha de modificación
CREATE TRIGGER IF NOT EXISTS update_deuda_updated_at
AFTER UPDATE ON deudas
FOR EACH ROW
BEGIN
    UPDATE deudas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insertar datos de ejemplo
INSERT OR IGNORE INTO deudas (cliente_id, monto_total, monto_pendiente, estado, fecha_vencimiento, descripcion) VALUES
(1, 150.50, 150.50, 'pendiente', DATE('now', '+30 days'), 'Compra de productos varios'),
(2, 89.99, 89.99, 'pendiente', DATE('now', '+15 days'), 'Impresora multifunción'),
(1, 200.00, 120.00, 'parcial', DATE('now', '+7 days'), 'Laptop HP - abono parcial'),
(3, 75.25, 75.25, 'vencida', DATE('now', '-5 days'), 'Teclado mecánico RGB'),
(2, 300.00, 300.00, 'pendiente', DATE('now', '+45 days'), 'Monitor Samsung 24"');

-- Insertar productos de ejemplo asociados a deudas
INSERT OR IGNORE INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal, precio_actual) VALUES
(1, 1, 1, 89.99, 89.99, 89.99),
(1, 3, 1, 60.51, 60.51, 60.51),
(2, 5, 1, 89.99, 89.99, 89.99),
(3, 1, 1, 200.00, 200.00, 200.00),
(4, 3, 1, 75.25, 75.25, 75.25),
(5, 2, 1, 300.00, 300.00, 300.00);

-- Verificar creación de tablas
SELECT 'Tablas de deudas creadas exitosamente' as resultado;
SELECT COUNT(*) as total_deudas FROM deudas;
SELECT COUNT(*) as total_deuda_productos FROM deuda_productos;