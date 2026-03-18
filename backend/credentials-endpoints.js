const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database-connection');

// Importar funciones centralizadas de autenticación
const { requireAdmin } = require('./auth-utils');

const router = express.Router();

// Middleware para verificar admin - reutilizable
const requireAdminMiddleware = requireAdmin();

// Endpoint para obtener las credenciales actuales (solo admin)
router.get('/api/credentials', requireAdminMiddleware, async (req, res) => {
    try {
        // El middleware ya verificó las credenciales y el rol de admin
        // req.user contiene el usuario autenticado
        const user = req.user;
        
        // Retornar información del usuario (sin la contraseña)
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
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        console.error('Error obteniendo credenciales:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para cambiar credenciales (solo admin)
router.put('/api/credentials', async (req, res) => {
    try {
        const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

        // Validaciones
        if (!currentUsername || !currentPassword || !newUsername || !newPassword) {
            return res.status(400).json({
                error: 'Todos los campos son requeridos: currentUsername, currentPassword, newUsername, newPassword'
            });
        }

        if (typeof newUsername !== 'string' || newUsername.trim() === '') {
            return res.status(400).json({
                error: 'El nuevo nombre de usuario no puede estar vacío'
            });
        }

        if (typeof newPassword !== 'string' || newPassword.trim() === '') {
            return res.status(400).json({
                error: 'La nueva contraseña no puede estar vacía'
            });
        }

        if (newPassword.length < 3) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 3 caracteres'
            });
        }

        // Verificar que el nuevo username no tenga más de 50 caracteres
        if (newUsername.length > 50) {
            return res.status(400).json({
                error: 'El nombre de usuario no puede tener más de 50 caracteres'
            });
        }

        // Verificar que la nueva contraseña no tenga más de 100 caracteres
        if (newPassword.length > 100) {
            return res.status(400).json({
                error: 'La contraseña no puede tener más de 100 caracteres'
            });
        }

        // Verificar que el nuevo username no sea igual al actual
        if (newUsername === currentUsername) {
            return res.status(400).json({
                error: 'El nuevo nombre de usuario debe ser diferente al actual'
            });
        }

        // Verificar que el nuevo password no sea igual al actual
        if (newPassword === currentPassword) {
            return res.status(400).json({
                error: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // Verificar formato del nuevo username (solo letras, números y guiones bajos)
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            return res.status(400).json({
                error: 'El nombre de usuario solo puede contener letras, números y guiones bajos'
            });
        }

        // Verificar que las credenciales actuales sean correctas
        const user = await db.get("SELECT * FROM usuarios WHERE username = ? AND activo = 1", [currentUsername]);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales actuales incorrectas' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales actuales incorrectas' });
        }

        // Verificar rol de admin
        if (user.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        // Verificar que el nuevo username no exista
        const existingUser = await db.get("SELECT id FROM usuarios WHERE username = ? AND id != ?", [newUsername, user.id]);
        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }

        // Encriptar nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar usuario
        await db.run(
            "UPDATE usuarios SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [newUsername, hashedPassword, user.id]
        );

        // Registrar la operación en el log
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'CREDENCIALES_CAMBIADAS', ?, ?)",
            [newUsername, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        res.json({
            success: true,
            message: 'Credenciales actualizadas exitosamente',
            newUsername: newUsername
        });

    } catch (error) {
        console.error('Error cambiando credenciales:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para listar todos los usuarios (solo admin)
router.get('/api/users', requireAdminMiddleware, async (req, res) => {
    try {
        // El middleware ya verificó las credenciales y el rol de admin
        // req.user contiene el usuario autenticado
        
        // Obtener todos los usuarios
        const users = await db.all("SELECT id, username, nombre_completo, email, rol, activo, created_at, updated_at FROM usuarios ORDER BY username");

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para crear nuevo usuario (solo admin)
router.post('/api/users', requireAdminMiddleware, async (req, res) => {
    try {
        const { username, password, nombre_completo, email, rol } = req.body;

        // req.user contiene el usuario autenticado (ya verificado por el middleware)
        
        // Validaciones
        if (!username || !password || !rol) {
            return res.status(400).json({ error: 'Username, password y rol son requeridos' });
        }

        if (typeof username !== 'string' || username.trim() === '') {
            return res.status(400).json({ error: 'Username no puede estar vacío' });
        }

        if (typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({ error: 'Password no puede estar vacío' });
        }

        if (!['admin', 'cajero', 'invitado'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido. Debe ser: admin, cajero o invitado' });
        }

        if (password.length < 3) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres' });
        }

        if (username.length > 50) {
            return res.status(400).json({ error: 'El nombre de usuario no puede tener más de 50 caracteres' });
        }

        if (password.length > 100) {
            return res.status(400).json({ error: 'La contraseña no puede tener más de 100 caracteres' });
        }

        // Verificar que el username no exista
        const existingUser = await db.get("SELECT id FROM usuarios WHERE username = ?", [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }

        // Encriptar contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const result = await db.run(
            "INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol) VALUES (?, ?, ?, ?, ?)",
            [username.trim(), hashedPassword, nombre_completo || null, email || null, rol]
        );

        // Registrar la operación en el log
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'USUARIO_CREADO', ?, ?)",
            [username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            userId: result.lastID
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para actualizar usuario (solo admin)
router.put('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { nombre_completo, email, rol, activo } = req.body;

        // Verificar autenticación básica del admin
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [adminUsername, adminPassword] = credentials.split(':');

        // Verificar credenciales del admin
        const admin = await db.get("SELECT * FROM usuarios WHERE username = ? AND activo = 1", [adminUsername]);
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        const isValidPassword = await bcrypt.compare(adminPassword, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        // Verificar rol de admin
        if (admin.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        // Verificar que el usuario a actualizar exista
        const user = await db.get("SELECT * FROM usuarios WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Validaciones
        if (rol && !['admin', 'cajero', 'invitado'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido. Debe ser: admin, cajero o invitado' });
        }

        if (activo !== undefined && typeof activo !== 'boolean') {
            return res.status(400).json({ error: 'El campo activo debe ser booleano' });
        }

        // Construir consulta de actualización
        const updates = [];
        const params = [];

        if (nombre_completo !== undefined) {
            updates.push("nombre_completo = ?");
            params.push(nombre_completo);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            params.push(email);
        }
        if (rol !== undefined) {
            updates.push("rol = ?");
            params.push(rol);
        }
        if (activo !== undefined) {
            updates.push("activo = ?");
            params.push(activo ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        params.push(userId);

        const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id = ?`;

        await db.run(query, params);

        // Registrar la operación en el log
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'USUARIO_ACTUALIZADO', ?, ?)",
            [user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para eliminar usuario (solo admin)
router.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Verificar autenticación básica del admin
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [adminUsername, adminPassword] = credentials.split(':');

        // Verificar credenciales del admin
        const admin = await db.get("SELECT * FROM usuarios WHERE username = ? AND activo = 1", [adminUsername]);
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        const isValidPassword = await bcrypt.compare(adminPassword, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        // Verificar rol de admin
        if (admin.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        // Verificar que el usuario a eliminar exista
        const user = await db.get("SELECT * FROM usuarios WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // No permitir eliminar al último admin
        if (user.rol === 'admin') {
            const adminCount = await db.get("SELECT COUNT(*) as count FROM usuarios WHERE rol = 'admin' AND activo = 1");
            if (adminCount.count <= 1) {
                return res.status(400).json({ error: 'No se puede eliminar al último administrador del sistema' });
            }
        }

        // Eliminar usuario (soft delete - desactivar)
        await db.run("UPDATE usuarios SET activo = 0 WHERE id = ?", [userId]);

        // Registrar la operación en el log
        await db.run(
            "INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, 'USUARIO_ELIMINADO', ?, ?)",
            [user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener logs de autenticación (solo admin)
router.get('/api/auth-logs', async (req, res) => {
    try {
        // Verificar autenticación básica del admin
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [adminUsername, adminPassword] = credentials.split(':');

        // Verificar credenciales del admin
        const admin = await db.get("SELECT * FROM usuarios WHERE username = ? AND activo = 1", [adminUsername]);
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        const isValidPassword = await bcrypt.compare(adminPassword, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
        }

        // Verificar rol de admin
        if (admin.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        // Obtener logs de autenticación
        const logs = await db.all(`
            SELECT * FROM auth_logs 
            ORDER BY created_at DESC 
            LIMIT 100
        `);

        res.json({
            success: true,
            logs: logs
        });

    } catch (error) {
        console.error('Error obteniendo logs de autenticación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;