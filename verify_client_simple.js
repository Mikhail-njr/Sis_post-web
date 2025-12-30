const repo = require('./backend/repositories/customers-repository.js');

async function verificarCliente() {
  try {
    console.log('🔍 Verificando cliente recién creado...\n');
    
    const clientes = await repo.getAll();
    console.log(`📋 Total de clientes: ${clientes.length}\n`);
    
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
    
    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verificarCliente();