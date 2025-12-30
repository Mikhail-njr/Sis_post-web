// Script para eliminar pedidos por ID (y sus items)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

const pedidos = [183, 184];

function deletePedidoById(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM pedido_items WHERE pedido_id = ?`, [id], function(err) {
      if (err) return reject(err);
      db.run(`DELETE FROM pedidos_proveedores WHERE id = ?`, [id], function(err2) {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

(async () => {
  for (const id of pedidos) {
    await deletePedidoById(id);
    console.log(`Pedido ${id} eliminado.`);
  }
  db.close();
})();
