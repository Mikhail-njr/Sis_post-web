-- Crear tabla clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    dni TEXT,
    nota TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);