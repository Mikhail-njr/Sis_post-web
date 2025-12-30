// Script para buscar pedidos a proveedor por numero_pedido y mostrar su estructura
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

const pedidos = [
  'PED-1765938980048',
  'PED-1765938838678'
];

function getPedidoByNumero(numero_pedido) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM pedidos_proveedores WHERE numero_pedido = ?`,
      [numero_pedido],
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
  for (const numero_pedido of pedidos) {
    console.log(`\n=== Pedido: ${numero_pedido} ===`);
    const pedido = await getPedidoByNumero(numero_pedido);
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
