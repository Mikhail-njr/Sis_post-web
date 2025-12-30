const db = require('./backend/database-sqlite.js');

async function verificarClienteDirecto() {
  try {
    console.log('🔍 Verificación directa del cliente recién creado...\n');
    
    const database = db.getDB();
    
    // Verificar clientes
    database.all('SELECT * FROM clientes ORDER BY id DESC LIMIT 5', (err, clientes) => {
      if (err) {
        console.error('❌ Error obteniendo clientes:', err.message);
        return;
      }
      
      console.log(`📋 Clientes encontrados: ${clientes.length}\n`);
      
      if (clientes.length > 0) {
        clientes.forEach((cliente, index) => {
          console.log(`--- Cliente ${index + 1} ---`);
          console.log(`ID: ${cliente.id}`);
          console.log(`Nombre: ${cliente.nombre}`);
          console.log(`Teléfono: ${cliente.telefono}`);
          console.log(`DNI: ${cliente.dni}`);
          console.log(`Dirección: ${cliente.direccion || 'No especificada'}`);
          console.log(`Nota: ${cliente.nota || 'Sin notas'}`);
          console.log(`Creado: ${cliente.created_at}`);
          console.log(`Actualizado: ${cliente.updated_at || 'No actualizado'}`);
          console.log('');
        });
      }
      
      // Verificar deudas asociadas
      database.all(`
        SELECT d.*, 
               c.nombre as cliente_nombre,
               v.id as venta_id,
               v.total as venta_total
        FROM deudas d
        LEFT JOIN clientes c ON d.cliente_id = c.id
        LEFT JOIN ventas v ON d.venta_id = v.id
        ORDER BY d.id DESC LIMIT 10
      `, (err, deudas) => {
        if (err) {
          console.error('❌ Error obteniendo deudas:', err.message);
          return;
        }
        
        console.log(`💰 Deudas encontradas: ${deudas.length}`);
        if (deudas.length > 0) {
          deudas.forEach((deuda, index) => {
            console.log(`--- Deuda ${index + 1} ---`);
            console.log(`ID: ${deuda.id}`);
            console.log(`Cliente: ${deuda.cliente_nombre || 'Sin nombre'}`);
            console.log(`Venta ID: ${deuda.venta_id || 'Sin venta'}`);
            console.log(`Monto: $${deuda.monto}`);
            console.log(`Monto pendiente: $${deuda.monto_pendiente}`);
            console.log(`Estado: ${deuda.estado}`);
            console.log(`Creado: ${deuda.created_at}`);
            console.log('');
          });
        }
        
        console.log('✅ Verificación completada exitosamente');
      });
    });
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

verificarClienteDirecto();