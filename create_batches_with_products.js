/**
 * Script para crear 5 lotes con 5 productos cada uno
 * Seleccionando proveedores existentes
 */

const { createDatabaseConnection } = require('./shared/database-connection');
const { createLote, updateProductStock, updateProductLoteActual } = require('./shared/lote-queries');
const { findProductsByName } = require('./shared/product-queries');

async function createBatchesWithProducts() {
    try {
        console.log('🚀 Iniciando creación de lotes con productos...');
        
        // Conectar a la base de datos
        const db = createDatabaseConnection();
        
        // 1. Obtener proveedores existentes
        console.log('📋 Obteniendo proveedores existentes...');
        const suppliers = await new Promise((resolve, reject) => {
            db.all("SELECT id, nombre_proveedor FROM proveedores ORDER BY nombre_proveedor", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (suppliers.length === 0) {
            console.log('❌ No hay proveedores disponibles. Creando proveedores de prueba...');
            await createTestSuppliers(db);
            // Obtener proveedores nuevamente
            const newSuppliers = await new Promise((resolve, reject) => {
                db.all("SELECT id, nombre_proveedor FROM proveedores ORDER BY nombre_proveedor", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            suppliers.push(...newSuppliers);
        }
        
        console.log(`✅ Proveedores disponibles: ${suppliers.length}`);
        suppliers.forEach((supplier, index) => {
            console.log(`   ${index + 1}. ${supplier.nombre_proveedor} (ID: ${supplier.id})`);
        });
        
        // 2. Obtener productos existentes
        console.log('📦 Obteniendo productos existentes...');
        const products = await new Promise((resolve, reject) => {
            db.all("SELECT id, nombre, codigo, categoria, stock FROM productos WHERE stock > 0 ORDER BY nombre LIMIT 25", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (products.length < 25) {
            console.log(`⚠️ Solo hay ${products.length} productos con stock. Necesitamos al menos 25 productos para crear 5 lotes de 5 productos cada uno.`);
            console.log('📦 Creando productos adicionales...');
            await createAdditionalProducts(db, products.length);
            // Obtener productos nuevamente
            const newProducts = await new Promise((resolve, reject) => {
                db.all("SELECT id, nombre, codigo, categoria, stock FROM productos WHERE stock > 0 ORDER BY nombre", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            products.length = 0;
            products.push(...newProducts);
        }
        
        console.log(`✅ Productos disponibles: ${products.length}`);
        
        // 3. Crear 5 lotes con 5 productos cada uno
        console.log('🔄 Creando 5 lotes con 5 productos cada uno...');
        
        for (let loteIndex = 0; loteIndex < 5; loteIndex++) {
            console.log(`\n📦 Creando Lote ${loteIndex + 1}:`);
            
            // Seleccionar 5 productos para este lote
            const loteProducts = [];
            for (let i = 0; i < 5; i++) {
                const productIndex = loteIndex * 5 + i;
                if (productIndex >= products.length) {
                    console.log(`⚠️ No hay suficientes productos. Solo se crearán ${loteProducts.length} productos para este lote.`);
                    break;
                }
                loteProducts.push(products[productIndex]);
            }
            
            // Seleccionar un proveedor aleatorio para este lote
            const supplierIndex = loteIndex % suppliers.length;
            const selectedSupplier = suppliers[supplierIndex];
            
            console.log(`   🏢 Proveedor: ${selectedSupplier.nombre_proveedor}`);
            console.log(`   📋 Productos: ${loteProducts.length}`);
            
            // Crear un lote para cada producto
            for (const product of loteProducts) {
                console.log(`   🔄 Creando lote para producto: ${product.nombre}`);
                
                // Generar número de lote único
                const loteNumber = `LOTE-${selectedSupplier.id.toString().padStart(3, '0')}-${product.id.toString().padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
                
                // Fecha de vencimiento (30-90 días desde ahora)
                const today = new Date();
                const expirationDate = new Date(today);
                expirationDate.setDate(today.getDate() + 30 + Math.floor(Math.random() * 60));
                const expirationDateStr = expirationDate.toISOString().split('T')[0];
                
                // Cantidad inicial (10-50 unidades)
                const initialQuantity = Math.floor(Math.random() * 41) + 10;
                
                // Costo unitario (70-90% del precio de venta)
                const unitCost = product.precio * (0.7 + Math.random() * 0.2);
                
                // Crear el lote
                const loteResult = await createLote(db, {
                    producto_id: product.id,
                    numero_lote: loteNumber,
                    fecha_vencimiento: expirationDateStr,
                    cantidad_inicial: initialQuantity,
                    cantidad_actual: initialQuantity,
                    costo_unitario: unitCost,
                    notas: `Lote creado automáticamente - Proveedor: ${selectedSupplier.nombre_proveedor}`
                });
                
                console.log(`   ✅ Lote creado: ${loteNumber} (ID: ${loteResult.id})`);
                
                // Actualizar stock del producto
                await updateProductStock(db, product.id, initialQuantity);
                console.log(`   📈 Stock actualizado: +${initialQuantity} unidades`);
                
                // Actualizar lote actual del producto
                await updateProductLoteActual(db, product.id, loteResult.id);
                console.log(`   🔄 Lote actual configurado para el producto`);
                
                // Registrar la operación en el log
                await logOperation(db, 'LOTE_CREADO', 
                    `Lote creado: ${loteNumber} para producto ${product.nombre} (Proveedor: ${selectedSupplier.nombre_proveedor})`,
                    'Sistema', 'lotes', loteResult.id, null, {
                        producto_id: product.id,
                        producto_nombre: product.nombre,
                        proveedor_id: selectedSupplier.id,
                        proveedor_nombre: selectedSupplier.nombre_proveedor,
                        numero_lote: loteNumber,
                        fecha_vencimiento: expirationDateStr,
                        cantidad_inicial: initialQuantity,
                        costo_unitario: unitCost
                    });
            }
            
            console.log(`✅ Lote ${loteIndex + 1} completado con ${loteProducts.length} productos`);
        }
        
        console.log('\n🎉 ¡Todos los lotes creados exitosamente!');
        console.log('✅ Se han creado 5 lotes con 5 productos cada uno');
        console.log('✅ Cada lote está asociado a un proveedor existente');
        console.log('✅ El stock de los productos ha sido actualizado');
        console.log('✅ Los lotes actuales de los productos han sido configurados');
        
        // Cerrar la conexión a la base de datos
        db.close();
        
    } catch (error) {
        console.error('❌ Error durante la creación de lotes:', error);
        process.exit(1);
    }
}

// Función para crear proveedores de prueba si no existen
async function createTestSuppliers(db) {
    const suppliers = [
        { nombre_proveedor: 'Distribuidora Alimentaria S.A.', telefono: '011-555-0101', email: 'ventas@distribuidora.com', productos_servicios: 'Productos alimenticios generales' },
        { nombre_proveedor: 'Carnes y Embutidos del Centro', telefono: '011-555-0202', email: 'pedidos@carnescentro.com', productos_servicios: 'Carnes, embutidos y productos cárnicos' },
        { nombre_proveedor: 'Verduras Frescas SRL', telefono: '011-555-0303', email: 'info@verdurasfrescas.com', productos_servicios: 'Verduras y frutas frescas' },
        { nombre_proveedor: 'Lácteos del Valle', telefono: '011-555-0404', email: 'contacto@lacteossalud.com', productos_servicios: 'Lácteos y productos refrigerados' },
        { nombre_proveedor: 'Bebidas y Licores SA', telefono: '011-555-0505', email: 'ventas@bebidaslicores.com', productos_servicios: 'Bebidas, cervezas y licores' }
    ];
    
    for (const supplier of suppliers) {
        try {
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO proveedores (nombre_proveedor, telefono, email, productos_servicios, estatus)
                     VALUES (?, ?, ?, ?, ?)`,
                    [supplier.nombre_proveedor, supplier.telefono, supplier.email, supplier.productos_servicios, 'Activo'],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creando proveedor:', error);
        }
    }
    
    console.log('✅ Proveedores de prueba creados');
}

// Función para crear productos adicionales si no hay suficientes
async function createAdditionalProducts(db, currentCount) {
    const neededCount = 25 - currentCount;
    if (neededCount <= 0) return;
    
    const additionalProducts = [];
    const categories = ['Bebidas', 'Cereales y Derivados', 'Pastas', 'Conservas', 'Aceites y Vinagres', 'Infusiones', 'Dulces y Mermeladas', 'Lácteos', 'Productos de Limpieza e Higiene'];
    
    for (let i = 1; i <= neededCount; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const categoryPrefix = category.substring(0, 3).toUpperCase();
        const productCode = `${categoryPrefix}-${(currentCount + i).toString().padStart(3, '0')}`;
        const productName = `${category} Producto ${currentCount + i}`;
        const price = 1000 + Math.floor(Math.random() * 5000);
        const stock = 10 + Math.floor(Math.random() * 50);
        
        additionalProducts.push({
            codigo: productCode,
            nombre: productName,
            descripcion: `Producto adicional creado automáticamente - ${category}`,
            precio: price,
            stock: stock,
            categoria: category,
            codigo_barras: `200004${(currentCount + i).toString().padStart(6, '0')}`
        });
    }
    
    for (const product of additionalProducts) {
        try {
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO productos (codigo, nombre, descripcion, precio, stock, categoria, codigo_barras)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [product.codigo, product.nombre, product.descripcion, product.precio, product.stock, product.categoria, product.codigo_barras],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creando producto adicional:', error);
        }
    }
    
    console.log(`✅ ${additionalProducts.length} productos adicionales creados`);
}

// Función para registrar operaciones en el log
async function logOperation(db, tipoOperacion, descripcion, usuario, entidadAfectada, idEntidad, datosAnteriores, datosNuevos) {
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO operaciones_log (tipo_operacion, descripcion, usuario, entidad_afectada, id_entidad, datos_anteriores, datos_nuevos)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tipoOperacion,
                    descripcion,
                    usuario,
                    entidadAfectada,
                    idEntidad,
                    datosAnteriores ? JSON.stringify(datosAnteriores) : null,
                    datosNuevos ? JSON.stringify(datosNuevos) : null
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    } catch (error) {
        console.error('Error registrando operación en el log:', error);
    }
}

// Ejecutar el script
if (require.main === module) {
    createBatchesWithProducts();
}

module.exports = { createBatchesWithProducts };