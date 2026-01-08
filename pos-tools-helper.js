#!/usr/bin/env node

/**
 * Herramienta de ayuda rápida para el Sistema POS
 * 
 * Este script proporciona una interfaz amigable para acceder
 * a todas las herramientas disponibles en el proyecto.
 */

const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');

class POSToolsHelper {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Muestra el menú principal
     */
    showMainMenu() {
        console.clear();
        console.log('🛒 Sistema POS - Herramientas Disponibles');
        console.log('==========================================');
        console.log('');
        console.log('1. 🛠️  Herramientas de Desarrollo');
        console.log('2. 🧪 Herramientas de Pruebas');
        console.log('3. 📊 Herramientas de Análisis');
        console.log('4. 🔧 Herramientas de Mantenimiento');
        console.log('5. 🚀 Herramientas de Despliegue');
        console.log('6. ⚡ Batch Runner (Automatización)');
        console.log('7. 📋 Ver estado del sistema');
        console.log('8. 🆘 Ayuda y documentación');
        console.log('9. 🚪 Salir');
        console.log('');
    }

    /**
     * Herramientas de desarrollo
     */
    showDevelopmentTools() {
        console.clear();
        console.log('🛠️  Herramientas de Desarrollo');
        console.log('==============================');
        console.log('');
        console.log('1. Iniciar servidor backend');
        console.log('2. Iniciar sistema de análisis de código');
        console.log('3. Verificar salud del sistema');
        console.log('4. Optimizar rendimiento');
        console.log('5. Ver logs del sistema');
        console.log('6. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.startBackendServer();
                    break;
                case '2':
                    this.startCodeAnalysis();
                    break;
                case '3':
                    this.checkSystemHealth();
                    break;
                case '4':
                    this.optimizePerformance();
                    break;
                case '5':
                    this.viewSystemLogs();
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showDevelopmentTools();
            }
        });
    }

    /**
     * Herramientas de pruebas
     */
    showTestTools() {
        console.clear();
        console.log('🧪 Herramientas de Pruebas');
        console.log('==========================');
        console.log('');
        console.log('1. Prueba de integración de códigos de barras');
        console.log('2. Prueba de cuenta corriente');
        console.log('3. Prueba de escáner USB');
        console.log('4. Prueba de impresión');
        console.log('5. Prueba completa del sistema');
        console.log('6. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.runBarcodeTest();
                    break;
                case '2':
                    this.runAccountTest();
                    break;
                case '3':
                    this.runUSBSannerTest();
                    break;
                case '4':
                    this.runPrintTest();
                    break;
                case '5':
                    this.runFullSystemTest();
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showTestTools();
            }
        });
    }

    /**
     * Herramientas de análisis
     */
    showAnalysisTools() {
        console.clear();
        console.log('📊 Herramientas de Análisis');
        console.log('============================');
        console.log('');
        console.log('1. Indexar base de código');
        console.log('2. Buscar código semánticamente');
        console.log('3. Analizar dependencias');
        console.log('4. Detectar código duplicado');
        console.log('5. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.indexCodebase();
                    break;
                case '2':
                    this.semanticSearch();
                    break;
                case '3':
                    this.analyzeDependencies();
                    break;
                case '4':
                    this.detectDuplicates();
                    break;
                case '5':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showAnalysisTools();
            }
        });
    }

    /**
     * Herramientas de mantenimiento
     */
    showMaintenanceTools() {
        console.clear();
        console.log('🔧 Herramientas de Mantenimiento');
        console.log('================================');
        console.log('');
        console.log('1. Limpieza de datos huérfanos');
        console.log('2. Verificación de consistencia de stock');
        console.log('3. Verificación de deudas de clientes');
        console.log('4. Diagnóstico general del sistema');
        console.log('5. Limpieza de datos de prueba');
        console.log('6. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.cleanOrphanData();
                    break;
                case '2':
                    this.checkStockConsistency();
                    break;
                case '3':
                    this.verifyClientDebts();
                    break;
                case '4':
                    this.diagnosticGeneral();
                    break;
                case '5':
                    this.cleanTestData();
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showMaintenanceTools();
            }
        });
    }

    /**
     * Herramientas de despliegue
     */
    showDeploymentTools() {
        console.clear();
        console.log('🚀 Herramientas de Despliegue');
        console.log('==============================');
        console.log('');
        console.log('1. Instalar dependencias');
        console.log('2. Configurar Qdrant');
        console.log('3. Integrar análisis de código');
        console.log('4. Iniciar todo el sistema');
        console.log('5. Configurar ngrok');
        console.log('6. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.installDependencies();
                    break;
                case '2':
                    this.setupQdrant();
                    break;
                case '3':
                    this.integrateCodeAnalysis();
                    break;
                case '4':
                    this.startFullSystem();
                    break;
                case '5':
                    this.setupNgrok();
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showDeploymentTools();
            }
        });
    }

    /**
     * Herramientas de Batch Runner
     */
    showBatchRunnerTools() {
        console.clear();
        console.log('⚡ Batch Runner (Automatización)');
        console.log('=================================');
        console.log('');
        console.log('1. Ejecutar mantenimiento diario');
        console.log('2. Ejecutar pruebas automatizadas');
        console.log('3. Ejecutar análisis de código');
        console.log('4. Programar tareas recurrentes');
        console.log('5. Ejecutar todas las tareas');
        console.log('6. Volver al menú principal');
        console.log('');

        this.rl.question('Selecciona una opción: ', (option) => {
            switch (option) {
                case '1':
                    this.runDailyMaintenance();
                    break;
                case '2':
                    this.runAutomatedTests();
                    break;
                case '3':
                    this.runCodeAnalysis();
                    break;
                case '4':
                    this.scheduleTasks();
                    break;
                case '5':
                    this.runAllTasks();
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('Opción no válida');
                    this.showBatchRunnerTools();
            }
        });
    }

    /**
     * Comandos de ejecución
     */
    startBackendServer() {
        console.log('🚀 Iniciando servidor backend...');
        try {
            execSync('node backend/server.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al iniciar el servidor:', error.message);
        }
    }

    startCodeAnalysis() {
        console.log('📊 Iniciando sistema de análisis de código...');
        try {
            execSync('cd code-analysis && npm run simple-server', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al iniciar análisis de código:', error.message);
        }
    }

    checkSystemHealth() {
        console.log('🏥 Verificando salud del sistema...');
        try {
            execSync('cd code-analysis && npm run system:health', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al verificar salud del sistema:', error.message);
        }
    }

    optimizePerformance() {
        console.log('⚡ Optimizando rendimiento...');
        try {
            execSync('cd code-analysis && npm run system:maximum-power', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al optimizar rendimiento:', error.message);
        }
    }

    viewSystemLogs() {
        console.log('📋 Mostrando logs del sistema...');
        try {
            execSync('cd code-analysis && npm run qdrant:logs', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al mostrar logs:', error.message);
        }
    }

    runBarcodeTest() {
        console.log('🧪 Ejecutando prueba de integración de códigos de barras...');
        try {
            execSync('node test_barcode_integration.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en prueba de códigos de barras:', error.message);
        }
    }

    runAccountTest() {
        console.log('🧪 Ejecutando prueba de cuenta corriente...');
        try {
            execSync('node test_cuenta_corriente_deudas.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en prueba de cuenta corriente:', error.message);
        }
    }

    runUSBSannerTest() {
        console.log('🧪 Ejecutando prueba de escáner USB...');
        try {
            execSync('node test_usb_scanner.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en prueba de escáner USB:', error.message);
        }
    }

    runPrintTest() {
        console.log('🧪 Ejecutando prueba de impresión...');
        try {
            execSync('node test_print_integration.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en prueba de impresión:', error.message);
        }
    }

    runFullSystemTest() {
        console.log('🧪 Ejecutando prueba completa del sistema...');
        try {
            execSync('node test_comprehensive.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en prueba completa:', error.message);
        }
    }

    indexCodebase() {
        console.log('📊 Indexando base de código...');
        try {
            execSync('cd code-analysis && npm run index-codebase', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al indexar código:', error.message);
        }
    }

    semanticSearch() {
        console.log('🔍 Buscando código semánticamente...');
        try {
            execSync('cd code-analysis && node test-search.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en búsqueda semántica:', error.message);
        }
    }

    analyzeDependencies() {
        console.log('📊 Analizando dependencias...');
        try {
            execSync('cd code-analysis && node scripts/analyze-file.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al analizar dependencias:', error.message);
        }
    }

    detectDuplicates() {
        console.log('🔍 Detectando código duplicado...');
        try {
            execSync('cd code-analysis && node scripts/detect-duplication.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al detectar duplicados:', error.message);
        }
    }

    cleanOrphanData() {
        console.log('🧹 Limpiando datos huérfanos...');
        try {
            execSync('node limpiar_datos_huerfanos.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al limpiar datos huérfanos:', error.message);
        }
    }

    checkStockConsistency() {
        console.log('✅ Verificando consistencia de stock...');
        try {
            execSync('node check_stock_consistency.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al verificar stock:', error.message);
        }
    }

    verifyClientDebts() {
        console.log('✅ Verificando deudas de clientes...');
        try {
            execSync('node verify_client_debts.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al verificar deudas:', error.message);
        }
    }

    diagnosticGeneral() {
        console.log('🏥 Realizando diagnóstico general...');
        try {
            execSync('node diagnostic-general.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en diagnóstico general:', error.message);
        }
    }

    cleanTestData() {
        console.log('🧹 Limpiando datos de prueba...');
        try {
            execSync('node clean_test_data.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al limpiar datos de prueba:', error.message);
        }
    }

    installDependencies() {
        console.log('📦 Instalando dependencias...');
        try {
            execSync('cd Post_2025/installer && install-vscode-extension.bat', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al instalar dependencias:', error.message);
        }
    }

    setupQdrant() {
        console.log('🚀 Configurando Qdrant...');
        try {
            execSync('cd Post_2025/installer && setup_qdrant.bat', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al configurar Qdrant:', error.message);
        }
    }

    integrateCodeAnalysis() {
        console.log('📊 Integrando análisis de código...');
        try {
            execSync('cd Post_2025/installer && integrate-code-analysis.bat', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al integrar análisis de código:', error.message);
        }
    }

    startFullSystem() {
        console.log('🚀 Iniciando todo el sistema...');
        try {
            execSync('cd Post_2025/installer/launchers && run_all.bat', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al iniciar el sistema:', error.message);
        }
    }

    setupNgrok() {
        console.log('🌐 Configurando ngrok...');
        try {
            execSync('cd Post_2025/installer/launchers && ngrok_setup.bat', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al configurar ngrok:', error.message);
        }
    }

    runDailyMaintenance() {
        console.log('📅 Ejecutando mantenimiento diario...');
        try {
            execSync('node pos-batch-runner.js daily', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en mantenimiento diario:', error.message);
        }
    }

    runAutomatedTests() {
        console.log('🧪 Ejecutando pruebas automatizadas...');
        try {
            execSync('node pos-batch-runner.js tests', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en pruebas automatizadas:', error.message);
        }
    }

    runCodeAnalysis() {
        console.log('📊 Ejecutando análisis de código...');
        try {
            execSync('node pos-batch-runner.js analysis', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error en análisis de código:', error.message);
        }
    }

    scheduleTasks() {
        console.log('⏰ Programando tareas recurrentes...');
        try {
            execSync('node pos-batch-runner.js schedule', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al programar tareas:', error.message);
        }
    }

    runAllTasks() {
        console.log('🚀 Ejecutando todas las tareas...');
        try {
            execSync('node pos-batch-runner.js all', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Error al ejecutar todas las tareas:', error.message);
        }
    }

    /**
     * Funcionalidades adicionales
     */
    showSystemStatus() {
        console.clear();
        console.log('📋 Estado del Sistema POS');
        console.log('=========================');
        console.log('');
        
        // Verificar si los servicios están corriendo
        try {
            const backendStatus = execSync('curl -s http://localhost:3000/health || echo "DOWN"', { encoding: 'utf8' }).trim();
            console.log(`Backend: ${backendStatus === 'UP' ? '✅ ONLINE' : '❌ OFFLINE'}`);
        } catch (error) {
            console.log('Backend: ❌ OFFLINE');
        }

        try {
            const qdrantStatus = execSync('curl -s http://localhost:6333/health || echo "DOWN"', { encoding: 'utf8' }).trim();
            console.log(`Qdrant: ${qdrantStatus === 'ok' ? '✅ ONLINE' : '❌ OFFLINE'}`);
        } catch (error) {
            console.log('Qdrant: ❌ OFFLINE');
        }

        try {
            const analysisStatus = execSync('curl -s http://localhost:3001/health || echo "DOWN"', { encoding: 'utf8' }).trim();
            console.log(`Análisis: ${analysisStatus === 'UP' ? '✅ ONLINE' : '❌ OFFLINE'}`);
        } catch (error) {
            console.log('Análisis: ❌ OFFLINE');
        }

        console.log('');
        this.rl.question('Presiona Enter para volver al menú principal...', () => this.showMainMenu());
    }

    showDocumentation() {
        console.clear();
        console.log('🆘 Documentación y Ayuda');
        console.log('========================');
        console.log('');
        console.log('Documentación disponible:');
        console.log('');
        console.log('• docs/HERRAMIENTAS_DISPONIBLES.md - Guía completa de herramientas');
        console.log('• docs/IMPLEMENTACION_SISTEMA_DEUDAS.md - Sistema de deudas');
        console.log('• docs/IMPLEMENTACION_OPTIMIZACION_DEUDAS.md - Optimización de deudas');
        console.log('• docs/README_USB_SCANNER.md - Configuración de escáner USB');
        console.log('• code-analysis/README.md - Sistema de análisis de código');
        console.log('');
        console.log('Para más información, consulta los archivos README en cada directorio.');
        console.log('');
        this.rl.question('Presiona Enter para volver al menú principal...', () => this.showMainMenu());
    }

    /**
     * Inicia el asistente
     */
    start() {
        this.showMainMenu();
        
        this.rl.on('line', (input) => {
            const option = input.trim();
            
            switch (option) {
                case '1':
                    this.showDevelopmentTools();
                    break;
                case '2':
                    this.showTestTools();
                    break;
                case '3':
                    this.showAnalysisTools();
                    break;
                case '4':
                    this.showMaintenanceTools();
                    break;
                case '5':
                    this.showDeploymentTools();
                    break;
                case '6':
                    this.showBatchRunnerTools();
                    break;
                case '7':
                    this.showSystemStatus();
                    break;
                case '8':
                    this.showDocumentation();
                    break;
                case '9':
                    console.log('👋 Gracias por usar el Sistema POS!');
                    this.rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log('Opción no válida. Por favor, selecciona una opción del 1 al 9.');
                    this.showMainMenu();
            }
        });
    }
}

// Iniciar el asistente
const helper = new POSToolsHelper();
helper.start();