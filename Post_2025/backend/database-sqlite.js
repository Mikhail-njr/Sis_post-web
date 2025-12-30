const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'pos_database.sqlite');
        this.db = new sqlite3.Database(this.dbPath);
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Tabla productos
            this.db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                precio REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                categoria TEXT,
                fecha_vencimiento DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabla ventas
            this.db.run(`CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_factura TEXT UNIQUE NOT NULL,
                total REAL NOT NULL,
                metodo_pago TEXT NOT NULL,
                vuelto REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabla clientes
            this.db.run(`CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                telefono TEXT,
                direccion TEXT,
                dni TEXT,
                nota TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Insertar datos de ejemplo si la tabla está vacía
            this.db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                if (row.count === 0) {
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

                    const stmt = this.db.prepare(`
                        INSERT INTO productos (codigo, nombre, precio, stock, categoria, fecha_vencimiento)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);

                    productos.forEach(producto => {
                        stmt.run(producto);
                    });

                    stmt.finalize();
                    console.log('✅ Datos de ejemplo insertados');
                }
            });
        });
    }

    getDB() {
        return this.db;
    }
}

module.exports = new Database();