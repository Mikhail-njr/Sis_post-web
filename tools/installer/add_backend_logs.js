/**
 * Script para agregar logs de diagnóstico al backend
 * Este script modifica el endpoint de confirmación de entrega para agregar logs detallados
 */

const fs = require('fs');
const path = require('path');

// Ruta al archivo del backend
const BACKEND_FILE = path.join(__dirname, 'backend', 'server.js');

// Código de logs a insertar
const LOG_CODE = `
// === LOGS DE DIAGNÓSTICO PARA CONFIRMACIÓN DE ENTREGA ===
console.log('🔍 [DIAGNÓSTICO] Iniciando validación de confirmación de entrega');
console.log('📋 [DIAGNÓSTICO] Body recibido:', JSON.stringify(req.body, null, 2));

// Validar estructura del body
if (!req.body || !req.body.pedido_id || !req.body.items) {
    console.log('❌ [DIAGNÓSTICO] Body incompleto');
    return res.status(400).json({ error: 'Body incompleto: se requiere pedido_id e items' });
}

const { pedido_id, items } = req.body;
console.log('📦 [DIAGNÓSTICO] Pedido ID:', pedido_id, '(tipo:', typeof pedido_id, ')');
console.log('📋 [DIAGNÓSTICO] Items a validar:', items.length);

// Validar cada item
items.forEach((item, index) => {
    console.log(\`🔍 [DIAGNÓSTICO] Item \${index + 1}:\`, {
        producto_id: item.producto_id,
        tipo_producto_id: typeof item.producto_id,
        cantidad_recibida: item.cantidad_recibida,
        tipo_cantidad: typeof item.cantidad_recibida,
        fecha_vencimiento: item.fecha_vencimiento
    });
});

// === FIN DE LOGS DE DIAGNÓSTICO ===
`;

// Código de logs para la validación de items
const VALIDATION_LOG_CODE = `
// === LOGS DE DIAGNÓSTICO PARA VALIDACIÓN DE ITEMS ===
console.log('🔍 [DIAGNÓSTICO] Buscando items en pedido original...');
console.log('📋 [DIAGNÓSTICO] orderItems encontrados:', orderItems.length);

// Mostrar todos los producto_id del pedido original
const originalProductIds = orderItems.map(oi => ({
    producto_id: oi.producto_id,
    tipo: typeof oi.producto_id,
    nombre: oi.producto_nombre
}));
console.log('📦 [DIAGNÓSTICO] Producto IDs en pedido original:', originalProductIds);

// Validar cada item del body
for (const item of items) {
    console.log(\`🔍 [DIAGNÓSTICO] Validando item con producto_id: \${item.producto_id} (tipo: \${typeof item.producto_id})\`);
    
    // Buscar el item en el pedido original
    const originalItem = orderItems.find(oi => {
        const match = oi.producto_id == item.producto_id;
        console.log(\`🔍 [DIAGNÓSTICO] Comparando \${oi.producto_id} (tipo: \${typeof oi.producto_id}) con \${item.producto_id} (tipo: \${typeof item.producto_id}) = \${match}\`);
        return match;
    });
    
    if (!originalItem) {
        console.log(\`❌ [DIAGNÓSTICO] Producto \${item.producto_id} no encontrado en el pedido original\`);
        throw new Error(\`Producto \${item.producto_id} no encontrado en el pedido original\`);
    } else {
        console.log(\`✅ [DIAGNÓSTICO] Producto encontrado: \${originalItem.producto_nombre} (ID: \${originalItem.producto_id})\`);
    }
}

// === FIN DE LOGS DE DIAGNÓSTICO ===
`;

function addLogsToBackend() {
    console.log('🔧 Agregando logs de diagnóstico al backend...');
    
    try {
        // Leer el archivo del backend
        const content = fs.readFileSync(BACKEND_FILE, 'utf8');
        
        // Buscar el endpoint de confirmación de entrega
        const endpointPattern = /app\.post\('\/api\/pedidos\/confirmar-entrega', async \(req, res\) => \{[\s\S]*?\}\);/;
        const match = content.match(endpointPattern);
        
        if (!match) {
            console.log('❌ No se encontró el endpoint de confirmación de entrega');
            console.log('Buscando endpoints relacionados...');
            
            // Buscar otros endpoints de pedidos
            const pedidoEndpoints = content.match(/app\.(get|post|put|delete)\('\/api\/pedidos[^']*'/g);
            if (pedidoEndpoints) {
                console.log('Endpoints de pedidos encontrados:');
                pedidoEndpoints.forEach(endpoint => console.log(`  - ${endpoint}`));
            }
            
            return;
        }
        
        console.log('✅ Endpoint de confirmación de entrega encontrado');
        
        // Buscar dónde agregar los logs (después de obtener el body)
        const bodyExtractionPattern = /const\s+\{\s*pedido_id,\s*items\s*\}\s*=\s*req\.body;/;
        const bodyMatch = match[0].match(bodyExtractionPattern);
        
        if (bodyMatch) {
            console.log('✅ Patrón de extracción de body encontrado');
            
            // Crear el nuevo contenido con logs
            const newContent = content.replace(
                bodyExtractionPattern,
                `${bodyMatch[0]}\n${LOG_CODE}`
            );
            
            // Buscar dónde agregar los logs de validación
            const validationPattern = /for\s*\(\s*const\s+item\s+of\s+items\s*\)\s*\{[\s\S]*?originalItem\s*=\s*orderItems\.find/;
            const validationMatch = newContent.match(validationPattern);
            
            if (validationMatch) {
                console.log('✅ Patrón de validación encontrado');
                
                // Crear el nuevo contenido con logs de validación
                const finalContent = newContent.replace(
                    validationPattern,
                    `${validationMatch[0]}\n${VALIDATION_LOG_CODE}`
                );
                
                // Escribir el archivo modificado
                fs.writeFileSync(BACKEND_FILE, finalContent);
                console.log('✅ Logs de diagnóstico agregados exitosamente');
                console.log('\n📝 Instrucciones:');
                console.log('1. Reinicia el servidor backend');
                console.log('2. Intenta confirmar una entrega');
                console.log('3. Revisa la consola del backend para ver los logs de diagnóstico');
                console.log('4. Los logs te mostrarán exactamente qué está pasando en la validación');
                
            } else {
                console.log('❌ No se encontró el patrón de validación');
            }
        } else {
            console.log('❌ No se encontró el patrón de extracción de body');
        }
        
    } catch (error) {
        console.error('❌ Error al agregar logs:', error.message);
    }
}

function removeLogsFromBackend() {
    console.log('🧹 Eliminando logs de diagnóstico del backend...');
    
    try {
        const content = fs.readFileSync(BACKEND_FILE, 'utf8');
        
        // Eliminar los logs de diagnóstico
        const cleanedContent = content
            .replace(/\/\/ === LOGS DE DIAGNÓSTICO PARA CONFIRMACIÓN DE ENTREGA ===[\s\S]*?\/\/ === FIN DE LOGS DE DIAGNÓSTICO ===\n/, '')
            .replace(/\/\/ === LOGS DE DIAGNÓSTICO PARA VALIDACIÓN DE ITEMS ===[\s\S]*?\/\/ === FIN DE LOGS DE DIAGNÓSTICO ===\n/, '');
        
        fs.writeFileSync(BACKEND_FILE, cleanedContent);
        console.log('✅ Logs de diagnóstico eliminados exitosamente');
        
    } catch (error) {
        console.error('❌ Error al eliminar logs:', error.message);
    }
}

// Función principal
function main() {
    const action = process.argv[2];
    
    if (action === 'add') {
        addLogsToBackend();
    } else if (action === 'remove') {
        removeLogsFromBackend();
    } else {
        console.log('Uso:');
        console.log('  node add_backend_logs.js add    - Agrega logs de diagnóstico');
        console.log('  node add_backend_logs.js remove - Elimina logs de diagnóstico');
    }
}

// Ejecutar
if (require.main === module) {
    main();
}

module.exports = {
    addLogsToBackend,
    removeLogsFromBackend
};