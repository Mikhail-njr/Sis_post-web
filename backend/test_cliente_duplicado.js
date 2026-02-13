const Database = require('./database-sqlite');

/**
 * Script para probar la detección de clientes duplicados
 * y mostrar qué campo está duplicado
 */

// Simular la creación de un cliente con DNI duplicado
const testDniDuplicado = () => {
    return new Promise((resolve, reject) => {
        const db = Database.getDB();
        const dniExistente = '12345678';
        const telefonoNuevo = '5551234';
        
        // Insertar un cliente de prueba
        const insertQuery = `
            INSERT INTO clientes (nombre, telefono, dni, direccion, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(insertQuery, ['Cliente Prueba', '5550000', dniExistente, 'Dirección 123'], function(err) {
            if (err) {
                return reject(err);
            }
            
            console.log('✅ Cliente de prueba creado con DNI:', dniExistente);
            
            // Intentar crear otro cliente con el mismo DNI
            const checkQuery = `
                SELECT id, nombre, dni, telefono
                FROM clientes
                WHERE (dni = ? OR telefono = ?) AND activo = 1
            `;
            
            db.get(checkQuery, [dniExistente, telefonoNuevo], (err, existingClient) => {
                if (err) {
                    return reject(err);
                }
                
                if (existingClient) {
                    let campoDuplicado = '';
                    if (existingClient.dni === dniExistente) {
                        campoDuplicado = 'DNI';
                    } else if (existingClient.telefono === telefonoNuevo) {
                        campoDuplicado = 'teléfono';
                    }
                    
                    console.log('⚠️ Cliente duplicado detectado:');
                    console.log(`   Campo duplicado: ${campoDuplicado}`);
                    console.log(`   Valor duplicado: ${campoDuplicado === 'DNI' ? dniExistente : telefonoNuevo}`);
                    console.log(`   Cliente existente: ${existingClient.nombre} (ID: ${existingClient.id})`);
                    
                    resolve();
                } else {
                    console.log('❌ No se encontró cliente duplicado');
                    resolve();
                }
            });
        });
    });
};

// Ejecutar la prueba
testDniDuplicado()
    .then(() => {
        console.log('\n📋 Prueba completada');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });