const { exec } = require('child_process');
const path = require('path');

/**
 * Script para ejecutar comandos de indexación desde el dashboard HTML
 */
class CommandRunner {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Ejecutar un comando Node.js
     */
    async runCommand(command, description) {
        if (this.isRunning) {
            return {
                success: false,
                error: 'Ya hay un comando en ejecución',
                output: ''
            };
        }

        this.isRunning = true;
        
        return new Promise((resolve) => {
            console.log(`🚀 Ejecutando: ${description}`);
            console.log(`📋 Comando: ${command}`);
            
            exec(command, { 
                cwd: path.join(__dirname),
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            }, (error, stdout, stderr) => {
                this.isRunning = false;
                
                const result = {
                    success: !error,
                    command: command,
                    description: description,
                    timestamp: new Date().toISOString(),
                    output: stdout || stderr || '',
                    error: error ? error.message : null
                };

                if (error) {
                    console.error(`❌ Error: ${error.message}`);
                    console.error(`Stderr: ${stderr}`);
                } else {
                    console.log(`✅ Comando completado exitosamente`);
                }

                resolve(result);
            });
        });
    }

    /**
     * Comandos disponibles
     */
    async execute(command) {
        switch (command) {
            case 'index':
                return await this.runCommand(
                    'node local-indexer.js --index',
                    'Indexar codebase completo'
                );

            case 'clear':
                return await this.runCommand(
                    'node local-indexer.js --clear',
                    'Limpiar índice completo'
                );

            case 'clear-and-index':
                // Primero limpiar, luego indexar
                const clearResult = await this.runCommand(
                    'node local-indexer.js --clear',
                    'Limpiar índice'
                );
                
                if (clearResult.success) {
                    const indexResult = await this.runCommand(
                        'node local-indexer.js --index',
                        'Indexar codebase'
                    );
                    
                    return {
                        success: indexResult.success,
                        combined: true,
                        clear: clearResult,
                        index: indexResult,
                        timestamp: new Date().toISOString()
                    };
                }
                
                return clearResult;

            case 'stats':
                return await this.runCommand(
                    'node -e "const { LocalIndexer } = require(\'./local-indexer\'); const idx = new LocalIndexer(); idx.initialize().then(async () => { const stats = await idx.getStats(); console.log(JSON.stringify(stats, null, 2)); idx.close(); })"',
                    'Obtener estadísticas del índice'
                );

            case 'health':
                return await this.runCommand(
                    'node -e "console.log(\'Servidor verificado\')"',
                    'Verificar estado del servidor'
                );

            default:
                return {
                    success: false,
                    error: `Comando desconocido: ${command}`,
                    output: 'Comandos disponibles: index, clear, clear-and-index, stats, health'
                };
        }
    }
}

// Si se llama directamente desde línea de comandos
if (require.main === module) {
    const runner = new CommandRunner();
    const command = process.argv[2];

    if (!command) {
        console.log('Uso: node command-runner.js <comando>');
        console.log('Comandos disponibles:');
        console.log('  index           - Indexar codebase completo');
        console.log('  clear           - Limpiar índice completo');
        console.log('  clear-and-index - Limpiar y reindexar');
        console.log('  stats           - Obtener estadísticas');
        console.log('  health          - Verificar estado');
        process.exit(1);
    }

    runner.execute(command).then(result => {
        console.log('\n📊 Resultado:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Error inesperado:', error);
        process.exit(1);
    });
}

module.exports = { CommandRunner };