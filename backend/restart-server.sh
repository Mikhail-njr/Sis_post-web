#!/bin/bash

# SCRIPT DE REINICIO RÁPIDO PARA PRUEBAS

echo "🚀 Reiniciando servidor para probar correcciones..."
echo "📁 Directorio actual: $(pwd)"

# Detener procesos anteriores si existen
echo "🛑 Deteniendo procesos anteriores..."
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2

# Iniciar servidor
echo "✅ Iniciando servidor..."
cd backend
node server.js &

# Esperar a que el servidor inicie
echo "⏳ Esperando a que el servidor inicie..."
sleep 5

echo "🌐 Servidor iniciado en http://localhost:3000"
echo "📱 Para acceder desde tu móvil, usa la IP de tu computadora"
echo ""
echo "🔍 Para diagnosticar problemas:"
echo "1. Abre http://localhost:3000/dashboard"
echo "2. Intenta crear un cliente de cuenta corriente"
echo "3. Revisa la consola del servidor para ver logs de depuración"
echo ""
echo "💡 Comandos útiles:"
echo "  tail -f backend/server.js.log  # Ver logs en tiempo real"
echo "  node backend/diagnostic-clientes.js  # Diagnosticar cambios"
