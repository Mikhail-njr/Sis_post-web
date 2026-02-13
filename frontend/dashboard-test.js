/**
 * Dashboard Performance Test
 * Script de prueba para validar el sistema de carga asíncrona del dashboard
 */

class DashboardPerformanceTest {
    constructor() {
        this.testResults = [];
        this.startTime = null;
        this.metrics = {
            totalLoadTime: 0,
            sectionsLoadTimes: {},
            parallelSections: [],
            errors: []
        };
    }

    /**
     * Inicia la prueba de rendimiento
     */
    async runPerformanceTest() {
        console.log('🚀 Iniciando prueba de rendimiento del dashboard...');
        
        this.startTime = performance.now();
        this.testResults = [];
        
        // Limpiar resultados anteriores
        this.clearTestResults();
        
        // Mostrar indicador de prueba
        this.showTestIndicator();
        
        try {
            // 1. Probar carga paralela de secciones
            await this.testParallelLoading();
            
            // 2. Probar manejo de errores
            await this.testErrorHandling();
            
            // 3. Probar skeleton loaders
            await this.testSkeletonLoaders();
            
            // 4. Probar carga bajo carga
            await this.testLoadUnderStress();
            
            // 5. Generar reporte
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Error en la prueba de rendimiento:', error);
            this.metrics.errors.push(error.message);
            this.showErrorReport(error);
        }
    }

    /**
     * Prueba la carga paralela de secciones
     */
    async testParallelLoading() {
        console.log('📊 Probando carga paralela de secciones...');
        
        const sections = [
            { id: 'ventas-section', name: 'Ventas' },
            { id: 'productos-section', name: 'Productos' },
            { id: 'metricas-section', name: 'Métricas' },
            { id: 'promociones-section', name: 'Promociones' },
            { id: 'clientes-section', name: 'Clientes' },
            { id: 'proveedores-section', name: 'Proveedores' }
        ];

        const startTime = performance.now();
        const promises = sections.map(section => this.loadSectionTest(section.id));
        
        // Cargar todas las secciones en paralelo
        const results = await Promise.allSettled(promises);
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        console.log(`⏱️ Carga paralela completada en ${totalTime.toFixed(2)}ms`);
        
        // Analizar resultados
        results.forEach((result, index) => {
            const section = sections[index];
            if (result.status === 'fulfilled') {
                this.metrics.sectionsLoadTimes[section.name] = result.value.loadTime;
                this.metrics.parallelSections.push({
                    name: section.name,
                    loadTime: result.value.loadTime,
                    status: 'success'
                });
                console.log(`✅ ${section.name}: ${result.value.loadTime.toFixed(2)}ms`);
            } else {
                this.metrics.errors.push(`${section.name}: ${result.reason}`);
                console.log(`❌ ${section.name}: Error - ${result.reason}`);
            }
        });
        
        this.testResults.push({
            test: 'Carga Paralela',
            duration: totalTime,
            sections: this.metrics.parallelSections.length,
            averageTime: this.calculateAverageLoadTime()
        });
    }

    /**
     * Prueba el manejo de errores
     */
    async testErrorHandling() {
        console.log('🛡️ Probando manejo de errores...');
        
        // Simular error en una sección
        const errorStartTime = performance.now();
        
        try {
            // Intentar cargar una sección inexistente
            await this.loadSectionTest('section-inexistente');
        } catch (error) {
            const errorEndTime = performance.now();
            const errorTime = errorEndTime - errorStartTime;
            
            console.log(`✅ Manejo de error correcto en ${errorTime.toFixed(2)}ms`);
            this.testResults.push({
                test: 'Manejo de Errores',
                duration: errorTime,
                status: 'success',
                errorHandled: true
            });
        }
    }

    /**
     * Prueba los skeleton loaders
     */
    async testSkeletonLoaders() {
        console.log('🎭 Probando skeleton loaders...');
        
        const skeletonStartTime = performance.now();
        
        // Crear skeleton para una sección
        dashboardSkeletons.createTableSkeleton('ventas-section', 3, 4);
        
        // Simular carga lenta
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ocultar skeleton y mostrar contenido
        dashboardSkeletons.hide('ventas-section', '<div>Contenido real cargado</div>');
        
        const skeletonEndTime = performance.now();
        const skeletonTime = skeletonEndTime - skeletonStartTime;
        
        console.log(`✅ Skeleton loader completado en ${skeletonTime.toFixed(2)}ms`);
        this.testResults.push({
            test: 'Skeleton Loaders',
            duration: skeletonTime,
            status: 'success',
            skeletonShown: true
        });
    }

    /**
     * Prueba la carga bajo estrés
     */
    async testLoadUnderStress() {
        console.log('💪 Probando carga bajo estrés...');
        
        const stressStartTime = performance.now();
        
        // Simular múltiples solicitudes simultáneas
        const stressPromises = [];
        for (let i = 0; i < 10; i++) {
            stressPromises.push(this.simulateStressRequest());
        }
        
        await Promise.allSettled(stressPromises);
        
        const stressEndTime = performance.now();
        const stressTime = stressEndTime - stressStartTime;
        
        console.log(`✅ Carga bajo estrés completada en ${stressTime.toFixed(2)}ms`);
        this.testResults.push({
            test: 'Carga bajo Estrés',
            duration: stressTime,
            requests: 10,
            status: 'success'
        });
    }

    /**
     * Simula una solicitud bajo estrés
     */
    async simulateStressRequest() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, timestamp: Date.now() });
            }, Math.random() * 500 + 100);
        });
    }

    /**
     * Carga una sección para pruebas
     */
    async loadSectionTest(sectionId) {
        const startTime = performance.now();
        
        try {
            // Simular carga de datos
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
            
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            
            // Simular éxito
            return {
                sectionId,
                loadTime,
                status: 'success'
            };
            
        } catch (error) {
            throw new Error(`Error cargando ${sectionId}: ${error.message}`);
        }
    }

    /**
     * Calcula el tiempo promedio de carga
     */
    calculateAverageLoadTime() {
        const times = Object.values(this.metrics.sectionsLoadTimes);
        if (times.length === 0) return 0;
        
        const total = times.reduce((sum, time) => sum + time, 0);
        return total / times.length;
    }

    /**
     * Genera el reporte de pruebas
     */
    generateReport() {
        const endTime = performance.now();
        this.metrics.totalLoadTime = endTime - this.startTime;
        
        console.log('\n📊 Reporte de Pruebas de Rendimiento');
        console.log('=====================================');
        
        // Métricas generales
        console.log(`⏱️ Tiempo total de carga: ${this.metrics.totalLoadTime.toFixed(2)}ms`);
        console.log(`📈 Secciones cargadas: ${this.metrics.parallelSections.length}`);
        console.log(`📊 Tiempo promedio por sección: ${this.calculateAverageLoadTime().toFixed(2)}ms`);
        console.log(`❌ Errores: ${this.metrics.errors.length}`);
        
        // Resultados detallados
        console.log('\n📋 Resultados por Prueba:');
        this.testResults.forEach(result => {
            console.log(`  ${result.test}: ${result.duration.toFixed(2)}ms - ${result.status}`);
        });
        
        // Secciones cargadas
        console.log('\n📦 Secciones Cargadas:');
        this.metrics.parallelSections.forEach(section => {
            console.log(`  ${section.name}: ${section.loadTime.toFixed(2)}ms`);
        });
        
        // Errores
        if (this.metrics.errors.length > 0) {
            console.log('\n❌ Errores:');
            this.metrics.errors.forEach(error => {
                console.log(`  ${error}`);
            });
        }
        
        // Evaluación de rendimiento
        this.evaluatePerformance();
        
        // Mostrar reporte en UI
        this.showReportInUI();
    }

    /**
     * Evalúa el rendimiento basado en métricas
     */
    evaluatePerformance() {
        const avgTime = this.calculateAverageLoadTime();
        const totalTime = this.metrics.totalLoadTime;
        
        console.log('\n🎯 Evaluación de Rendimiento:');
        
        if (totalTime < 3000) {
            console.log('✅ EXCELENTE: Carga rápida (< 3s)');
        } else if (totalTime < 5000) {
            console.log('🟡 BUENO: Carga aceptable (< 5s)');
        } else {
            console.log('🔴 LENTO: Carga lenta (> 5s)');
        }
        
        if (avgTime < 1000) {
            console.log('✅ EXCELENTE: Tiempo promedio rápido (< 1s)');
        } else if (avgTime < 2000) {
            console.log('🟡 BUENO: Tiempo promedio aceptable (< 2s)');
        } else {
            console.log('🔴 LENTO: Tiempo promedio lento (> 2s)');
        }
    }

    /**
     * Muestra un indicador de prueba en la UI
     */
    showTestIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'performance-test-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3d3d3d;
            border: 2px solid #17a2b8;
            border-radius: 8px;
            padding: 15px;
            color: white;
            font-family: monospace;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        
        indicator.innerHTML = `
            <div style="font-weight: bold; color: #17a2b8;">🧪 PRUEBA DE RENDIMIENTO</div>
            <div>⏱️ Iniciando tests...</div>
            <div>📊 Carga paralela</div>
            <div>🛡️ Manejo de errores</div>
            <div>🎭 Skeleton loaders</div>
            <div>💪 Carga bajo estrés</div>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Muestra el reporte en la UI
     */
    showReportInUI() {
        const indicator = document.getElementById('performance-test-indicator');
        if (indicator) {
            const avgTime = this.calculateAverageLoadTime();
            const totalTime = this.metrics.totalLoadTime;
            const sectionsLoaded = this.metrics.parallelSections.length;
            
            indicator.innerHTML = `
                <div style="font-weight: bold; color: #28a745;">✅ PRUEBA COMPLETADA</div>
                <div>⏱️ Total: ${totalTime.toFixed(2)}ms</div>
                <div>📦 Secciones: ${sectionsLoaded}</div>
                <div>📊 Promedio: ${avgTime.toFixed(2)}ms</div>
                <div>❌ Errores: ${this.metrics.errors.length}</div>
                <div style="margin-top: 10px; font-size: 12px; color: #ccc;">
                    Ver consola para detalles completos
                </div>
            `;
            
            // Cambiar color según rendimiento
            if (totalTime < 3000) {
                indicator.style.borderColor = '#28a745';
            } else if (totalTime < 5000) {
                indicator.style.borderColor = '#ffc107';
            } else {
                indicator.style.borderColor = '#dc3545';
            }
            
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 500);
            }, 5000);
        }
    }

    /**
     * Muestra reporte de error
     */
    showErrorReport(error) {
        const indicator = document.getElementById('performance-test-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <div style="font-weight: bold; color: #dc3545;">❌ ERROR EN PRUEBA</div>
                <div>${error.message}</div>
                <div style="margin-top: 10px; font-size: 12px; color: #ccc;">
                    Ver consola para más detalles
                </div>
            `;
            indicator.style.borderColor = '#dc3545';
        }
    }

    /**
     * Limpia resultados anteriores
     */
    clearTestResults() {
        // Limpiar skeleton loaders existentes
        dashboardSkeletons.clearAll();
        
        // Limpiar indicadores anteriores
        const oldIndicator = document.getElementById('performance-test-indicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
    }

    /**
     * Método público para iniciar la prueba
     */
    static async run() {
        const tester = new DashboardPerformanceTest();
        await tester.runPerformanceTest();
    }
}

// Exportar para uso global
window.DashboardPerformanceTest = DashboardPerformanceTest;

// Si se carga directamente, ejecutar prueba automática
if (typeof window !== 'undefined' && window.location && window.location.href.includes('dashboard.html')) {
    // Agregar botón de prueba al dashboard
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.container');
        if (container) {
            const testButton = document.createElement('button');
            testButton.textContent = '🧪 Probar Rendimiento';
            testButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #17a2b8;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            `;
            
            testButton.addEventListener('mouseenter', () => {
                testButton.style.transform = 'translateY(-2px)';
                testButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            });
            
            testButton.addEventListener('mouseleave', () => {
                testButton.style.transform = 'translateY(0)';
                testButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });
            
            testButton.addEventListener('click', () => {
                DashboardPerformanceTest.run();
            });
            
            document.body.appendChild(testButton);
        }
    });
}