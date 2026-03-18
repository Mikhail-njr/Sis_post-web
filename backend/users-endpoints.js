const express = require('express');
const bcrypt = require('bcrypt');
const { 
    validateUser, 
    getUserById, 
    getUserByUsername, 
    createUser, 
    updateUser, 
    changePassword, 
    deleteUser, 
    getAllUsers,
    isUserBlocked,
    logAuthAttempt,
    // Nuevas funciones centralizadas
    extractBasicAuth,
    validateBasicAuthCredentials,
    requireAdmin,
    requireAuth
} = require('./auth-utils');

const router = express.Router();

// Middleware para proteger rutas (solo admins pueden gestionar usuarios) - REFACTORIZADO
const requireAdminMiddleware = requireAdmin();

// Middleware para validar credenciales en endpoints de autenticación - REFACTORIZADO
const validateCredentialsMiddleware = requireAuth();

// Endpoint de login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username y password son requeridos' 
            });
        }

        // Verificar si el usuario está bloqueado
        const isBlocked = await isUserBlocked(username);
        if (isBlocked) {
            return res.status(423).json({ 
                success: false,
                error: 'Cuenta bloqueada por intentos fallidos. Intente nuevamente más tarde.' 
            });
        }

        const user = await validateUser(username, password, req);

        if (user) {
            // Crear token básico (en una implementación real usarías JWT)
            const token = Buffer.from(`${user.username}:${user.password_hash}`).toString('base64');
            
            res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    id: user.id,
                    username: user.username,
                    nombre_completo: user.nombre_completo,
                    email: user.email,
                    rol: user.rol
                },
                token: token
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para cambiar contraseña
router.post('/change-password', validateCredentialsMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Contraseña actual y nueva contraseña son requeridas'
            });
        }

        if (newPassword.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 3 caracteres'
            });
        }

        // Verificar contraseña actual
        const user = await getUserById(userId);
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña actual es incorrecta'
            });
        }

        // Cambiar contraseña
        await changePassword(userId, newPassword);

        // Registrar el cambio
        await logAuthAttempt(user.username, 'cambio_clave', req);

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para obtener perfil de usuario
router.get('/profile', validateCredentialsMiddleware, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                nombre_completo: user.nombre_completo,
                email: user.email,
                rol: user.rol,
                activo: user.activo,
                created_at: user.created_at,
                ultimo_acceso: user.ultimo_acceso
            }
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para actualizar perfil (solo el usuario puede actualizar su propio perfil)
router.put('/profile', validateCredentialsMiddleware, async (req, res) => {
    try {
        const { nombre_completo, email } = req.body;
        const userId = req.user.id;

        if (!nombre_completo) {
            return res.status(400).json({
                success: false,
                error: 'Nombre completo es requerido'
            });
        }

        const updates = { nombre_completo, email };
        await updateUser(userId, updates);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para gestionar usuarios (solo admins)
router.get('/users', requireAdminMiddleware, async (req, res) => {
    try {
        const { activo, rol } = req.query;
        const filters = {};
        
        if (activo !== undefined) filters.activo = activo === 'true';
        if (rol) filters.rol = rol;

        const users = await getAllUsers(filters);

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para crear usuario (solo admins)
router.post('/users', requireAdminMiddleware, async (req, res) => {
    try {
        const { username, password, nombre_completo, email, rol } = req.body;

        if (!username || !password || !nombre_completo) {
            return res.status(400).json({
                success: false,
                error: 'Username, password y nombre_completo son requeridos'
            });
        }

        const newUser = await createUser({
            username,
            password,
            nombre_completo,
            email,
            rol: rol || 'cajero'
        });

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: newUser
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para actualizar usuario (solo admins)
router.put('/users/:id', requireAdminMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const updates = req.body;

        // Validar que no se pueda cambiar el username
        if (updates.username) {
            return res.status(400).json({
                success: false,
                error: 'No se puede cambiar el username'
            });
        }

        await updateUser(userId, updates);

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para eliminar usuario (desactivar, solo admins)
router.delete('/users/:id', requireAdminMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // No permitir que un admin se elimine a sí mismo
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'No puedes desactivar tu propia cuenta'
            });
        }

        await deleteUser(userId);

        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para resetear intentos fallidos (solo admins)
router.post('/users/:id/reset-attempts', requireAdminMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        const { getDB } = require('./auth-utils');
        const db = getDB();
        
        db.run(
            `UPDATE usuarios 
             SET intentos_fallidos = 0, bloqueado_hasta = NULL
             WHERE id = ?`,
            [userId],
            function(err) {
                db.close();
                if (err) {
                    console.error('Error reseteando intentos:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Error interno del servidor'
                    });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Usuario no encontrado'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Intentos fallidos reseteados exitosamente'
                });
            }
        );

    } catch (error) {
        console.error('Error reseteando intentos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para obtener logs de autenticación (solo admins)
router.get('/auth-logs', requireAdminMiddleware, async (req, res) => {
    try {
        const { username, tipoEvento, limit = 100 } = req.query;
        
        const db = require('./auth-utils').getDB;
        let whereClause = '';
        let params = [];
        
        if (username) {
            whereClause += ' WHERE username = ?';
            params.push(username);
        }
        
        if (tipoEvento) {
            whereClause += whereClause ? ' AND tipo_evento = ?' : ' WHERE tipo_evento = ?';
            params.push(tipoEvento);
        }
        
        params.push(parseInt(limit));
        
        db.all(
            `SELECT * FROM auth_logs ${whereClause} 
             ORDER BY created_at DESC LIMIT ?`,
            params,
            (err, logs) => {
                db.close();
                if (err) {
                    console.error('Error obteniendo logs:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Error interno del servidor'
                    });
                }
                
                res.json({
                    success: true,
                    logs: logs
                });
            }
        );

    } catch (error) {
        console.error('Error obteniendo logs de autenticación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;