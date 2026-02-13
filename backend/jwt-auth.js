/**
 * Módulo de Autenticación JWT para el Sistema POS
 * 
 * Este módulo implementa autenticación basada en tokens JWT para mejorar
 * la seguridad y escalabilidad del sistema de autenticación.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./database-connection');

// Configuración de JWT
const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generar un token JWT para un usuario
 * @param {Object} user - Objeto de usuario
 * @returns {string} Token JWT
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            email: user.email,
            rol: user.rol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Registrar una sesión en la base de datos
 * @param {number} userId - ID del usuario
 * @param {string} token - Token JWT
 * @param {Object} req - Objeto de solicitud
 */
async function logSession(userId, token, req) {
    const expiresIn = jwt.decode(token).exp;
    const expiresAt = new Date(expiresIn * 1000).toISOString();
    
    await db.run(
        `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, token, req.ip || 'unknown', req.get('User-Agent') || 'unknown', expiresAt]
    );
}

/**
 * Invalidar una sesión en la base de datos
 * @param {string} token - Token JWT
 */
async function invalidateSession(token) {
    await db.run(
        `UPDATE sessions SET is_active = 0 WHERE token = ?`,
        [token]
    );
}

/**
 * Verificar si una sesión es válida
 * @param {string} token - Token JWT
 * @returns {boolean} Si la sesión es válida
 */
async function isValidSession(token) {
    const session = await db.get(
        `SELECT is_active FROM sessions WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')`,
        [token]
    );
    
    return !!session;
}

/**
 * Verificar un token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Decodificado o null si es inválido
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('Error verificando token JWT:', error.message);
        return null;
    }
}

/**
 * Middleware de autenticación JWT
 */
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Acceso denegado: se requiere token de autenticación' 
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                error: 'Token inválido o expirado'
            });
        }

        // Verificar que la sesión es válida
        const isSessionValid = await isValidSession(authHeader.split(' ')[1]);
        if (!isSessionValid) {
            return res.status(401).json({
                error: 'Sesión inválida o expirada'
            });
        }

        // Verificar que el usuario existe y está activo
        const user = await db.get(
            "SELECT id, username, nombre_completo, email, rol, activo FROM usuarios WHERE id = ?",
            [decoded.id]
        );
        
        if (!user || !user.activo) {
            return res.status(401).json({
                error: 'Usuario no encontrado o inactivo'
            });
        }

        // Guardar información del usuario en el request
        req.user = {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            email: user.email,
            rol: user.rol
        };

        // Registrar acceso exitoso
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'ACCESO_EXITOSO_JWT', ?, ?)",
            [user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        next();
    } catch (error) {
        console.error('Error en middleware JWT:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

/**
 * Endpoint para cerrar sesión
 */
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Se requiere token de autenticación'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Invalidar sesión en la base de datos
        await invalidateSession(token);
        
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        console.error('Error cerrando sesión:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

    } catch (error) {
        console.error('Error en middleware JWT:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * Endpoint de login con JWT
 */
const loginWithJWT = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Usuario y contraseña son requeridos' 
            });
        }

        // Verificar credenciales en la base de datos
        const user = await db.get(
            "SELECT * FROM usuarios WHERE username = ? AND activo = 1",
            [username]
        );
        
        if (!user) {
            // Registrar intento fallido
            await db.run(
                "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'INTENTO_FALLIDO_JWT', ?, ?)",
                [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
            );
            
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Registrar intento fallido
            await db.run(
                "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'INTENTO_FALLIDO_JWT', ?, ?)",
                [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
            );
            
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar bloqueo por intentos fallidos
        const failedAttempts = await db.get(
            "SELECT COUNT(*) as count FROM auth_logs WHERE username = ? AND tipo_evento = 'INTENTO_FALLIDO_JWT' AND created_at > datetime('now', '-15 minutes')",
            [username]
        );
        
        if (failedAttempts.count >= 5) {
            return res.status(423).json({ 
                error: 'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intente nuevamente en 15 minutos.' 
            });
        }

        // Generar token JWT
        const token = generateToken(user);
        
        // Registrar sesión en la base de datos
        await logSession(user.id, token, req);
        
        // Resetear intentos fallidos
        await db.run(
            "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = datetime('now') WHERE id = ?",
            [user.id]
        );

        // Registrar acceso exitoso
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'LOGIN_EXITOSO_JWT', ?, ?)",
            [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                nombre_completo: user.nombre_completo,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error('Error en login JWT:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * Endpoint para refrescar token JWT
 */
const refreshToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Se requiere token de autenticación' 
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ 
                error: 'Token inválido o expirado' 
            });
        }

        // Verificar que el usuario existe y está activo
        const user = await db.get(
            "SELECT id, username, nombre_completo, email, rol, activo FROM usuarios WHERE id = ?",
            [decoded.id]
        );
        
        if (!user || !user.activo) {
            return res.status(401).json({ 
                error: 'Usuario no encontrado o inactivo' 
            });
        }

        // Generar nuevo token
        const newToken = generateToken(user);
        
        res.json({
            success: true,
            token: newToken
        });

    } catch (error) {
        console.error('Error refrescando token:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateJWT,
    loginWithJWT,
    refreshToken
};