// Script para buscar pedidos por ID y mostrar su estructura
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

const pedidos = [183, 184];

function getPedidoById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM pedidos_proveedores WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

function getItemsByPedidoId(pedido_id) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM pedido_items WHERE pedido_id = ?`,
      [pedido_id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

(async () => {
  for (const id of pedidos) {
    console.log(`\n=== Pedido ID: ${id} ===`);
    const pedido = await getPedidoById(id);
    if (!pedido) {
      console.log('No encontrado.');
      continue;
    }
    console.log('Datos del pedido:', pedido);
    const items = await getItemsByPedidoId(pedido.id);
    console.log('Items:', items);
  }
  db.close();
})();
