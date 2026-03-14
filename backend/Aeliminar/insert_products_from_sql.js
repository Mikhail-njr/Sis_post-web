// Script para insertar productos desde insert_products.sql
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);
const sqlFile = path.join(__dirname, 'insert_products.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

db.serialize(() => {
  // 1. Agregar columna codigo_barras si no existe
  db.run("ALTER TABLE productos ADD COLUMN codigo_barras TEXT", (err) => {});

  // 2. Eliminar datos existentes (en orden por foreign keys)
  db.run("DELETE FROM venta_items");
  db.run("DELETE FROM ventas");
  db.run("DELETE FROM cierres_caja");
  db.run("DELETE FROM productos");

  // 3. Parsear y ejecutar cada INSERT
  const lines = sqlContent.split('\n');
  let currentStmt = '';
  let insertCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.length === 0) continue;

    currentStmt += ' ' + line;

    if (trimmed.endsWith(';')) {
      // Es un statement completo
      if (currentStmt.toUpperCase().includes('INSERT INTO PRODUCTOS')) {
        db.run(currentStmt, (err) => {
          if (!err) insertCount++;
        });
      }
      currentStmt = '';
    }
  }

  // 4. Verificar resultado
  setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
      console.log(`✅ Productos insertados: ${insertCount}`);
      console.log(`📊 Total en DB: ${row.count}`);
      db.close();
    });
  }, 500);
});
