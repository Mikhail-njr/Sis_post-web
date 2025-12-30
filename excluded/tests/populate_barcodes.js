const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

// Leer el archivo SQL y extraer los productos con códigos de barras
function parseInsertProductsSQL() {
    const sqlFile = path.join(__dirname, 'insert_products.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    const products = [];
    const lines = sqlContent.split('\n');

    let inInsert = false;
    let currentInsert = '';

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('INSERT INTO productos')) {
            inInsert = true;
            currentInsert = trimmed;
        } else if (inInsert) {
            currentInsert += ' ' + trimmed;

            if (trimmed.endsWith(');')) {
                // Parsear el INSERT completo
                const match = currentInsert.match(/INSERT INTO productos \(([^)]+)\) VALUES\s*([\s\S]*?);/);
                if (match) {
                    const columns = match[1].split(',').map(col => col.trim());
                    const valuesPart = match[2];

                    // Extraer valores individuales
                    const valueMatches = valuesPart.match(/\(([^)]+)\)/g);
                    if (valueMatches) {
                        for (const valueMatch of valueMatches) {
                            const values = valueMatch.slice(1, -1).split(',').map(val => val.trim().replace(/^'|'$/g, ''));
                            const product = {};
                            columns.forEach((col, index) => {
                                product[col] = values[index] || '';
                            });
                            products.push(product);
                        }
                    }
                }
                inInsert = false;
                currentInsert = '';
            }
        }
    }

    return products;
}

async function populateBarcodes() {
    try {
        console.log('🔄 Iniciando población de códigos de barras...');

        // Obtener productos de referencia del SQL
        const referenceProducts = parseInsertProductsSQL();
        console.log(`📋 Encontrados ${referenceProducts.length} productos de referencia con códigos de barras`);

        // Obtener productos actuales de la base de datos
        const currentProducts = await new Promise((resolve, reject) => {
            db.all("SELECT id, nombre, codigo, codigo_barras FROM productos", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Encontrados ${currentProducts.length} productos en la base de datos`);

        let updated = 0;
        let skipped = 0;

        // Crear mapa de productos por nombre para matching
        const referenceMap = new Map();
        referenceProducts.forEach(product => {
            referenceMap.set(product.nombre.toLowerCase().trim(), product);
        });

        // Actualizar productos que no tienen código de barras
        for (const product of currentProducts) {
            if (!product.codigo_barras || product.codigo_barras.trim() === '') {
                // Buscar match por nombre
                const reference = referenceMap.get(product.nombre.toLowerCase().trim());

                if (reference && reference.codigo_barras) {
                    await new Promise((resolve, reject) => {
                        db.run(
                            "UPDATE productos SET codigo_barras = ? WHERE id = ?",
                            [reference.codigo_barras, product.id],
                            function(err) {
                                if (err) reject(err);
                                else {
                                    console.log(`✅ Actualizado: ${product.nombre} -> ${reference.codigo_barras}`);
                                    updated++;
                                    resolve();
                                }
                            }
                        );
                    });
                } else {
                    console.log(`⚠️ No encontrado código de barras para: ${product.nombre}`);
                    skipped++;
                }
            } else {
                console.log(`ℹ️ Ya tiene código de barras: ${product.nombre} -> ${product.codigo_barras}`);
                skipped++;
            }
        }

        console.log(`\n📈 Resumen:`);
        console.log(`✅ Productos actualizados: ${updated}`);
        console.log(`⏭️ Productos omitidos: ${skipped}`);
        console.log(`🎯 Total procesados: ${currentProducts.length}`);

        if (updated > 0) {
            console.log('\n🔄 Reiniciando servidor recomendado para ver cambios...');
        }

    } catch (error) {
        console.error('❌ Error poblando códigos de barras:', error);
    } finally {
        db.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    populateBarcodes();
}

module.exports = { populateBarcodes };