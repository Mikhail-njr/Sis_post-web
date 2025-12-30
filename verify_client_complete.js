const db = require('./backend/database-sqlite.js');

async function verificarClienteCompleto() {
  try {
    console.log('🔍 Verificación completa del cliente recién creado...\n');
    
    // Verificar clientes
    const clientes = await db.query('SELECT * FROM clientes ORDER BY id DESC LIMIT 5');
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
    const deudas = await db.query(`
      SELECT d.*, 
             c.nombre as cliente_nombre,
             v.id as venta_id,
             v.total as venta_total
      FROM deudas d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      LEFT JOIN ventas v ON d.venta_id = v.id
      ORDER BY d.id DESC LIMIT 10
    `);
    
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
    
    // Verificar integridad referencial
    const clientesSinDeudas = await db.query(`
      SELECT c.id, c.nombre
      FROM clientes c
      LEFT JOIN deudas d ON c.id = d.cliente_id
      WHERE d.cliente_id IS NULL
    `);
    
    console.log(`✅ Clientes sin deudas asociadas: ${clientesSinDeudas.length}`);
    
    // Verificar integridad de deudas
    const deudasSinCliente = await db.query(`
      SELECT d.id, d.cliente_id
      FROM deudas d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      WHERE c.id IS NULL
    `);
    
    if (deudasSinCliente.length > 0) {
      console.log(`⚠️  Deudas sin cliente asociado: ${deudasSinCliente.length}`);
      deudasSinCliente.forEach(d => {
        console.log(`- Deuda ID: ${d.id}, Cliente ID: ${d.cliente_id}`);
      });
    } else {
      console.log(`✅ Todas las deudas tienen cliente asociado`);
    }
    
    console.log('\n✅ Verificación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

verificarClienteCompleto();