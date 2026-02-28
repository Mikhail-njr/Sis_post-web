const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Agregando producto escaneado con código de barras 7790895000782...');

async function addScannedProduct() {
    try {
        // Verificar si el producto ya existe
        const existingProduct = await new Promise((resolve, reject) => {
            db.get('SELECT id, nombre FROM productos WHERE codigo_barras = ?', ['7790895000782'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingProduct) {
            console.log(`⚠️ El producto ya existe: ${existingProduct.nombre} (ID: ${existingProduct.id})`);
            return;
        }

        // Insertar el producto
        const productResult = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras, activo, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'PROD-ESC-001',
                    'Producto Escaneado (Coca Cola Light 2.25L)', // Asumiendo que es este producto basado en el código similar
                    2600, // Precio similar a otras gaseosas
                    0, // Stock inicial 0
                    'Bebidas',
                    '7790895000782',
                    1, // activo
                    new Date().toISOString(),
                    new Date().toISOString()
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        console.log(`✅ Producto insertado con ID: ${productResult.id}`);

        // Crear un lote para el producto
        const loteResult = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_actual, costo_adquisicion, estado, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    productResult.id,
                    'LOTE-ESC-001',
                    '2026-12-31', // Fecha de vencimiento futura
                    50, // Cantidad inicial
                    2000, // Costo de adquisición
                    'activo',
                    new Date().toISOString()
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        console.log(`✅ Lote creado con ID: ${loteResult.id}`);

        // Actualizar el stock del producto
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE productos SET stock = ? WHERE id = ?',
                [50, productResult.id],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        console.log('✅ Stock del producto actualizado');
        console.log('🎉 Producto agregado exitosamente a la base de datos!');
        console.log('📱 Ahora puedes escanear el código 7790895000782 y se agregará al carrito.');

    } catch (error) {
        console.error('❌ Error agregando producto:', error);
    } finally {
        db.close();
    }
}

// Ejecutar la función
addScannedProduct();