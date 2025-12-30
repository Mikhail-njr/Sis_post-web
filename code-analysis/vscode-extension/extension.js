// Extensión de VS Code para análisis de código del Sistema POS
const vscode = require('vscode');
const axios = require('axios');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('🎉 Extensión Code Analysis activada!');

    // Configuración
    const config = vscode.workspace.getConfiguration('codeAnalysis');
    const apiUrl = config.get('apiUrl', 'http://localhost:3001/api');
    const enableAutoAnalysis = config.get('enableAutoAnalysis', false);
    const showNotifications = config.get('showNotifications', true);

    // Estado de la extensión
    let analysisServerStatus = 'unknown';
    let outputChannel = vscode.window.createOutputChannel('Code Analysis');

    // Función para verificar estado del servidor
    async function checkServerStatus() {
        try {
            const response = await axios.get(`${apiUrl.replace('/api', '')}/health`, { timeout: 5000 });
            analysisServerStatus = response.data.status === 'healthy' ? 'online' : 'offline';
            return analysisServerStatus === 'online';
        } catch (error) {
            analysisServerStatus = 'offline';
            return false;
        }
    }

    // Función para mostrar mensaje si servidor está offline
    async function ensureServerOnline() {
        const isOnline = await checkServerStatus();
        if (!isOnline) {
            const startServer = await vscode.window.showErrorMessage(
                'El servidor de análisis no está ejecutándose. ¿Quieres iniciarlo?',
                'Iniciar Servidor',
                'Cancelar'
            );

            if (startServer === 'Iniciar Servidor') {
                vscode.commands.executeCommand('workbench.action.terminal.new');
                const terminal = vscode.window.activeTerminal;
                if (terminal) {
                    terminal.sendText('cd code-analysis && npm start');
                    vscode.window.showInformationMessage('Servidor iniciándose... Espera unos segundos y vuelve a intentar.');
                }
            }
            return false;
        }
        return true;
    }

    // Comando: Analizar archivo actual
    const analyzeCurrentFile = vscode.commands.registerCommand('codeAnalysis.analyzeCurrentFile', async function () {
        if (!(await ensureServerOnline())) return;

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto para analizar.');
            return;
        }

        const document = activeEditor.document;
        const fileName = document.fileName;
        const content = document.getText();

        if (!content.trim()) {
            vscode.window.showWarningMessage('El archivo está vacío.');
            return;
        }

        outputChannel.clear();
        outputChannel.show();

        try {
            outputChannel.appendLine(`🔍 Analizando: ${fileName}`);
            outputChannel.appendLine('⏳ Enviando código al servidor...\n');

            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analizando código...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 10, message: 'Enviando código...' });

                const language = detectLanguage(document.languageId);
                const apiResponse = await axios.post(`${apiUrl}/analyze/file`, {
                    content,
                    language,
                    filePath: fileName
                }, { timeout: 30000 });

                progress.report({ increment: 90, message: 'Procesando resultados...' });

                return apiResponse.data;
            });

            const analysis = response.analysis;
            displayAnalysisResults(analysis, fileName, outputChannel);

            if (showNotifications) {
                const issuesCount = analysis.issues.length;
                const suggestionsCount = analysis.suggestions.length;

                if (issuesCount > 0 || suggestionsCount > 0) {
                    vscode.window.showInformationMessage(
                        `Análisis completado: ${issuesCount} problema(s), ${suggestionsCount} sugerencia(s)`
                    );
                } else {
                    vscode.window.showInformationMessage('✅ Análisis completado - Código limpio');
                }
            }

        } catch (error) {
            outputChannel.appendLine(`❌ Error: ${error.message}`);
            vscode.window.showErrorMessage(`Error en análisis: ${error.message}`);
        }
    });

    // Comando: Buscar código similar
    const searchSimilar = vscode.commands.registerCommand('codeAnalysis.searchSimilar', async function () {
        if (!(await ensureServerOnline())) return;

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto.');
            return;
        }

        const selection = activeEditor.selection;
        let query = activeEditor.document.getText(selection);

        // Si no hay selección, usar la línea actual
        if (!query.trim()) {
            const currentLine = activeEditor.document.lineAt(selection.active.line);
            query = currentLine.text.trim();
        }

        if (!query.trim()) {
            vscode.window.showWarningMessage('Selecciona código o posiciona el cursor en una línea para buscar.');
            return;
        }

        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`🔍 Buscando código similar a:`);
        outputChannel.appendLine(`"${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"\n`);

        try {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Buscando código similar...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 50, message: 'Consultando base de datos...' });

                const language = detectLanguage(activeEditor.document.languageId);
                const apiResponse = await axios.post(`${apiUrl}/search/similar`, {
                    query,
                    language,
                    limit: 5
                });

                return apiResponse.data;
            });

            const results = response.results;

            if (results.length === 0) {
                outputChannel.appendLine('❌ No se encontraron patrones similares.');
                vscode.window.showInformationMessage('No se encontraron patrones similares.');
            } else {
                outputChannel.appendLine(`✅ Encontrados ${results.length} resultado(s):\n`);

                results.forEach((result, index) => {
                    outputChannel.appendLine(`${index + 1}. Similitud: ${(result.score * 100).toFixed(1)}%`);
                    outputChannel.appendLine(`   Lenguaje: ${result.language}`);
                    if (result.file_path) {
                        outputChannel.appendLine(`   Archivo: ${result.file_path}`);
                    }
                    outputChannel.appendLine('');
                });

                vscode.window.showInformationMessage(`Encontrados ${results.length} patrones similares.`);
            }

        } catch (error) {
            outputChannel.appendLine(`❌ Error: ${error.message}`);
            vscode.window.showErrorMessage(`Error en búsqueda: ${error.message}`);
        }
    });

    // Comando: Mostrar sugerencias
    const showSuggestions = vscode.commands.registerCommand('codeAnalysis.showSuggestions', async function () {
        if (!(await ensureServerOnline())) return;

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto.');
            return;
        }

        const document = activeEditor.document;
        const content = document.getText();

        try {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generando sugerencias...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 50, message: 'Analizando código...' });

                const language = detectLanguage(document.languageId);
                const apiResponse = await axios.post(`${apiUrl}/suggestions/improvements`, {
                    content,
                    language
                });

                return apiResponse.data;
            });

            const suggestions = response.suggestions;

            if (suggestions.length === 0) {
                vscode.window.showInformationMessage('🎉 No se encontraron sugerencias de mejora. ¡Buen trabajo!');
            } else {
                // Mostrar sugerencias en un Quick Pick
                const items = suggestions.map((suggestion, index) => ({
                    label: `${getPriorityIcon(suggestion.priority)} ${suggestion.message}`,
                    detail: suggestion.suggestion || '',
                    description: `${suggestion.category} - Prioridad ${suggestion.priority}`,
                    suggestion: suggestion
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Sugerencias de mejora (${suggestions.length})`,
                    matchOnDetail: true
                });

                if (selected) {
                    // Mostrar detalles de la sugerencia seleccionada
                    const detailMessage = selected.suggestion.suggestion ||
                        'Esta sugerencia no tiene detalles adicionales.';

                    vscode.window.showInformationMessage(
                        `${selected.suggestion.message}\n\n${detailMessage}`,
                        'Aceptar'
                    );
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error obteniendo sugerencias: ${error.message}`);
        }
    });

    // Comando: Indexar workspace
    const indexWorkspace = vscode.commands.registerCommand('codeAnalysis.indexWorkspace', async function () {
        if (!(await ensureServerOnline())) return;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No hay workspace abierto para indexar.');
            return;
        }

        const basePath = workspaceFolders[0].uri.fsPath;
        outputChannel.clear();
        outputChannel.show();

        try {
            outputChannel.appendLine(`📊 Indexando workspace: ${basePath}`);
            outputChannel.appendLine('⏳ Analizando archivos...\n');

            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Indexando workspace...',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 10, message: 'Escaneando archivos...' });

                const apiResponse = await axios.post(`${apiUrl}/index/codebase`, {
                    basePath,
                    excludePatterns: ['node_modules', '.git', '.vscode', 'dist', 'build', 'logs']
                }, {
                    timeout: 120000, // 2 minutos
                    cancelToken: new axios.CancelToken(cancel => {
                        token.onCancellationRequested(() => cancel('Operación cancelada'));
                    })
                });

                progress.report({ increment: 90, message: 'Finalizando indexación...' });

                return apiResponse.data;
            });

            const result = response.result;

            outputChannel.appendLine('✅ Indexación completada!');
            outputChannel.appendLine(`📁 Archivos totales: ${result.totalFiles}`);
            outputChannel.appendLine(`✅ Archivos procesados: ${result.processedFiles}`);
            outputChannel.appendLine(`❌ Errores: ${result.errors}`);
            outputChannel.appendLine(`🔍 Patrones indexados: ${result.indexedPatterns}`);

            vscode.window.showInformationMessage(
                `Indexación completada: ${result.processedFiles} archivos procesados`
            );

        } catch (error) {
            if (error.message !== 'Operación cancelada') {
                outputChannel.appendLine(`❌ Error en indexación: ${error.message}`);
                vscode.window.showErrorMessage(`Error en indexación: ${error.message}`);
            }
        }
    });

    // Análisis automático al guardar (opcional)
    if (enableAutoAnalysis) {
        const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (analysisServerStatus === 'online' && document.languageId.match(/(javascript|typescript|python|java)/)) {
                // Análisis silencioso en background
                try {
                    const content = document.getText();
                    const language = detectLanguage(document.languageId);

                    await axios.post(`${apiUrl}/analyze/file`, {
                        content,
                        language,
                        filePath: document.fileName
                    }, { timeout: 10000 });

                    // Mostrar indicador discreto
                    if (showNotifications) {
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Window,
                            title: 'Análisis automático completado',
                            cancellable: false
                        }, async (progress) => {
                            progress.report({ increment: 100 });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        });
                    }

                } catch (error) {
                    // Error silencioso en análisis automático
                    console.warn('Error en análisis automático:', error.message);
                }
            }
        });

        context.subscriptions.push(saveWatcher);
    }

    // Status bar item para mostrar estado del servidor
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'codeAnalysis.analyzeCurrentFile';

    async function updateStatusBar() {
        await checkServerStatus();

        if (analysisServerStatus === 'online') {
            statusBarItem.text = '$(check) Code Analysis';
            statusBarItem.tooltip = 'Servidor de análisis activo - Click para analizar archivo actual';
            statusBarItem.color = undefined;
        } else {
            statusBarItem.text = '$(x) Code Analysis';
            statusBarItem.tooltip = 'Servidor de análisis offline - Click para más información';
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        }

        statusBarItem.show();
    }

    // Actualizar status bar periódicamente
    updateStatusBar();
    const statusInterval = setInterval(updateStatusBar, 30000); // Cada 30 segundos

    // Limpiar intervalo al desactivar
    context.subscriptions.push({
        dispose: () => clearInterval(statusInterval)
    });

    // Registrar comandos
    context.subscriptions.push(
        analyzeCurrentFile,
        searchSimilar,
        showSuggestions,
        indexWorkspace,
        statusBarItem
    );

    console.log('🚀 Extensión Code Analysis completamente cargada!');
}

// Función auxiliar para detectar lenguaje
function detectLanguage(languageId) {
    const languageMap = {
        javascript: 'javascript',
        javascriptreact: 'javascript',
        typescript: 'typescript',
        typescriptreact: 'typescript',
        python: 'python',
        java: 'java',
        sql: 'sql',
        php: 'php',
        ruby: 'ruby',
        go: 'go',
        rust: 'rust',
        cpp: 'cpp',
        c: 'c',
        csharp: 'csharp'
    };

    return languageMap[languageId] || languageId;
}

// Función para mostrar resultados de análisis
function displayAnalysisResults(analysis, fileName, outputChannel) {
    const fileBaseName = require('path').basename(fileName);

    outputChannel.appendLine(`📄 ANÁLISIS COMPLETADO: ${fileBaseName}`);
    outputChannel.appendLine('=' .repeat(50));
    outputChannel.appendLine('');

    // Métricas básicas
    outputChannel.appendLine('📊 MÉTRICAS BÁSICAS:');
    outputChannel.appendLine(`   Líneas totales: ${analysis.metrics.lines}`);
    outputChannel.appendLine(`   Funciones: ${analysis.metrics.functions}`);
    outputChannel.appendLine(`   Clases: ${analysis.metrics.classes}`);
    outputChannel.appendLine(`   Imports: ${analysis.metrics.imports}`);
    outputChannel.appendLine(`   Comentarios: ${analysis.metrics.comments}`);
    outputChannel.appendLine('');

    // Complejidad
    outputChannel.appendLine('🧠 ANÁLISIS DE COMPLEJIDAD:');
    outputChannel.appendLine(`   Puntuación: ${analysis.complexity.score.toFixed(1)}`);
    outputChannel.appendLine(`   Nivel: ${analysis.complexity.level.toUpperCase()}`);
    outputChannel.appendLine('');

    // Problemas
    outputChannel.appendLine(`⚠️ PROBLEMAS DETECTADOS (${analysis.issues.length}):`);
    if (analysis.issues.length > 0) {
        analysis.issues.forEach((issue, index) => {
            const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
            outputChannel.appendLine(`   ${index + 1}. ${icon} ${issue.message}`);
            outputChannel.appendLine(`      Severidad: ${issue.severity}`);
        });
    } else {
        outputChannel.appendLine('   ✅ No se detectaron problemas');
    }
    outputChannel.appendLine('');

    // Sugerencias
    outputChannel.appendLine(`💡 SUGERENCIAS (${analysis.suggestions.length}):`);
    if (analysis.suggestions.length > 0) {
        analysis.suggestions.forEach((suggestion, index) => {
            const icon = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
            outputChannel.appendLine(`   ${index + 1}. ${icon} ${suggestion.message}`);
            if (suggestion.suggestion) {
                outputChannel.appendLine(`      💡 ${suggestion.suggestion}`);
            }
        });
    } else {
        outputChannel.appendLine('   ✅ No hay sugerencias adicionales');
    }
    outputChannel.appendLine('');

    outputChannel.appendLine('=' .repeat(50));
    outputChannel.appendLine(`⏰ Análisis completado: ${new Date().toLocaleTimeString()}`);
}

// Función auxiliar para iconos de prioridad
function getPriorityIcon(priority) {
    switch (priority) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🟢';
        default: return '⚪';
    }
}

function deactivate() {
    console.log('👋 Extensión Code Analysis desactivada');
}

module.exports = {
    activate,
    deactivate
};