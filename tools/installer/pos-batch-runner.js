#!/usr/bin/env node

/**
 * Ejemplo de uso de Batch Runner con el Sistema POS
 * 
 * Este script demuestra cómo automatizar tareas comunes del proyecto
 * utilizando Batch Runner para ejecución masiva y programada.
 */

const { BatchRunner } = require('batch-runner');
const path = require('path');
const fs = require('fs');

class POSBatchRunner {
    constructor() {
        this.runner = new BatchRunner();
        this.projectRoot = path.resolve(__dirname);
    }

    /**
     * Configura tareas de mantenimiento diario
     */
    setupDailyTasks() {
        console.log('🔧 Configurando tareas de mantenimiento diario...');

        const dailyTasks = [
            {
                name: 'Verificación de consistencia de stock',
                script: path.join(this.projectRoot, 'check_stock_consistency.js'),
                timeout: 30000,
                retry: 2
            },
            {
                name: 'Verificación de deudas de clientes',
                script: path.join(this.projectRoot, 'verify_client_debts.js'),
                timeout: 30000,
                retry: 2
            },
            {
                name: 'Diagnóstico de endpoints',
                script: path.join(this.projectRoot, 'diagnostic_endpoints.js'),
                timeout: 30000,
                retry: 1
            },
            {
                name: 'Limpieza de datos huérfanos',
                script: path.join(this.projectRoot, 'limpiar_datos_huerfanos.js'),
                timeout: 60000,
                retry: 1
            }
        ];

        return dailyTasks;
    }

    /**
     * Configura tareas de pruebas automatizadas
     */
    setupTestTasks() {
        console.log('🧪 Configurando tareas de pruebas automatizadas...');

        const testTasks = [
            {
                name: 'Prueba de integración de códigos de barras',
                script: path.join(this.projectRoot, 'test_barcode_integration.js'),
                timeout: 60000,
                retry: 3
            },
            {
                name: 'Prueba de cuenta corriente',
                script: path.join(this.projectRoot, 'test_cuenta_corriente_deudas.js'),
                timeout: 60000,
                retry: 2
            },
            {
                name: 'Prueba de escáner USB',
                script: path.join(this.projectRoot, 'test_usb_scanner.js'),
                timeout: 30000,
                retry: 2
            },
            {
                name: 'Prueba de impresión',
                script: path.join(this.projectRoot, 'test_print_integration.js'),
                timeout: 30000,
                retry: 1
            }
        ];

        return testTasks;
    }

    /**
     * Configura tareas de análisis de código
     */
    setupAnalysisTasks() {
        console.log('📊 Configurando tareas de análisis de código...');

        const analysisTasks = [
            {
                name: 'Indexar base de código',
                script: path.join(this.projectRoot, 'code-analysis', 'scripts', 'index-codebase.js'),
                timeout: 120000,
                retry: 1,
                cwd: path.join(this.projectRoot, 'code-analysis')
            },
            {
                name: 'Iniciar servidor de análisis',
                script: path.join(this.projectRoot, 'code-analysis', 'simple-server.js'),
                timeout: 30000,
                retry: 1,
                cwd: path.join(this.projectRoot, 'code-analysis')
            },
            {
                name: 'Verificar salud del sistema',
                script: path.join(this.projectRoot, 'code-analysis', 'test-search.js'),
                timeout: 30000,
                retry: 2,
                cwd: path.join(this.projectRoot, 'code-analysis')
            }
        ];

        return analysisTasks;
    }

    /**
     * Ejecuta tareas diarias
     */
    async runDailyMaintenance() {
        console.log('📅 Iniciando mantenimiento diario...');
        
        const tasks = this.setupDailyTasks();
        
        try {
            const results = await this.runner.run(tasks, {
                parallel: true,
                timeout: 180000,
                onProgress: (progress) => {
                    console.log(`Progreso: ${progress.completed}/${progress.total} tareas completadas`);
                }
            });

            console.log('✅ Mantenimiento diario completado');
            this.printResults(results);
            
            return results;
        } catch (error) {
            console.error('❌ Error en mantenimiento diario:', error);
            throw error;
        }
    }

    /**
     * Ejecuta pruebas automatizadas
     */
    async runAutomatedTests() {
        console.log('🧪 Iniciando pruebas automatizadas...');
        
        const tasks = this.setupTestTasks();
        
        try {
            const results = await this.runner.run(tasks, {
                parallel: false, // Ejecutar secuencialmente para mejor diagnóstico
                timeout: 300000,
                onProgress: (progress) => {
                    console.log(`Prueba ${progress.completed}/${progress.total} completada`);
                }
            });

            console.log('✅ Pruebas automatizadas completadas');
            this.printResults(results);
            
            return results;
        } catch (error) {
            console.error('❌ Error en pruebas automatizadas:', error);
            throw error;
        }
    }

    /**
     * Ejecuta análisis de código
     */
    async runCodeAnalysis() {
        console.log('📊 Iniciando análisis de código...');
        
        const tasks = this.setupAnalysisTasks();
        
        try {
            const results = await this.runner.run(tasks, {
                parallel: true,
                timeout: 300000,
                onProgress: (progress) => {
                    console.log(`Análisis ${progress.completed}/${progress.total} completado`);
                }
            });

            console.log('✅ Análisis de código completado');
            this.printResults(results);
            
            return results;
        } catch (error) {
            console.error('❌ Error en análisis de código:', error);
            throw error;
        }
    }

    /**
     * Programa tareas recurrentes
     */
    scheduleRecurringTasks() {
        console.log('⏰ Programando tareas recurrentes...');

        // Tarea diaria a las 2 AM
        this.runner.schedule({
            cron: '0 2 * * *',
            tasks: this.setupDailyTasks(),
            name: 'Mantenimiento Diario POS'
        });

        // Tarea semanal los lunes a las 3 AM
        this.runner.schedule({
            cron: '0 3 * * 1',
            tasks: [
                ...this.setupDailyTasks(),
                {
                    name: 'Análisis de rendimiento',
                    script: path.join(this.projectRoot, 'code-analysis', 'scripts', 'analyze-file.js'),
                    timeout: 120000,
                    retry: 1
                }
            ],
            name: 'Mantenimiento Semanal POS'
        });

        console.log('✅ Tareas programadas exitosamente');
    }

    /**
     * Imprime resultados de las tareas
     */
    printResults(results) {
        console.log('\n📋 Resultados de las tareas:');
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.success ? 'Éxito' : 'Fallido'}`);
            if (result.error) {
                console.log(`   Error: ${result.error.message}`);
            }
            if (result.output) {
                console.log(`   Salida: ${result.output.slice(0, 100)}...`);
            }
        });
    }

    /**
     * Ejecuta todas las tareas en secuencia
     */
    async runAll() {
        console.log('🚀 Iniciando ejecución completa...\n');

        try {
            // 1. Mantenimiento diario
            await this.runDailyMaintenance();
            console.log('');

            // 2. Pruebas automatizadas
            await this.runAutomatedTests();
            console.log('');

            // 3. Análisis de código
            await this.runCodeAnalysis();
            console.log('');

            console.log('🎉 Ejecución completa exitosa!');
        } catch (error) {
            console.error('💥 Error en ejecución completa:', error);
            process.exit(1);
        }
    }
}

// Ejemplo de uso
if (require.main === module) {
    const posRunner = new POSBatchRunner();

    const command = process.argv[2];

    switch (command) {
        case 'daily':
            posRunner.runDailyMaintenance();
            break;
        case 'tests':
            posRunner.runAutomatedTests();
            break;
        case 'analysis':
            posRunner.runCodeAnalysis();
            break;
        case 'schedule':
            posRunner.scheduleRecurringTasks();
            break;
        case 'all':
            posRunner.runAll();
            break;
        default:
            console.log('Uso: node pos-batch-runner.js [daily|tests|analysis|schedule|all]');
            console.log('');
            console.log('Comandos disponibles:');
            console.log('  daily     - Ejecuta tareas de mantenimiento diario');
            console.log('  tests     - Ejecuta pruebas automatizadas');
            console.log('  analysis  - Ejecuta análisis de código');
            console.log('  schedule  - Programa tareas recurrentes');
            console.log('  all       - Ejecuta todas las tareas');
            break;
    }
}

module.exports = POSBatchRunner;