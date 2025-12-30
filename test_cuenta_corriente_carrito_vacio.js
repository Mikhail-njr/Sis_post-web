/**
 * Prueba para detectar el problema de cuenta corriente que detecta carrito vacío incorrectamente
 * 
 * Este script simula el comportamiento del sistema para identificar el problema
 */

// Simulación del entorno del POS
const mockWindow = {
    cart: [],
    showAlert: (message, type) => {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

// Simulación del módulo de cuenta corriente
class MockCuentaCorrienteManager {
    constructor() {
        this.estado = {
            cliente: null,
            activa: false,
            saldo: 0,
            saldoCargado: false
        };
    }

    // Simulación de la función toggleCuentaCorriente
    toggleCuentaCorriente() {
        console.log('\n=== PRUEBA: toggleCuentaCorriente ===');
        
        // Simular checkbox activado
        const checkbox = { checked: true };
        
        // Verificar que haya productos en el carrito (LÍNEA PROBLEMÁTICA)
        if (!window.cart || window.cart.length === 0) {
            checkbox.checked = false;
            console.log('❌ ERROR DETECTADO: Carrito detectado como vacío incorrectamente');
            console.log(`   window.cart: ${window.cart}`);
            console.log(`   window.cart.length: ${window.cart ? window.cart.length : 'undefined'}`);
            return false;
        }
        
        console.log('✅ Carrito correctamente detectado como con productos');
        return true;
    }

    // Simulación de la función confirmarPago
    confirmarPago(total) {
        console.log('\n=== PRUEBA: confirmarPago ===');
        
        if (!this.estado.cliente) {
            console.log('❌ Cliente no seleccionado');
            return false;
        }

        if (!total || total <= 0) {
            console.log('❌ ERROR DETECTADO: Carrito detectado como vacío incorrectamente en confirmarPago');
            console.log(`   total: ${total}`);
            return false;
        }

        console.log('✅ Pago correctamente validado');
        return true;
    }

    // Simulación de la función validarPagoIntegrado
    validarPagoIntegrado(totalToPay, selectedPaymentMethods) {
        console.log('\n=== PRUEBA: validarPagoIntegrado ===');
        
        const isCuentaCorrienteActive = this.estado.activa;
        
        if (isCuentaCorrienteActive && !this.estado.cliente) {
            console.log('❌ Cliente no seleccionado');
            return false;
        }

        if (isCuentaCorrienteActive && Object.keys(selectedPaymentMethods).length === 0) {
            if (totalToPay <= 0) {
                console.log('❌ ERROR DETECTADO: Carrito detectado como vacío incorrectamente en validarPagoIntegrado');
                console.log(`   totalToPay: ${totalToPay}`);
                return false;
            }
        }

        console.log('✅ Validación integrada correctamente');
        return true;
    }
}

// Función para simular el problema
function simularProblema() {
    console.log('🔍 INICIANDO PRUEBA DE CUENTA CORRIENTE - CARRO VACÍO FALSO\n');
    
    const manager = new MockCuentaCorrienteManager();
    
    // Escenario 1: Carrito con productos pero window.cart no está definido
    console.log('\n--- Escenario 1: window.cart no definido ---');
    window.cart = undefined;
    manager.toggleCuentaCorriente();
    
    // Escenario 2: Carrito con productos pero window.cart es null
    console.log('\n--- Escenario 2: window.cart es null ---');
    window.cart = null;
    manager.toggleCuentaCorriente();
    
    // Escenario 3: Carrito vacío (comportamiento correcto)
    console.log('\n--- Escenario 3: Carrito realmente vacío ---');
    window.cart = [];
    manager.toggleCuentaCorriente();
    
    // Escenario 4: Carrito con productos (comportamiento correcto)
    console.log('\n--- Escenario 4: Carrito con productos ---');
    window.cart = [
        { id: 1, nombre: 'Producto 1', precio: 100, cantidad: 1 },
        { id: 2, nombre: 'Producto 2', precio: 200, cantidad: 2 }
    ];
    manager.toggleCuentaCorriente();
    
    // Escenario 5: Validación de pago con total 0
    console.log('\n--- Escenario 5: Validación de pago con total 0 ---');
    manager.estado.cliente = { id: 1, nombre: 'Cliente de Prueba' };
    manager.confirmarPago(0);
    
    // Escenario 6: Validación de pago con total negativo
    console.log('\n--- Escenario 6: Validación de pago con total negativo ---');
    manager.confirmarPago(-50);
    
    // Escenario 7: Validación integrada con total 0
    console.log('\n--- Escenario 7: Validación integrada con total 0 ---');
    manager.estado.activa = true;
    manager.validarPagoIntegrado(0, {});
}

// Función para analizar posibles causas
function analizarCausas() {
    console.log('\n\n🔍 ANÁLISIS DE POSIBLES CAUSAS DEL PROBLEMA:\n');
    
    console.log('1. window.cart no está definido en el scope global');
    console.log('   - Solución: Asegurar que window.cart esté siempre definido');
    
    console.log('2. window.cart es null o undefined');
    console.log('   - Solución: Inicializar window.cart como array vacío');
    
    console.log('3. Problemas de sincronización entre módulos');
    console.log('   - Solución: Verificar el orden de carga de scripts');
    
    console.log('4. Validación demasiado estricta');
    console.log('   - Solución: Mejorar la lógica de validación');
    
    console.log('5. Problemas con el cálculo del total');
    console.log('   - Solución: Verificar la función calcularTotal');
}

// Ejecutar pruebas
if (typeof window === 'undefined') {
    global.window = mockWindow;
}

simularProblema();
analizarCausas();

console.log('\n\n✅ PRUEBA COMPLETA - Revisa los resultados anteriores para identificar el problema específico');