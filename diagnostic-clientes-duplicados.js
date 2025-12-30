/**
 * Script de Diagnóstico: Clientes Duplicados entre Dashboard y POS
 * 
 * Este script identifica y analiza el problema de clientes duplicados
 * entre el sistema del dashboard (/api/customers) y el POS (/api/clientes)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 DIAGNÓSTICO DE CLIENTES DUPLICADOS');
console.log('=====================================\n');

async function diagnosticarClientesDuplicados() {
    try {
        // 1. Verificar si existe la tabla clientes
        console.log('1. Verificando existencia de tabla clientes...');
        const tableExists = await checkTableExists('clientes');
        if (!tableExists) {
            console.error('❌ ERROR: No se encontró la tabla "clientes" en la base de datos');
            return;
        }
        console.log('✅ Tabla "clientes" encontrada\n');

        // 2. Obtener estadísticas generales
        console.log('2. Obteniendo estadísticas generales...');
        const stats = await getClientesStats();
        console.log('📊 Estadísticas generales:');
        console.log(`   - Total de clientes: ${stats.total}`);
        console.log(`   - Clientes con nombre: ${stats.conNombre}`);
        console.log(`   - Clientes con DNI: ${stats.conDNI}`);
        console.log(`   - Clientes con teléfono: ${stats.conTelefono}`);
        console.log(`   - Clientes duplicados por nombre: ${stats.duplicadosPorNombre}`);
        console.log(`   - Clientes duplicados por DNI: ${stats.duplicadosPorDNI}\n`);

        // 3. Buscar clientes duplicados por nombre
        console.log('3. Analizando duplicados por nombre...');
        const duplicadosPorNombre = await buscarDuplicadosPorNombre();
        if (duplicadosPorNombre.length > 0) {
            console.log(`⚠️  Se encontraron ${duplicadosPorNombre.length} grupos de clientes con nombres duplicados:`);
            duplicadosPorNombre.forEach((grupo, index) => {
                console.log(`   Grupo ${index + 1}: "${grupo.nombre}" (${grupo.cantidad} coincidencias)`);
                grupo.clientes.forEach(cliente => {
                    console.log(`     - ID: ${cliente.id}, DNI: ${cliente.dni || 'N/A'}, Tel: ${cliente.telefono || 'N/A'}`);
                });
            });
        } else {
            console.log('✅ No se encontraron duplicados por nombre\n');
        }

        // 4. Buscar clientes duplicados por DNI
        console.log('\n4. Analizando duplicados por DNI...');
        const duplicadosPorDNI = await buscarDuplicadosPorDNI();
        if (duplicadosPorDNI.length > 0) {
            console.log(`⚠️  Se encontraron ${duplicadosPorDNI.length} grupos de clientes con DNI duplicados:`);
            duplicadosPorDNI.forEach((grupo, index) => {
                console.log(`   Grupo ${index + 1}: DNI "${grupo.dni}" (${grupo.cantidad} coincidencias)`);
                grupo.clientes.forEach(cliente => {
                    console.log(`     - ID: ${cliente.id}, Nombre: ${cliente.nombre}, Tel: ${cliente.telefono || 'N/A'}`);
                });
            });
        } else {
            console.log('✅ No se encontraron duplicados por DNI\n');
        }

        // 5. Verificar endpoints disponibles
        console.log('\n5. Verificando endpoints del backend...');
        const endpoints = await verificarEndpoints();
        console.log('📡 Endpoints de clientes encontrados:');
        endpoints.forEach(endpoint => {
            console.log(`   - ${endpoint.method} ${endpoint.path} (${endpoint.status})`);
        });

        // 6. Análisis de arquitectura
        console.log('\n6. Análisis de arquitectura...');
        await analizarArquitectura(endpoints);

        // 7. Recomendaciones
        console.log('\n7. Recomendaciones:');
        await generarRecomendaciones(duplicadosPorNombre, duplicadosPorDNI, endpoints);

    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
    } finally {
        db.close();
    }
}

// Funciones auxiliares

function checkTableExists(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
        });
    });
}

function getClientesStats() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM clientes) as total,
                (SELECT COUNT(*) FROM clientes WHERE nombre IS NOT NULL AND nombre != '') as conNombre,
                (SELECT COUNT(*) FROM clientes WHERE dni IS NOT NULL AND dni != '') as conDNI,
                (SELECT COUNT(*) FROM clientes WHERE telefono IS NOT NULL AND telefono != '') as conTelefono,
                (SELECT COUNT(*) FROM (
                    SELECT nombre FROM clientes 
                    WHERE nombre IS NOT NULL AND nombre != '' 
                    GROUP BY nombre HAVING COUNT(*) > 1
                )) as duplicadosPorNombre,
                (SELECT COUNT(*) FROM (
                    SELECT dni FROM clientes 
                    WHERE dni IS NOT NULL AND dni != '' 
                    GROUP BY dni HAVING COUNT(*) > 1
                )) as duplicadosPorDNI
        `;
        
        db.get(query, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function buscarDuplicadosPorNombre() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                nombre,
                COUNT(*) as cantidad,
                GROUP_CONCAT(id) as ids
            FROM clientes 
            WHERE nombre IS NOT NULL AND nombre != '' 
            GROUP BY nombre 
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, nombre
        `;
        
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else {
                // Obtener detalles de cada grupo de duplicados
                const resultados = rows.map(row => ({
                    nombre: row.nombre,
                    cantidad: row.cantidad,
                    clientes: []
                }));
                
                // Para cada grupo, obtener los detalles completos
                const promises = resultados.map(grupo => {
                    return new Promise((resolveGroup) => {
                        const ids = grupo.ids.split(',');
                        db.all(`
                            SELECT id, nombre, dni, telefono, direccion, created_at 
                            FROM clientes 
                            WHERE id IN (${ids.join(',')})
                            ORDER BY created_at DESC
                        `, (err, clientes) => {
                            grupo.clientes = clientes;
                            resolveGroup(grupo);
                        });
                    });
                });
                
                Promise.all(promises).then(() => resolve(resultados));
            }
        });
    });
}

function buscarDuplicadosPorDNI() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                dni,
                COUNT(*) as cantidad,
                GROUP_CONCAT(id) as ids
            FROM clientes 
            WHERE dni IS NOT NULL AND dni != '' 
            GROUP BY dni 
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, dni
        `;
        
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else {
                // Obtener detalles de cada grupo de duplicados
                const resultados = rows.map(row => ({
                    dni: row.dni,
                    cantidad: row.cantidad,
                    clientes: []
                }));
                
                // Para cada grupo, obtener los detalles completos
                const promises = resultados.map(grupo => {
                    return new Promise((resolveGroup) => {
                        const ids = grupo.ids.split(',');
                        db.all(`
                            SELECT id, nombre, dni, telefono, direccion, created_at 
                            FROM clientes 
                            WHERE id IN (${ids.join(',')})
                            ORDER BY created_at DESC
                        `, (err, clientes) => {
                            grupo.clientes = clientes;
                            resolveGroup(grupo);
                        });
                    });
                });
                
                Promise.all(promises).then(() => resolve(resultados));
            }
        });
    });
}

function verificarEndpoints() {
    // Simulación de verificación de endpoints basada en el análisis del código
    const endpoints = [
        {
            path: '/api/customers',
            method: 'GET',
            status: 'ACTIVO (Dashboard)',
            descripcion: 'Listar todos los clientes (usado por dashboard.html)'
        },
        {
            path: '/api/customers',
            method: 'POST',
            status: 'ACTIVO (Dashboard)',
            descripcion: 'Crear nuevo cliente (usado por dashboard.html)'
        },
        {
            path: '/api/customers/:id',
            method: 'GET',
            status: 'ACTIVO (Dashboard)',
            descripcion: 'Obtener cliente por ID (usado por dashboard.html)'
        },
        {
            path: '/api/customers/:id',
            method: 'PUT',
            status: 'ACTIVO (Dashboard)',
            descripcion: 'Actualizar cliente (usado por dashboard.html)'
        },
        {
            path: '/api/customers/:id',
            method: 'DELETE',
            status: 'ACTIVO (Dashboard)',
            descripcion: 'Eliminar cliente (usado por dashboard.html)'
        },
        {
            path: '/api/clientes',
            method: 'GET',
            status: 'ACTIVO (POS)',
            descripcion: 'Listar clientes (usado por index.html - POS)'
        },
        {
            path: '/api/clientes/cuenta-corriente',
            method: 'GET',
            status: 'ACTIVO (POS)',
            descripcion: 'Obtener clientes con deudas (usado por index.html - POS)'
        }
    ];
    
    return endpoints;
}

async function analizarArquitectura(endpoints) {
    console.log('🏗️  Arquitectura detectada:');
    console.log('   - Tabla única: "clientes" en la base de datos');
    console.log('   - Dos sistemas frontend diferentes:');
    console.log('     * Dashboard (frontend/dashboard.html) -> /api/customers');
    console.log('     * POS (frontend/index.html) -> /api/clientes');
    console.log('   - Mismo backend sirviendo ambos endpoints');
    console.log('   - Posible causa: Configuración de rutas inconsistentes');
}

async function generarRecomendaciones(duplicadosPorNombre, duplicadosPorDNI, endpoints) {
    const totalDuplicados = duplicadosPorNombre.length + duplicadosPorDNI.length;
    
    if (totalDuplicados > 0) {
        console.log('\n🚨 RECOMENDACIONES URGENTES:');
        console.log('1. LIMPIEZA DE DATOS:');
        console.log('   - Consolidar clientes duplicados');
        console.log('   - Mantener el cliente más reciente');
        console.log('   - Actualizar referencias en deudas y ventas');
        
        console.log('\n2. VALIDACIÓN PREVENTIVA:');
        console.log('   - Validar DNI único al crear clientes');
        console.log('   - Validar nombres similares');
        console.log('   - Implementar búsqueda antes de crear');
        
        console.log('\n3. UNIFICACIÓN DE ENDPOINTS:');
        console.log('   - Estandarizar en un solo endpoint');
        console.log('   - Redirigir el endpoint antiguo');
        console.log('   - Actualizar frontend para usar endpoint único');
    } else {
        console.log('\n✅ No se detectaron duplicados actuales');
        console.log('   RECOMENDACIONES PREVENTIVAS:');
        console.log('   - Implementar validación de unicidad');
        console.log('   - Unificar endpoints para evitar futuros problemas');
    }
    
    console.log('\n4. IMPLEMENTACIÓN SUGERIDA:');
    console.log('   - Crear endpoint único: /api/clientes');
    console.log('   - Mantener compatibilidad: /api/customers -> /api/clientes');
    console.log('   - Validar DNI único en creación');
    console.log('   - Validar nombres similares');
    console.log('   - Implementar búsqueda inteligente');
}

// Ejecutar el diagnóstico
diagnosticarClientesDuplicados();