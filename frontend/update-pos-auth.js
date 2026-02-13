/**
 * Script para actualizar el frontend del POS existente
 * para integrarlo con el nuevo sistema de autenticación
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Actualizando frontend del POS para integrar autenticación...\n');

// Ruta al archivo index.html del POS
const indexPath = path.join(__dirname, 'index.html');
const backupPath = path.join(__dirname, 'index.html.backup');

try {
    // Verificar si el archivo index.html existe
    if (!fs.existsSync(indexPath)) {
        console.log('❌ Archivo index.html no encontrado en el directorio frontend/');
        console.log('💡 Asegúrate de que el archivo index.html exista en el directorio frontend/');
        process.exit(1);
    }

    // Crear backup del archivo original
    const originalContent = fs.readFileSync(indexPath, 'utf8');
    fs.writeFileSync(backupPath, originalContent);
    console.log('✅ Backup creado: index.html.backup');

    // Leer el contenido del archivo
    let content = originalContent;

    // 1. Agregar el script de integración de autenticación
    const authScriptTag = '<script src="auth-integration.js"></script>';
    
    // Verificar si ya está incluido
    if (!content.includes('auth-integration.js')) {
        // Buscar el cierre del head o body para insertar el script
        const headCloseMatch = content.match(/<\/head>/);
        const bodyCloseMatch = content.match(/<\/body>/);
        
        if (headCloseMatch) {
            content = content.replace('</head>', `${authScriptTag}\n</head>`);
            console.log('✅ Script de autenticación agregado al head');
        } else if (bodyCloseMatch) {
            content = content.replace('</body>', `${authScriptTag}\n</body>`);
            console.log('✅ Script de autenticación agregado al body');
        } else {
            console.log('⚠️  No se encontró etiqueta de cierre head/body, agregando al final del archivo');
            content += `\n${authScriptTag}`;
        }
    } else {
        console.log('✅ Script de autenticación ya estaba incluido');
    }

    // 2. Agregar elementos de UI para autenticación si no existen
    const loginFormHtml = `
    <!-- Formulario de Login -->
    <div id="login-form" style="display: none; max-width: 400px; margin: 50px auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="text-align: center; color: #333; margin-bottom: 30px;">🔐 Iniciar Sesión</h2>
        <form id="login-form-element">
            <div style="margin-bottom: 20px;">
                <label for="username" style="display: block; margin-bottom: 5px; font-weight: bold;">Usuario:</label>
                <input type="text" id="username" name="username" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;">
            </div>
            <div style="margin-bottom: 30px;">
                <label for="password" style="display: block; margin-bottom: 5px; font-weight: bold;">Contraseña:</label>
                <input type="password" id="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;">
            </div>
            <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">Iniciar Sesión</button>
        </form>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
            <p>💡 Credenciales por defecto: admin / pos123</p>
        </div>
    </div>
    `;

    const userMenuHtml = `
    <!-- Menú de Usuario -->
    <div id="user-menu" style="display: none; position: fixed; top: 20px; right: 20px; background: #fff; padding: 10px 20px; border-radius: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000;">
        <span class="username" style="font-weight: bold; margin-right: 15px;">Usuario</span>
        <span class="role" style="background: #007bff; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 15px;">Rol</span>
        <button id="logout-btn" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cerrar Sesión</button>
    </div>
    `;

    // Verificar si ya existen los elementos de UI
    if (!content.includes('login-form') && !content.includes('user-menu')) {
        // Buscar un buen lugar para insertar los elementos (después del body o antes del cierre)
        const bodyOpenMatch = content.match(/<body[^>]*>/);
        
        if (bodyOpenMatch) {
            content = content.replace(bodyOpenMatch[0], bodyOpenMatch[0] + '\n' + userMenuHtml + loginFormHtml);
            console.log('✅ Elementos de UI de autenticación agregados');
        } else {
            console.log('⚠️  No se encontró etiqueta body, agregando al inicio del archivo');
            content = userMenuHtml + loginFormHtml + '\n' + content;
        }
    } else {
        console.log('✅ Elementos de UI de autenticación ya existían');
    }

    // 3. Agregar estilos para los elementos de autenticación
    const authStyles = `
    <style>
        /* Estilos para autenticación */
        .alert {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px;
            border-radius: 5px;
            background-color: #28a745;
            color: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: none;
            animation: slideInRight 0.3s ease-out;
        }
        
        .alert.show {
            display: block;
        }
        
        .alert.error {
            background-color: #dc3545;
        }
        
        .alert.success {
            background-color: #28a745;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Estilos para elementos con permisos */
        .admin-only {
            display: none;
        }
        
        .cajero-only {
            display: none;
        }
        
        .invitado-only {
            display: none;
        }
    </style>
    `;

    // Verificar si ya existen los estilos
    if (!content.includes('Estilos para autenticación')) {
        // Buscar el cierre del head para insertar los estilos
        const headCloseMatch = content.match(/<\/head>/);
        
        if (headCloseMatch) {
            content = content.replace('</head>', authStyles + '\n</head>');
            console.log('✅ Estilos de autenticación agregados');
        } else {
            console.log('⚠️  No se encontró etiqueta de cierre head, agregando al final del head');
            content = content.replace('<head>', '<head>\n' + authStyles);
        }
    } else {
        console.log('✅ Estilos de autenticación ya existían');
    }

    // 4. Agregar data-permission a elementos existentes según su funcionalidad
    // Esto es un ejemplo básico, en un caso real se haría de forma más específica
    
    // Agregar permisos a botones de administración
    const adminButtons = [
        'panel-control-btn',
        'promociones-btn',
        'metricas-btn',
        'productos-btn',
        'lotes-btn',
        'proveedores-btn',
        'operaciones-btn'
    ];
    
    adminButtons.forEach(buttonId => {
        const regex = new RegExp(`(id="${buttonId}"[^>]*>)`, 'g');
        if (content.match(regex)) {
            content = content.replace(regex, '$1 data-permission="read_products"');
            console.log(`✅ Permisos agregados al botón ${buttonId}`);
        }
    });

    // 5. Escribir el contenido actualizado
    fs.writeFileSync(indexPath, content);
    console.log('✅ Frontend del POS actualizado exitosamente');

    // 6. Crear un script de ejemplo para mostrar cómo usar la autenticación
    const exampleScript = `
// Ejemplo de cómo usar la autenticación en el frontend

// Verificar si el usuario está autenticado
if (window.ApiClient.isAuthenticated()) {
    console.log('Usuario autenticado:', window.ApiClient.getCurrentUser());
    
    // Verificar permisos
    if (window.ApiClient.hasPermission('create_products')) {
        console.log('Tiene permisos para crear productos');
    }
    
    // Verificar rol
    if (window.ApiClient.hasRole('admin')) {
        console.log('Es administrador');
    }
} else {
    console.log('Usuario no autenticado');
}

// Hacer una solicitud autenticada
window.ApiClient.fetch('/api/products')
    .then(response => response.json())
    .then(data => {
        console.log('Productos:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
`;

    fs.writeFileSync(path.join(__dirname, 'auth-example.js'), exampleScript);
    console.log('✅ Script de ejemplo creado: auth-example.js');

    console.log('\n🎉 Actualización completada exitosamente!');
    console.log('\n📋 Cambios realizados:');
    console.log('• Script de autenticación integrado');
    console.log('• Formulario de login agregado');
    console.log('• Menú de usuario agregado');
    console.log('• Estilos de autenticación agregados');
    console.log('• Permisos básicos asignados a botones');
    console.log('• Script de ejemplo creado');
    
    console.log('\n🚀 Próximos pasos:');
    console.log('1. Inicia el servidor de autenticación: node backend/integrate-auth.js');
    console.log('2. Accede al POS: http://localhost:3000/index.html');
    console.log('3. Inicia sesión con: admin / pos123');
    console.log('4. Prueba las funcionalidades según tu rol');

} catch (error) {
    console.error('❌ Error actualizando el frontend:', error.message);
    process.exit(1);
}