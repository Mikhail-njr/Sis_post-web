-- Agregar columna cliente_id nullable a tabla ventas
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);