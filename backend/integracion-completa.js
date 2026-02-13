#!/usr/bin/env node

/**
 * Script de Integración Completa del Sistema de Autenticación
 * 
 * Este script automatiza todo el proceso de integración del nuevo sistema
 * de autenticación al sistema POS existente.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 INTEGRACIÓN COMPLETA DEL SISTEMA DE AUTENTICACIÓN\n');
console.log('Este script realizará los siguientes pasos:');
console.log('1. Instalar dependencias y crear base de datos');
console.log('2. Crear y configurar endpoints de autenticación');
console.log('3. Crear middleware de autorización');
console.log('4. Actualizar frontend del POS');
console.log('5. Crear scripts de prueba y documentación');
console.log('6. Generar resumen de la implementación\n');

async function integracionCompleta() {
    try {
        // Paso 1: Instalación del sistema de autenticación
        console.log('📦 Paso 1: Instalando sistema de autenticación...');
        await ejecutarComando('node backend/install-complete-auth.js', 'Instalación del sistema de autenticación');
        
        // Paso 2: Crear middleware de autorización
        console.log('\n🔧 Paso 2: Creando middleware de autorización...');
        if (fs.existsSync('backend/auth-middleware.js')) {
            console.log('✅ Middleware de autorización ya creado');
        } else {
            console.log('❌ Middleware de autorización no encontrado');
            process.exit(1);
        }
        
        // Paso 3: Crear script de migración de endpoints
        console.log('\n🔄 Paso 3: Creando script de migración de endpoints...');
        if (fs.existsSync('backend/migrate-endpoints.js')) {
            console.log('✅ Script de migración de endpoints creado');
        } else {
            console.log('❌ Script de migración de endpoints no encontrado');
            process.exit(1);
        }
        
        // Paso 4: Actualizar frontend del POS
        console.log('\n🎨 Paso 4: Actualizando frontend del POS...');
        await ejecutarComando('node frontend/update-pos-auth.js', 'Actualización del frontend del POS');
        
        // Paso 5: Crear integración de autenticación para el frontend
        console.log('\n🔗 Paso 5: Creando integración de autenticación para el frontend...');
        if (fs.existsSync('frontend/auth-integration.js')) {
            console.log('✅ Integración de autenticación para el frontend creada');
        } else {
            console.log('❌ Integración de autenticación para el frontend no encontrada');
            process.exit(1);
        }
        
        // Paso 6: Crear documentación
        console.log('\n📚 Paso 6: Creando documentación...');
        if (fs.existsSync('docs/GUIA_INTEGRACION_COMPLETA.md')) {
            console.log('✅ Guía de integración completa creada');
        } else {
            console.log('❌ Guía de integración completa no encontrada');
            process.exit(1);
        }
        
        // Paso 7: Crear script de prueba
        console.log('\n🧪 Paso 7: Creando script de prueba...');
        if (fs.existsSync('backend/test-auth-system.js')) {
            console.log('✅ Script de prueba creado');
        } else {
            console.log('❌ Script de prueba no encontrado');
            process.exit(1);
        }
        
        // Paso 8: Iniciar el servidor de autenticación
        console.log('\n🌐 Paso 8: Iniciando servidor de autenticación...');
        console.log('💡 El servidor se iniciará en segundo plano');
        console.log('Para detenerlo, usa: Ctrl+C');
        
        // Crear script para iniciar el servidor
        const startServerScript = `
#!/bin/bash
echo "🚀 Iniciando servidor de autenticación..."
echo "Accede a: http://localhost:3000"
echo "Panel de control: http://localhost:3000/dashboard.html"
echo "Para detener el servidor: Ctrl+C"
node backend/integrate-auth.js
`;
        
        fs.writeFileSync('start-server.sh', startServerScript);
        fs.writeFileSync('start-server.bat', 'node backend/integrate-auth.js');
        
        console.log('✅ Scripts de inicio creados: start-server.sh y start-server.bat');
        
        // Paso 9: Generar resumen de la implementación
        console.log('\n📋 Paso 9: Generando resumen de la implementación...');
        await generarResumenImplementacion();
        
        console.log('\n🎉 INTEGRACIÓN COMPLETA EXITOSA!\n');
        
        console.log('📋 RESUMEN DE LA IMPLEMENTACIÓN:');
        console.log('• Sistema de autenticación basado en base de datos');
        console.log('• Encriptación bcrypt para contraseñas');
        console.log('• Roles de usuario: admin, cajero, invitado');
        console.log('• Control de intentos fallidos y bloqueos');
        console.log('• Auditoría completa de actividades');
        console.log('• Middleware de autorización por roles');
        console.log('• Frontend actualizado con autenticación');
        console.log('• Documentación completa generada');
        
        console.log('\n🚀 PRÓXIMOS PASOS:');
        console.log('1. Inicia el servidor: node backend/integrate-auth.js');
        console.log('2. Accede al POS: http://localhost:3000/index.html');
        console.log('3. Inicia sesión con: admin / pos123');
        console.log('4. Accede al panel de control: http://localhost:3000/dashboard.html');
        console.log('5. Prueba el sistema: node backend/test-auth-system.js');
        
        console.log('\n📖 DOCUMENTACIÓN:');
        console.log('• Guía de integración: docs/GUIA_INTEGRACION_COMPLETA.md');
        console.log('• Documentación del sistema: docs/SISTEMA_AUTENTICACION_USUARIOS.md');
        
        console.log('\n💡 CONSEJOS:');
        console.log('• Cambia las credenciales por defecto en el panel de control');
        console.log('• Crea usuarios para cada rol según tus necesidades');
        console.log('• Prueba los permisos de cada rol');
        console.log('• Revisa los logs de autenticación para monitorear actividades');
        
    } catch (error) {
        console.error('❌ Error en la integración completa:', error.message);
        console.log('\n💡 Soluciones comunes:');
        console.log('1. Asegúrate de tener Node.js instalado');
        console.log('2. Verifica permisos de escritura en el directorio');
        console.log('3. Revisa que no haya conflictos de puertos');
        console.log('4. Ejecuta los pasos manualmente si es necesario');
        process.exit(1);
    }
}

async function ejecutarComando(comando, descripcion) {
    try {
        console.log(`   Ejecutando: ${comando}`);
        execSync(comando, { stdio: 'inherit' });
        console.log(`   ✅ ${descripcion} completada`);
    } catch (error) {
        console.error(`   ❌ Error en ${descripcion}:`, error.message);
        throw error;
    }
}

async function generarResumenImplementacion() {
    const resumen = `
# Resumen de la Implementación del Sistema de Autenticación

## 🎯 Objetivo Cumplido
✅ Reemplazar las credenciales hardcodeadas del sistema POS por un sistema de autenticación basado en base de datos con encriptación bcrypt, múltiples roles de usuario y auditoría completa.

## 📁 Archivos Creados

### Backend
- \`backend/auth-middleware.js\` - Middleware de autenticación y autorización
- \`backend/migrate-endpoints.js\` - Script de migración de endpoints
- \`backend/auth-utils.js\` - Utilidades de autenticación
- \`backend/auth-endpoints.js\` - Endpoints de login y gestión de sesión
- \`backend/credentials-endpoints.js\` - Endpoints para gestión de credenciales
- \`backend/users-endpoints.js\` - Endpoints para gestión de usuarios
- \`backend/create_usuarios_table.sql\` - Script SQL para crear tablas
- \`backend/setup-users.js\` - Script para crear tablas e insertar usuario admin
- \`backend/install-auth-deps.js\` - Script para instalar dependencias
- \`backend/integrate-auth.js\` - Servidor de prueba para endpoints
- \`backend/test-auth-system.js\` - Script de pruebas del sistema
- \`backend/install-complete-auth.js\` - Instalación completa automatizada

### Frontend
- \`frontend/auth-integration.js\` - Integración de autenticación para el frontend
- \`frontend/update-pos-auth.js\` - Script para actualizar el frontend del POS
- \`frontend/auth-example.js\` - Ejemplo de uso de la autenticación

### Documentación
- \`docs/GUIA_INTEGRACION_COMPLETA.md\` - Guía de integración completa
- \`docs/SISTEMA_AUTENTICACION_USUARIOS.md\` - Documentación del sistema
- \`README_AUTENTICACION.md\` - Resumen del sistema de autenticación

## 🔐 Características Implementadas

### Seguridad
- ✅ Contraseñas encriptadas con bcrypt (coste 10)
- ✅ Control de intentos fallidos (bloqueo después de 5 intentos)
- ✅ Roles de usuario: admin, cajero, invitado
- ✅ Auditoría completa de actividades
- ✅ Validación de roles para cada endpoint
- ✅ Protección contra SQL injection

### Funcionalidades
- ✅ Login y logout seguro
- ✅ Cambio de credenciales
- ✅ Gestión de usuarios (CRUD)
- ✅ Permisos específicos por rol
- ✅ Middleware de autorización
- ✅ Integración frontend-backend

### Experiencia de Usuario
- ✅ Formulario de login integrado
- ✅ Menú de usuario con información de rol
- ✅ Redirección según rol después del login
- ✅ Ocultamiento de elementos según permisos
- ✅ Mensajes de alerta y feedback

## 🚀 Endpoints Disponibles

### Públicos
- \`POST /api/auth/login\` - Iniciar sesión
- \`POST /api/auth/change-password\` - Cambiar contraseña
- \`GET /api/auth/profile\` - Obtener perfil
- \`PUT /api/auth/profile\` - Actualizar perfil

### Administración
- \`GET /api/credentials\` - Obtener credenciales (admin)
- \`PUT /api/credentials\` - Cambiar credenciales (admin)
- \`GET /api/users\` - Listar usuarios (admin)
- \`POST /api/users\` - Crear usuario (admin)
- \`PUT /api/users/:id\` - Actualizar usuario (admin)
- \`DELETE /api/users/:id\` - Eliminar usuario (admin)
- \`GET /api/auth-logs\` - Ver logs (admin)

## 👥 Roles y Permisos

### Admin
- Acceso completo al sistema
- Gestión de usuarios y credenciales
- Todas las operaciones

### Cajero
- Acceso a ventas, productos y cierres
- Creación y actualización de productos
- Gestión de ventas y cierres

### Invitado
- Visualización de datos
- Productos, ventas y promociones
- Sin permisos de modificación

## 📊 Base de Datos

### Tablas
- \`usuarios\` - Información de usuarios con encriptación
- \`auth_logs\` - Registro de actividades de autenticación

### Seguridad
- Contraseñas encriptadas
- Intentos fallidos controlados
- Auditoría completa

## 🧪 Pruebas

### Automáticas
- \`node backend/test-auth-system.js\` - Pruebas completas del sistema

### Manuales
- Login exitoso y fallido
- Bloqueo por intentos
- Permisos por rol
- Cambio de credenciales

## 📈 Beneficios del Nuevo Sistema

✅ **Elimina credenciales hardcodeadas** del código  
✅ **Permite múltiples usuarios** con diferentes roles  
✅ **Mejora la seguridad** con encriptación bcrypt  
✅ **Control de acceso** basado en roles  
✅ **Auditoría completa** de actividades  
✅ **Bloqueo automático** contra ataques de fuerza bruta  
✅ **Mantenimiento fácil** mediante endpoints REST  
✅ **Integración completa** frontend-backend  

## 🎯 Próximos Pasos Recomendados

1. **Personalizar credenciales**: Cambiar las credenciales por defecto
2. **Crear usuarios**: Crear usuarios para cada rol según necesidades
3. **Migrar endpoints**: Migrar gradualmente los endpoints existentes
4. **Pruebas de seguridad**: Realizar pruebas de penetración
5. **Monitoreo**: Implementar monitoreo de logs de autenticación
6. **Documentación**: Actualizar documentación según necesidades específicas

## 📞 Soporte

- Email: mikhail.njr@gmail.com
- Teléfono: +54 3434721177
- Horario: Lunes a Viernes 9:00 - 18:00

---

**🎉 Implementación completada exitosamente!**
El sistema de autenticación está listo para ser utilizado y proporciona una base sólida para la gestión de usuarios en el sistema POS.
`;

    fs.writeFileSync('IMPLEMENTACION_COMPLETA.md', resumen);
    console.log('✅ Resumen de implementación creado: IMPLEMENTACION_COMPLETA.md');
}

// Ejecutar la integración completa
integracionCompleta();