-- Crear tabla de usuarios para el sistema de autenticación
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT,
    email TEXT,
    rol TEXT DEFAULT 'admin' CHECK (rol IN ('admin', 'cajero', 'invitado')),
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta DATETIME,
    INDEX idx_username (username),
    INDEX idx_activo (activo)
);

-- Insertar usuario por defecto (admin/pos123)
-- La contraseña 'pos123' encriptada con bcrypt (costo 10)
INSERT OR IGNORE INTO usuarios (
    username, 
    password_hash, 
    nombre_completo, 
    email, 
    rol, 
    activo
) VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 'pos123'
    'Administrador del Sistema',
    'admin@empresa.com',
    'admin',
    1
);

-- Crear índice para búsquedas rápidas por username
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Crear índice para búsquedas por estado activo
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Crear índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Crear trigger para actualizar el campo updated_at
CREATE TRIGGER IF NOT EXISTS tr_usuarios_updated_at
AFTER UPDATE ON usuarios
FOR EACH ROW
BEGIN
    UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Crear trigger para registrar intentos de acceso
CREATE TRIGGER IF NOT EXISTS tr_usuarios_intentos_fallidos
AFTER UPDATE ON usuarios
FOR EACH ROW
WHEN NEW.intentos_fallidos != OLD.intentos_fallidos
BEGIN
    UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Crear tabla de logs de autenticación
CREATE TABLE IF NOT EXISTS auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    tipo_evento TEXT CHECK (tipo_evento IN ('login_exitoso', 'login_fallido', 'logout', 'cambio_clave')),
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_logs_username (username),
    INDEX idx_auth_logs_tipo_evento (tipo_evento),
    INDEX idx_auth_logs_created_at (created_at)
);

-- Crear índice para búsquedas rápidas en logs
CREATE INDEX IF NOT EXISTS idx_auth_logs_username_evento ON auth_logs(username, tipo_evento);