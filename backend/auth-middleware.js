const bcrypt = require('bcrypt');
const db = require('./database-connection');

/**
 * Middleware de autenticación JWT
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ 
                error: 'Acceso denegado: se requiere autenticación' 
            });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Credenciales inválidas' 
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
                "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'INTENTO_FALLIDO', ?, ?)",
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
                "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'INTENTO_FALLIDO', ?, ?)",
                [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
            );
            
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar bloqueo por intentos fallidos
        const failedAttempts = await db.get(
            "SELECT COUNT(*) as count FROM auth_logs WHERE username = ? AND tipo_evento = 'INTENTO_FALLIDO' AND created_at > datetime('now', '-15 minutes')",
            [username]
        );

        if (failedAttempts.count >= 5) {
            return res.status(423).json({ 
                error: 'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intente nuevamente en 15 minutos.' 
            });
        }

        // Verificar si el usuario está activo
        if (!user.activo) {
            return res.status(403).json({ 
                error: 'Cuenta desactivada. Contacte al administrador.' 
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
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'ACCESO_EXITOSO', ?, ?)",
            [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        next();

    } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * Middleware de autorización por roles
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Acceso denegado: se requiere autenticación' 
            });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ 
                error: `Acceso denegado: se requiere rol ${roles.join(' o ')}` 
            });
        }

        next();
    };
};

/**
 * Middleware para verificar si el usuario es admin
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Acceso denegado: se requiere autenticación' 
        });
    }

    if (req.user.rol !== 'admin') {
        return res.status(403).json({ 
            error: 'Acceso denegado: se requiere rol de administrador' 
        });
    }

    next();
};

/**
 * Middleware para verificar si el usuario tiene permisos de cajero o admin
 */
const requireCajeroOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Acceso denegado: se requiere autenticación' 
        });
    }

    if (!['admin', 'cajero'].includes(req.user.rol)) {
        return res.status(403).json({ 
            error: 'Acceso denegado: se requiere rol de cajero o administrador' 
        });
    }

    next();
};

/**
 * Middleware para verificar si el usuario tiene permisos de invitado, cajero o admin
 */
const requireInvitadoOrCajeroOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Acceso denegado: se requiere autenticación' 
        });
    }

    if (!['admin', 'cajero', 'invitado'].includes(req.user.rol)) {
        return res.status(403).json({ 
            error: 'Acceso denegado: rol no autorizado' 
        });
    }

    next();
};

/**
 * Middleware para verificar permisos específicos por endpoint
 */
const checkPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Acceso denegado: se requiere autenticación' 
            });
        }

        // Definir permisos por rol
        const rolePermissions = {
            admin: [
                'read_users', 'create_users', 'update_users', 'delete_users',
                'read_products', 'create_products', 'update_products', 'delete_products',
                'read_sales', 'create_sales', 'update_sales', 'delete_sales',
                'read_promotions', 'create_promotions', 'update_promotions', 'delete_promotions',
                'read_suppliers', 'create_suppliers', 'update_suppliers', 'delete_suppliers',
                'read_lotes', 'create_lotes', 'update_lotes', 'delete_lotes',
                'read_cierres', 'create_cierres', 'update_cierres', 'delete_cierres',
                'read_operations', 'create_operations', 'update_operations', 'delete_operations',
                'manage_credentials', 'view_logs'
            ],
            cajero: [
                'read_products', 'update_products',
                'read_sales', 'create_sales', 'update_sales',
                'read_promotions',
                'read_lotes',
                'read_cierres', 'create_cierres'
            ],
            invitado: [
                'read_products',
                'read_sales',
                'read_promotions',
                'read_lotes'
            ]
        };

        const userPermissions = rolePermissions[req.user.rol] || [];

        // Verificar si el usuario tiene los permisos requeridos
        const hasPermission = permissions.every(permission => userPermissions.includes(permission));

        if (!hasPermission) {
            return res.status(403).json({ 
                error: 'Acceso denegado: permisos insuficientes para esta operación' 
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    requireAdmin,
    requireCajeroOrAdmin,
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions
};