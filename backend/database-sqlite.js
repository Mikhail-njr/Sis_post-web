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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabla ventas
            this.db.run(`CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_factura TEXT UNIQUE NOT NULL,
                total REAL NOT NULL,
                metodo_pago TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Insertar datos de ejemplo si la tabla está vacía
            this.db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                if (row.count === 0) {
                    const productos = [
                        ['LAP-001', 'Laptop HP 15.6"', 899.99, 25, 'Tecnología'],
                        ['MON-001', 'Monitor Samsung 24"', 249.99, 15, 'Tecnología'],
                        ['TEC-001', 'Teclado Mecánico RGB', 89.99, 30, 'Periféricos'],
                        ['MOU-001', 'Mouse Inalámbrico', 39.99, 45, 'Periféricos']
                    ];

                    const stmt = this.db.prepare(`
                        INSERT INTO productos (codigo, nombre, precio, stock, categoria) 
                        VALUES (?, ?, ?, ?, ?)
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