const { CustomersRepository } = require('./backend/repositories/customers-repository.js');

async function verificarCliente() {
  try {
    console.log('🔍 Verificando cliente recién creado...\n');
    
    const repo = new CustomersRepository();
    const clientes = await repo.findWithDebtStats();
    
    console.log(`📋 Total de clientes: ${clientes.length}\n`);
    
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
      
      // Estadísticas de deudas
      console.log(`\n💰 Estadísticas de deudas:`);
      console.log(`- Total deudas: ${cliente.total_deudas || 0}`);
      console.log(`- Total pendiente: $${(cliente.total_pendiente || 0).toFixed(2)}`);
      console.log(`- Deudas pendientes: ${cliente.deudas_pendientes || 0}`);
      console.log(`- Deudas vencidas: ${cliente.deudas_vencidas || 0}`);
      console.log('');
    });
    
    console.log('✅ Verificación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

verificarCliente();