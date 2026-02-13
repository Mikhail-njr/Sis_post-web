-- Crear tabla de sesiones para registrar sesiones activas
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Crear índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Crear índice para búsquedas rápidas por user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Crear índice para búsquedas rápidas por estado
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);