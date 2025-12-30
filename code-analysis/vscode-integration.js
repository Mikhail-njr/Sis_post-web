// Integración con Visual Studio Code
// Este archivo proporciona funciones para integrar el análisis de código
// con las herramientas nativas de VS Code

const vscode = require('vscode');
const axios = require('axios');

class VSCodeIntegration {
    constructor(analysisAPI = 'http://localhost:3001/api') {
        this.analysisAPI = analysisAPI;
        this.outputChannel = null;
    }

    // Inicializar canal de salida para VS Code
    initializeOutputChannel() {
        this.outputChannel = vscode.window.createOutputChannel('Code Analysis');
        console.log = (...args) => {
            this.outputChannel.appendLine(args.join(' '));
        };
    }

    // Registrar comandos de VS Code
    registerCommands(context) {
        // Comando: Analizar archivo actual
        const analyzeCurrentFile = vscode.commands.registerCommand(
            'codeAnalysis.analyzeCurrentFile',
            () => this.analyzeCurrentFile()
        );

        // Comando: Buscar código similar
        const searchSimilarCode = vscode.commands.registerCommand(
            'codeAnalysis.searchSimilar',
            () => this.searchSimilarCode()
        );

        // Comando: Mostrar sugerencias
        const showSuggestions = vscode.commands.registerCommand(
            'codeAnalysis.showSuggestions',
            () => this.showSuggestions()
        );

        // Comando: Indexar workspace
        const indexWorkspace = vscode.commands.registerCommand(
            'codeAnalysis.indexWorkspace',
            () => this.indexWorkspace()
        );

        context.subscriptions.push(
            analyzeCurrentFile,
            searchSimilarCode,
            showSuggestions,
            indexWorkspace
        );
    }

    // Analizar el archivo actualmente abierto
    async analyzeCurrentFile() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto');
            return;
        }

        const document = activeEditor.document;
        const filePath = document.fileName;
        const content = document.getText();
        const language = this.detectLanguageFromDocument(document);

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analizando código...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Enviando a análisis...' });

                const response = await axios.post(`${this.analysisAPI}/analyze/file`, {
                    content,
                    language,
                    filePath
                });

                progress.report({ increment: 100, message: 'Análisis completado' });

                const analysis = response.data.analysis;
                this.displayAnalysisResults(analysis, filePath);

            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error en análisis: ${error.message}`);
        }
    }

    // Buscar código similar al seleccionado
    async searchSimilarCode() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto');
            return;
        }

        const selection = activeEditor.selection;
        const selectedText = activeEditor.document.getText(selection);

        if (!selectedText.trim()) {
            vscode.window.showErrorMessage('Selecciona código para buscar similares');
            return;
        }

        try {
            const response = await axios.post(`${this.analysisAPI}/search/similar`, {
                query: selectedText,
                language: this.detectLanguageFromDocument(activeEditor.document),
                limit: 5
            });

            const results = response.data.results;
            this.displaySimilarResults(results, selectedText);

        } catch (error) {
            vscode.window.showErrorMessage(`Error en búsqueda: ${error.message}`);
        }
    }

    // Mostrar sugerencias para el archivo actual
    async showSuggestions() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No hay ningún archivo abierto');
            return;
        }

        const document = activeEditor.document;
        const content = document.getText();
        const language = this.detectLanguageFromDocument(document);

        try {
            const response = await axios.post(`${this.analysisAPI}/suggestions/improvements`, {
                content,
                language
            });

            const suggestions = response.data.suggestions;
            this.displaySuggestions(suggestions);

        } catch (error) {
            vscode.window.showErrorMessage(`Error obteniendo sugerencias: ${error.message}`);
        }
    }

    // Indexar todo el workspace
    async indexWorkspace() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No hay workspace abierto');
            return;
        }

        const basePath = workspaceFolders[0].uri.fsPath;

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Indexando workspace...',
                cancellable: true
            }, async (progress, token) => {

                const response = await axios.post(`${this.analysisAPI}/index/codebase`, {
                    basePath,
                    excludePatterns: ['node_modules', '.git', '.vscode', 'dist', 'build']
                });

                // Mostrar progreso basado en respuesta (simulado)
                progress.report({ increment: 50, message: 'Procesando archivos...' });

                // Verificar cancelación
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 100, message: 'Indexación completada' });

                const result = response.data.result;
                vscode.window.showInformationMessage(
                    `Indexación completada: ${result.processedFiles} archivos procesados`
                );

            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error en indexación: ${error.message}`);
        }
    }

    // Mostrar resultados del análisis
    displayAnalysisResults(analysis, filePath) {
        const panel = vscode.window.createWebviewPanel(
            'codeAnalysis',
            `Análisis: ${require('path').basename(filePath)}`,
            vscode.ViewColumn.Beside,
            {}
        );

        panel.webview.html = this.generateAnalysisHTML(analysis, filePath);
    }

    // Mostrar resultados de búsqueda similar
    displaySimilarResults(results, query) {
        const panel = vscode.window.createWebviewPanel(
            'similarCode',
            'Código Similar Encontrado',
            vscode.ViewColumn.Beside,
            {}
        );

        panel.webview.html = this.generateSimilarHTML(results, query);
    }

    // Mostrar sugerencias
    displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            vscode.window.showInformationMessage('No se encontraron sugerencias de mejora');
            return;
        }

        const items = suggestions.map(suggestion => ({
            label: `${this.getPriorityIcon(suggestion.priority)} ${suggestion.message}`,
            detail: suggestion.suggestion || '',
            description: suggestion.category
        }));

        vscode.window.showQuickPick(items, {
            placeHolder: 'Sugerencias de mejora'
        });
    }

    // Generar HTML para resultados de análisis
    generateAnalysisHTML(analysis, filePath) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Análisis de Código</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007acc; }
                    .issue { margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
                    .suggestion { margin: 10px 0; padding: 10px; background: #d1ecf1; border-left: 4px solid #17a2b8; }
                    .complexity { font-weight: bold; color: ${this.getComplexityColor(analysis.complexity.level)}; }
                </style>
            </head>
            <body>
                <h2>📄 Análisis: ${require('path').basename(filePath)}</h2>

                <h3>📊 Métricas Básicas</h3>
                <div class="metric">Líneas: ${analysis.metrics.lines}</div>
                <div class="metric">Funciones: ${analysis.metrics.functions}</div>
                <div class="metric">Clases: ${analysis.metrics.classes}</div>
                <div class="metric">Comentarios: ${analysis.metrics.comments}</div>

                <h3>🧠 Complejidad</h3>
                <div class="metric complexity">
                    Puntuación: ${analysis.complexity.score.toFixed(1)} (${analysis.complexity.level})
                </div>

                <h3>⚠️ Problemas Detectados (${analysis.issues.length})</h3>
                ${analysis.issues.map(issue => `
                    <div class="issue">
                        <strong>${this.getSeverityIcon(issue.severity)} ${issue.message}</strong>
                        <br><small>Severidad: ${issue.severity}</small>
                    </div>
                `).join('')}

                <h3>💡 Sugerencias (${analysis.suggestions.length})</h3>
                ${analysis.suggestions.map(suggestion => `
                    <div class="suggestion">
                        <strong>${this.getPriorityIcon(suggestion.priority)} ${suggestion.message}</strong>
                        ${suggestion.suggestion ? `<br><em>${suggestion.suggestion}</em>` : ''}
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }

    // Generar HTML para resultados similares
    generateSimilarHTML(results, query) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Código Similar</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .result { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                    .similarity { color: #007acc; font-weight: bold; }
                    .code { background: #f8f8f8; padding: 10px; margin: 10px 0; font-family: monospace; }
                </style>
            </head>
            <body>
                <h2>🔍 Código Similar Encontrado</h2>
                <p><strong>Consulta:</strong> ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}</p>

                ${results.map(result => `
                    <div class="result">
                        <div class="similarity">Similitud: ${(result.score * 100).toFixed(1)}%</div>
                        <div><strong>Lenguaje:</strong> ${result.language}</div>
                        ${result.file_path ? `<div><strong>Archivo:</strong> ${result.file_path}</div>` : ''}
                        ${result.content ? `
                            <div class="code">${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }

    // Utilidades
    detectLanguageFromDocument(document) {
        const languageId = document.languageId;
        const languageMap = {
            javascript: 'javascript',
            typescript: 'typescript',
            python: 'python',
            java: 'java',
            sql: 'sql',
            'javascriptreact': 'javascript',
            'typescriptreact': 'typescript'
        };
        return languageMap[languageId] || languageId;
    }

    getComplexityColor(level) {
        const colors = {
            low: '#28a745',
            medium: '#ffc107',
            high: '#fd7e14',
            very_high: '#dc3545'
        };
        return colors[level] || '#6c757d';
    }

    getSeverityIcon(severity) {
        const icons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return icons[severity] || '⚪';
    }

    getPriorityIcon(priority) {
        const icons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }
}

module.exports = { VSCodeIntegration };