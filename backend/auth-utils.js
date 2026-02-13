const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de zona horaria del sistema (Argentina)
const SYSTEM_TIMEZONE = 'America/Buenos_Aires';
const SYSTEM_TIMEZONE_OFFSET = -3; // UTC-3

// Conexión a la base de datos
const dbPath = path.join(__dirname, 'pos_database.sqlite');

/**
 * Función para obtener conexión a la base de datos
 */
function getDB() {
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error conectando a SQLite:', err.message);
        }
    });
}

/**
 * Validar usuario y contraseña
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<Object|null>} Usuario autenticado o null
 */
async function validateUser(username, password) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.get(
            `SELECT * FROM usuarios 
             WHERE username = ? AND activo = 1 
             AND (bloqueado_hasta IS NULL OR bloqueado_hasta < datetime('now'))`,
            [username],
            async (err, user) => {
                db.close();
                
                if (err) {
                    console.error('❌ Error validando usuario:', err);
                    return reject(err);
                }
                
                if (!user) {
                    // Registrar intento fallido
                    await logAuthAttempt(username, 'login_fallido', null);
                    return resolve(null);
                }
                
                try {
                    // Comparar contraseñas
                    const isValid = await bcrypt.compare(password, user.password_hash);
                    
                    if (isValid) {
                        // Resetear intentos fallidos y actualizar último acceso
                        await updateUserAccess(user.id);
                        await logAuthAttempt(username, 'login_exitoso', null);
                        resolve(user);
                    } else {
                        // Incrementar intentos fallidos
                        await handleFailedAttempt(user.id, user.intentos_fallidos);
                        await logAuthAttempt(username, 'login_fallido', null);
                        resolve(null);
                    }
                } catch (error) {
                    console.error('❌ Error comparando contraseñas:', error);
                    reject(error);
                }
            }
        );
    });
}

/**
 * Incrementar intentos fallidos y bloquear si es necesario
 * @param {number} userId - ID del usuario
 * @param {number} currentAttempts - Intentos fallidos actuales
 */
async function handleFailedAttempt(userId, currentAttempts) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const newAttempts = (currentAttempts || 0) + 1;
        let bloqueadoHasta = null;
        
        // Bloquear por 15 minutos después de 5 intentos fallidos
        if (newAttempts >= 5) {
            bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        
        db.run(
            `UPDATE usuarios 
             SET intentos_fallidos = ?, bloqueado_hasta = ?
             WHERE id = ?`,
            [newAttempts, bloqueadoHasta, userId],
            (err) => {
                db.close();
                if (err) {
                    console.error('❌ Error actualizando intentos fallidos:', err);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Resetear intentos fallidos y actualizar último acceso
 * @param {number} userId - ID del usuario
 */
async function updateUserAccess(userId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.run(
            `UPDATE usuarios 
             SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = datetime('now')
             WHERE id = ?`,
            [userId],
            (err) => {
                db.close();
                if (err) {
                    console.error('❌ Error actualizando acceso de usuario:', err);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Registrar intento de autenticación
 * @param {string} username - Nombre de usuario
 * @param {string} tipoEvento - Tipo de evento
 * @param {Object} req - Request object (opcional)
 */
async function logAuthAttempt(username, tipoEvento, req) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const ipAddress = req ? req.ip || req.connection.remoteAddress : null;
        const userAgent = req ? req.get('User-Agent') : null;
        
        db.run(
            `INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent)
             VALUES (?, ?, ?, ?)`,
            [username, tipoEvento, ipAddress, userAgent],
            (err) => {
                db.close();
                if (err) {
                    console.error('❌ Error registrando log de autenticación:', err);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Obtener usuario por ID
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object|null>} Usuario o null
 */
async function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.get(
            `SELECT id, username, nombre_completo, email, rol, activo, created_at, ultimo_acceso
             FROM usuarios WHERE id = ?`,
            [userId],
            (err, user) => {
                db.close();
                if (err) {
                    console.error('❌ Error obteniendo usuario por ID:', err);
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

/**
 * Obtener usuario por username
 * @param {string} username - Nombre de usuario
 * @returns {Promise<Object|null>} Usuario o null
 */
async function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.get(
            `SELECT id, username, nombre_completo, email, rol, activo, created_at, ultimo_acceso
             FROM usuarios WHERE username = ?`,
            [username],
            (err, user) => {
                db.close();
                if (err) {
                    console.error('❌ Error obteniendo usuario por username:', err);
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

/**
 * Crear nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} Usuario creado
 */
async function createUser(userData) {
    return new Promise(async (resolve, reject) => {
        const { username, password, nombre_completo, email, rol = 'cajero' } = userData;
        
        // Validar datos
        if (!username || !password || !nombre_completo) {
            return reject(new Error('Username, password y nombre_completo son requeridos'));
        }
        
        if (!['admin', 'cajero', 'invitado'].includes(rol)) {
            return reject(new Error('Rol inválido'));
        }
        
        try {
            // Encriptar contraseña
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            
            const db = getDB();
            
            db.run(
                `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol)
                 VALUES (?, ?, ?, ?, ?)`,
                [username, passwordHash, nombre_completo, email || null, rol],
                function(err) {
                    db.close();
                    if (err) {
                        console.error('❌ Error creando usuario:', err);
                        reject(err);
                    } else {
                        resolve({
                            id: this.lastID,
                            username,
                            nombre_completo,
                            email,
                            rol,
                            activo: 1
                        });
                    }
                }
            );
            
        } catch (error) {
            console.error('❌ Error encriptando contraseña:', error);
            reject(error);
        }
    });
}

/**
 * Actualizar usuario
 * @param {number} userId - ID del usuario
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} Usuario actualizado
 */
async function updateUser(userId, updates) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        // Construir consulta dinámica
        const fields = [];
        const values = [];
        
        if (updates.nombre_completo) {
            fields.push('nombre_completo = ?');
            values.push(updates.nombre_completo);
        }
        
        if (updates.email) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        
        if (updates.rol && ['admin', 'cajero', 'invitado'].includes(updates.rol)) {
            fields.push('rol = ?');
            values.push(updates.rol);
        }
        
        if (updates.activo !== undefined) {
            fields.push('activo = ?');
            values.push(updates.activo ? 1 : 0);
        }
        
        if (fields.length === 0) {
            db.close();
            return reject(new Error('No hay campos para actualizar'));
        }
        
        values.push(userId);
        
        db.run(
            `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`,
            values,
            function(err) {
                db.close();
                if (err) {
                    console.error('❌ Error actualizando usuario:', err);
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('Usuario no encontrado'));
                } else {
                    resolve({ id: userId, ...updates });
                }
            }
        );
    });
}

/**
 * Cambiar contraseña de usuario
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<boolean>} Éxito o fracaso
 */
async function changePassword(userId, newPassword) {
    return new Promise(async (resolve, reject) => {
        if (!newPassword || newPassword.length < 3) {
            return reject(new Error('La nueva contraseña debe tener al menos 3 caracteres'));
        }
        
        try {
            // Encriptar nueva contraseña
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);
            
            const db = getDB();
            
            db.run(
                `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
                [passwordHash, userId],
                function(err) {
                    db.close();
                    if (err) {
                        console.error('❌ Error cambiando contraseña:', err);
                        reject(err);
                    } else if (this.changes === 0) {
                        reject(new Error('Usuario no encontrado'));
                    } else {
                        resolve(true);
                    }
                }
            );
            
        } catch (error) {
            console.error('❌ Error encriptando nueva contraseña:', error);
            reject(error);
        }
    });
}

/**
 * Eliminar usuario (desactivar)
 * @param {number} userId - ID del usuario
 * @returns {Promise<boolean>} Éxito o fracaso
 */
async function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.run(
            `UPDATE usuarios SET activo = 0 WHERE id = ?`,
            [userId],
            function(err) {
                db.close();
                if (err) {
                    console.error('❌ Error desactivando usuario:', err);
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('Usuario no encontrado'));
                } else {
                    resolve(true);
                }
            }
        );
    });
}

/**
 * Obtener todos los usuarios (para administración)
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Lista de usuarios
 */
async function getAllUsers(filters = {}) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        let whereClause = '';
        let params = [];
        
        if (filters.activo !== undefined) {
            whereClause += ' WHERE activo = ?';
            params.push(filters.activo ? 1 : 0);
        }
        
        if (filters.rol) {
            whereClause += whereClause ? ' AND rol = ?' : ' WHERE rol = ?';
            params.push(filters.rol);
        }
        
        db.all(
            `SELECT id, username, nombre_completo, email, rol, activo, created_at, ultimo_acceso
             FROM usuarios ${whereClause} ORDER BY created_at DESC`,
            params,
            (err, users) => {
                db.close();
                if (err) {
                    console.error('❌ Error obteniendo usuarios:', err);
                    reject(err);
                } else {
                    resolve(users);
                }
            }
        );
    });
}

/**
 * Verificar si el usuario está bloqueado
 * @param {string} username - Nombre de usuario
 * @returns {Promise<boolean>} Está bloqueado o no
 */
async function isUserBlocked(username) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        
        db.get(
            `SELECT bloqueado_hasta FROM usuarios 
             WHERE username = ? AND activo = 1`,
            [username],
            (err, user) => {
                db.close();
                if (err) {
                    console.error('❌ Error verificando bloqueo de usuario:', err);
                    reject(err);
                } else {
                    if (!user) {
                        resolve(false);
                    } else {
                        const isBlocked = user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date();
                        resolve(isBlocked);
                    }
                }
            }
        );
    });
}

module.exports = {
    validateUser,
    getUserById,
    getUserByUsername,
    createUser,
    updateUser,
    changePassword,
    deleteUser,
    getAllUsers,
    isUserBlocked,
    logAuthAttempt
};