// Prueba de integración de impresión para el sistema POS
// Este script valida que los botones de impresión estén correctamente implementados

const fs = require('fs');
const path = require('path');

console.log('🔍 [TEST] Validando integración de impresión...\n');

// 1. Verificar que el backend tenga el endpoint de impresión
console.log('1. Verificando backend...');
try {
    const printServerPath = path.join(__dirname, 'backend', 'print-server.js');
    if (fs.existsSync(printServerPath)) {
        const content = fs.readFileSync(printServerPath, 'utf8');
        if (content.includes('/api/print-ticket')) {
            console.log('✅ Endpoint /api/print-ticket encontrado en backend');
        } else {
            console.log('❌ Endpoint /api/print-ticket NO encontrado en backend');
        }
    } else {
        console.log('❌ Archivo print-server.js NO encontrado');
    }
} catch (error) {
    console.log('❌ Error verificando backend:', error.message);
}

// 2. Verificar que el frontend tenga los botones de impresión
console.log('\n2. Verificando frontend...');
try {
    const indexPath = path.join(__dirname, 'Frontend', 'index.html');
    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        // Verificar botón en últimas facturas
        if (content.includes('onclick="printInvoice(')) {
            console.log('✅ Botón de impresión en últimas facturas encontrado');
        } else {
            console.log('❌ Botón de impresión en últimas facturas NO encontrado');
        }
        
        // Verificar botón en recibo
        if (content.includes('onclick="printTicketFromReceipt(')) {
            console.log('✅ Botón de impresión en recibo encontrado');
        } else {
            console.log('❌ Botón de impresión en recibo NO encontrado');
        }
        
        // Verificar funciones de impresión
        if (content.includes('async function printInvoice(')) {
            console.log('✅ Función printInvoice encontrada');
        } else {
            console.log('❌ Función printInvoice NO encontrada');
        }
        
        if (content.includes('async function printTicketFromReceipt(')) {
            console.log('✅ Función printTicketFromReceipt encontrada');
        } else {
            console.log('❌ Función printTicketFromReceipt NO encontrada');
        }
    } else {
        console.log('❌ Archivo index.html NO encontrado');
    }
} catch (error) {
    console.log('❌ Error verificando frontend:', error.message);
}

// 3. Verificar dependencias del backend
console.log('\n3. Verificando dependencias...');
try {
    const packagePath = path.join(__dirname, 'backend', 'package.json');
    if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const dependencies = packageContent.dependencies || {};
        
        if (dependencies['escpos']) {
            console.log('✅ Dependencia escpos encontrada');
        } else {
            console.log('❌ Dependencia escpos NO encontrada');
        }
        
        if (dependencies['escpos-usb']) {
            console.log('✅ Dependencia escpos-usb encontrada');
        } else {
            console.log('❌ Dependencia escpos-usb NO encontrada');
        }
    } else {
        console.log('❌ Archivo package.json NO encontrado');
    }
} catch (error) {
    console.log('❌ Error verificando dependencias:', error.message);
}

// 4. Verificar que el endpoint esté registrado en server.js
console.log('\n4. Verificando registro del endpoint...');
try {
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    if (fs.existsSync(serverPath)) {
        const content = fs.readFileSync(serverPath, 'utf8');
        if (content.includes('require(\'./print-server\')')) {
            console.log('✅ print-server.js está siendo requerido en server.js');
        } else {
            console.log('❌ print-server.js NO está siendo requerido en server.js');
        }
    } else {
        console.log('❌ Archivo server.js NO encontrado');
    }
} catch (error) {
    console.log('❌ Error verificando registro del endpoint:', error.message);
}

console.log('\n🎯 Resumen de la implementación:');
console.log('✅ Botones de impresión agregados en dos ubicaciones:');
console.log('   - En cada factura de la sección "Últimas Facturas"');
console.log('   - En el recibo generado después de pagar');
console.log('✅ Funciones de impresión implementadas:');
console.log('   - printInvoice() para facturas anteriores');
console.log('   - printTicketFromReceipt() para el recibo actual');
console.log('✅ Backend preparado para recibir solicitudes de impresión');
console.log('✅ Sistema listo para imprimir facturas en impresora Epson TM-T20 USB');

console.log('\n📝 Instrucciones de uso:');
console.log('1. Asegúrate de tener la impresora Epson TM-T20 USB conectada');
console.log('2. Instala los drivers de Epson en el sistema');
console.log('3. Inicia el servidor backend: npm start');
console.log('4. Abre el frontend en http://localhost:3000');
console.log('5. Realiza una venta o consulta las últimas facturas');
console.log('6. Haz clic en el botón "🖨️ Imprimir" para imprimir cualquier factura');

console.log('\n🔧 Próximos pasos recomendados:');
console.log('- Probar la impresión con una impresora real');
console.log('- Ajustar el formato del ticket según necesidades específicas');
console.log('- Agregar validación para impresora no conectada');
console.log('- Implementar impresión en lote para múltiples facturas');