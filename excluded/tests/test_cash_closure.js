// Using built-in fetch (Node.js 18+)

const API_BASE = 'http://localhost:3000/api';

// Función para probar el endpoint de preview
async function testCloseRegisterPreview() {
    console.log('🧪 Probando endpoint /api/close-register-preview...');

    try {
        // Get today's date in the correct format
        const today = new Date().toISOString().split('T')[0];

        const response = await fetch(`${API_BASE}/close-register-preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha: new Date().toISOString(),
                dineroInicial: 1000.50
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error en preview:', error);
            return null;
        }

        const result = await response.json();
        console.log('✅ Preview exitoso:', result);
        return result;

    } catch (error) {
        console.error('❌ Error de conexión en preview:', error.message);
        return null;
    }
}

// Función para probar el endpoint de confirmación
async function testCloseRegisterConfirm(previewData) {
    console.log('🧪 Probando endpoint /api/close-register-confirm...');

    try {
        // Agregar diferencia simulada (dinero contado vs esperado)
        const confirmData = {
            ...previewData,
            diferencia: -50.25, // Simular que faltan $50.25
            notas: 'Prueba de cierre de caja'
        };

        const response = await fetch(`${API_BASE}/close-register-confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(confirmData)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error en confirmación:', error);
            return false;
        }

        const result = await response.json();
        console.log('✅ Confirmación exitosa:', result);
        return true;

    } catch (error) {
        console.error('❌ Error de conexión en confirmación:', error.message);
        return false;
    }
}

// Función para probar duplicado (debería fallar)
async function testDuplicateClosure(previewData) {
    console.log('🧪 Probando validación de duplicados...');

    try {
        const confirmData = {
            ...previewData,
            diferencia: 0,
            notas: 'Intento de duplicado'
        };

        const response = await fetch(`${API_BASE}/close-register-confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(confirmData)
        });

        if (response.status === 400) {
            const error = await response.json();
            console.log('✅ Validación de duplicado funciona correctamente:', error.error);
            return true;
        } else {
            console.error('❌ La validación de duplicado no funcionó como esperado');
            return false;
        }

    } catch (error) {
        console.error('❌ Error de conexión en test duplicado:', error.message);
        return false;
    }
}

// Función principal de pruebas
async function runTests() {
    console.log('🚀 Iniciando pruebas de cierre de caja...\n');

    // Paso 1: Probar preview
    const previewData = await testCloseRegisterPreview();
    if (!previewData) {
        console.log('❌ Pruebas detenidas por error en preview');
        return;
    }

    console.log('');

    // Paso 2: Probar confirmación
    const confirmSuccess = await testCloseRegisterConfirm(previewData);
    if (!confirmSuccess) {
        console.log('❌ Pruebas detenidas por error en confirmación');
        return;
    }

    console.log('');

    // Paso 3: Probar validación de duplicados
    await testDuplicateClosure(previewData);

    console.log('\n🎉 Todas las pruebas completadas!');
}

// Ejecutar pruebas
runTests().catch(console.error);