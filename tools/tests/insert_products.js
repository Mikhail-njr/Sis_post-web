const db = require('./database-sqlite.js').getDB();

// Calcular fecha de vencimiento (un mes desde ahora)
const fechaVencimiento = new Date();
fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
const fechaStr = fechaVencimiento.toISOString().split('T')[0];

const productos = [
    ['LAP-001', 'Laptop HP 15.6"', 899.99, 30, 'Tecnología', fechaStr],
    ['MON-001', 'Monitor Samsung 24"', 249.99, 30, 'Tecnología', fechaStr],
    ['TEC-001', 'Teclado Mecánico RGB', 89.99, 30, 'Periféricos', fechaStr],
    ['MOU-001', 'Mouse Inalámbrico', 39.99, 30, 'Periféricos', fechaStr],
    ['PRI-001', 'Impresora Multifunción', 199.99, 30, 'Periféricos', fechaStr],
    ['ROU-001', 'Router WiFi 6', 149.99, 30, 'Redes', fechaStr],
    ['CAM-001', 'Webcam HD 1080p', 79.99, 30, 'Periféricos', fechaStr],
    ['HEA-001', 'Auriculares Gaming RGB', 129.99, 30, 'Audio', fechaStr]
];

// Solo insertar si no existen productos de prueba
db.get("SELECT COUNT(*) as count FROM productos WHERE codigo LIKE 'LAP-%' OR codigo LIKE 'MON-%' OR codigo LIKE 'TEC-%' OR codigo LIKE 'MOU-%' OR codigo LIKE 'PRI-%' OR codigo LIKE 'ROU-%' OR codigo LIKE 'CAM-%' OR codigo LIKE 'HEA-%'", (err, row) => {
    if (row.count === 0) {
        const stmt = db.prepare(`
            INSERT INTO productos (codigo, nombre, precio, stock, categoria, fecha_vencimiento)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        productos.forEach(producto => {
            stmt.run(producto, (err) => {
                if (err) {
                    console.error('Error inserting:', err);
                }
            });
        });

        stmt.finalize(() => {
            console.log('✅ Productos de prueba insertados');
            db.close();
        });
    } else {
        console.log('✅ Productos de prueba ya existen');
        db.close();
    }
});
