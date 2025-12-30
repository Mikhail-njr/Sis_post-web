// Script para crear un producto sin stock y probar la funcionalidad
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

async function createProductWithoutStock() {
    try {
        console.log('🧪 Creando producto de prueba sin stock...\n');

        // Crear un producto de prueba
        const testBarcode = '1234567890128'; // EAN-13 válido
        const result = await dbRun(
            "INSERT OR REPLACE INTO productos (codigo, nombre, descripcion, precio, stock, categoria, codigo_barras) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ['TEST-001', 'Producto de Prueba Sin Stock', 'Producto para testing', 100.00, 0, 'Testing', testBarcode]
        );

        console.log(`✅ Producto de prueba creado con ID: ${result.id}`);
        console.log(`📦 Código de barras: ${testBarcode}`);

        // Verificar que no tenga lotes
        const lotes = await dbAll("SELECT * FROM lotes WHERE producto_id = ?", [result.id]);
        console.log(`📊 Lotes encontrados: ${lotes.length}`);

        return testBarcode;

    } catch (error) {
        console.error('❌ Error creando producto de prueba:', error.message);
        throw error;
    }
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function testNoStockResponse(barcode) {
    const http = require('http');

    console.log(`\n🔍 Probando código de barras sin stock: ${barcode}`);

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/products/search-by-barcode/${barcode}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            console.log(`📡 Estado HTTP: ${res.statusCode}`);

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`📦 Respuesta:`, JSON.stringify(jsonData, null, 2));

                    if (jsonData.found) {
                        console.log(`✅ Producto encontrado: ${jsonData.product.nombre}`);
                        console.log(`📊 Estado: ${jsonData.status}`);
                        console.log(`💬 Mensaje: ${jsonData.status_message}`);

                        if (jsonData.status === 'sin_stock') {
                            console.log('🎯 ¡Éxito! El producto se reporta correctamente como sin stock');
                            resolve(true);
                        } else {
                            console.log('⚠️ El producto no se reporta como sin stock');
                            resolve(false);
                        }
                    } else {
                        console.log('❌ Producto no encontrado');
                        resolve(false);
                    }
                } catch (parseError) {
                    console.error('❌ Error parseando respuesta JSON:', parseError.message);
                    reject(parseError);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Error en la petición HTTP:', error.message);
            reject(error);
        });

        req.setTimeout(5000, () => {
            console.error('❌ Timeout en la petición HTTP');
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function main() {
    try {
        const testBarcode = await createProductWithoutStock();
        await testNoStockResponse(testBarcode);

        // Cerrar la base de datos
        db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err.message);
            } else {
                console.log('✅ Base de datos cerrada');
            }
        });

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
        db.close();
    }
}

main();