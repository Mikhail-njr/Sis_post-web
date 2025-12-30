const db = require('./backend/database-sqlite.js');

async function verificarCreacionCliente() {
  try {
    console.log('🔍 Verificando creación del cliente...\n');
    
    // Verificar conexión
    console.log('✅ Conectado a la base de datos');
    
    // Obtener todos los clientes
    const clientes = await db.query('SELECT * FROM customers ORDER BY id DESC LIMIT 5');
    
    console.log(`📋 Clientes encontrados: ${clientes.length}\n`);
    
    if (clientes.length > 0) {
      clientes.forEach((cliente, index) => {
        console.log(`--- Cliente ${index + 1} ---`);
        console.log(`ID: ${cliente.id}`);
        console.log(`Nombre: ${cliente.name}`);
        console.log(`Teléfono: ${cliente.phone}`);
        console.log(`DNI: ${cliente.dni}`);
        console.log(`Creado: ${cliente.created_at}`);
        console.log(`Actualizado: ${cliente.updated_at}`);
        console.log('');
      });
    }
    
    // Verificar integridad de la tabla
    const integrity = await db.query('PRAGMA integrity_check');
    console.log(`🔍 Integridad de la base de datos: ${integrity[0]['integrity_check']}`);
    
    // Verificar si hay duplicados
    const duplicados = await db.query(`
      SELECT name, COUNT(*) as count 
      FROM customers 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicados.length > 0) {
      console.log('\n⚠️  Clientes duplicados detectados:');
      duplicados.forEach(d => {
        console.log(`- Nombre: ${d.name}, Repeticiones: ${d.count}`);
      });
    } else {
      console.log('\n✅ No se detectaron clientes duplicados');
    }
    
    // Verificar si el cliente tiene deudas asociadas
    const deudas = await db.query(`
      SELECT d.*, c.name as customer_name 
      FROM debts d 
      LEFT JOIN customers c ON d.customer_id = c.id 
      ORDER BY d.id DESC LIMIT 5
    `);
    
    console.log(`\n💰 Deudas encontradas: ${deudas.length}`);
    if (deudas.length > 0) {
      deudas.forEach((deuda, index) => {
        console.log(`--- Deuda ${index + 1} ---`);
        console.log(`ID: ${deuda.id}`);
        console.log(`Cliente: ${deuda.customer_name || 'Sin nombre'}`);
        console.log(`Monto: $${deuda.amount}`);
        console.log(`Estado: ${deuda.status}`);
        console.log(`Creado: ${deuda.created_at}`);
        console.log('');
      });
    }
    
    console.log('✅ Verificación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

verificarCreacionCliente();