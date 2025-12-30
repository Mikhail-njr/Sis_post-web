const fs = require('fs');
const path = require('path');

// Función para calcular similitud de texto simple
function calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

// Función para encontrar duplicaciones de texto
function findTextDuplications(files) {
    const duplicates = [];

    for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
            const file1 = files[i];
            const file2 = files[j];

            // Calcular similitud
            const similarity = calculateTextSimilarity(file1.content, file2.content);

            if (similarity > 0.8) { // Umbral alto para similitud de texto
                duplicates.push({
                    file1: file1.path,
                    file2: file2.path,
                    similarity: similarity,
                    lines1: file1.lines,
                    lines2: file2.lines
                });
            }
        }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
}

// Función para encontrar funciones duplicadas
function findDuplicateFunctions(files) {
    const functions = new Map();

    files.forEach(file => {
        // Buscar definiciones de funciones con regex
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\(|(\w+)\s*\()/g;
        let match;

        while ((match = functionRegex.exec(file.content)) !== null) {
            const funcName = match[1] || match[2] || match[3];
            if (!functions.has(funcName)) {
                functions.set(funcName, []);
            }
            functions.get(funcName).push({
                file: file.path,
                line: file.content.substring(0, match.index).split('\n').length
            });
        }
    });

    // Filtrar funciones que aparecen en múltiples archivos
    const duplicates = [];
    for (const [funcName, locations] of functions) {
        if (locations.length > 1) {
            duplicates.push({
                function: funcName,
                locations: locations,
                count: locations.length
            });
        }
    }

    return duplicates.sort((a, b) => b.count - a.count);
}

// Función para encontrar código duplicado exacto (bloques de líneas)
function findExactCodeBlocks(files, minLines = 5) {
    const blocks = new Map();

    files.forEach(file => {
        const lines = file.content.split('\n');

        for (let i = 0; i <= lines.length - minLines; i++) {
            const block = lines.slice(i, i + minLines).join('\n').trim();
            if (block.length > 20) { // Evitar bloques muy cortos
                const key = block.toLowerCase().replace(/\s+/g, ' ');
                if (!blocks.has(key)) {
                    blocks.set(key, []);
                }
                blocks.get(key).push({
                    file: file.path,
                    startLine: i + 1,
                    content: block
                });
            }
        }
    });

    // Filtrar bloques que aparecen en múltiples archivos
    const duplicates = [];
    for (const [block, locations] of blocks) {
        if (locations.length > 1) {
            duplicates.push({
                block: block.substring(0, 100) + '...',
                locations: locations,
                count: locations.length
            });
        }
    }

    return duplicates.sort((a, b) => b.count - a.count);
}

// Función principal
async function detectTextDuplication() {
    try {
        console.log('🔍 Iniciando detección de duplicación de texto...\n');

        const projectPath = path.resolve(__dirname, '../..');
        const files = getCodeFiles(projectPath);

        console.log(`📂 Analizando ${files.length} archivos de código\n`);

        // 1. Duplicación de archivos completos
        console.log('📄 Buscando archivos duplicados...');
        const fileDuplicates = findTextDuplications(files);
        console.log(`Encontrados ${fileDuplicates.length} pares de archivos similares\n`);

        if (fileDuplicates.length > 0) {
            fileDuplicates.forEach((dup, index) => {
                console.log(`${index + 1}. Archivos similares:`);
                console.log(`   📄 ${path.relative(projectPath, dup.file1)}`);
                console.log(`   📄 ${path.relative(projectPath, dup.file2)}`);
                console.log(`   📊 Similitud: ${(dup.similarity * 100).toFixed(1)}%`);
                console.log(`   📏 Líneas: ${dup.lines1} / ${dup.lines2}`);
                console.log('');
            });
        }

        // 2. Funciones duplicadas
        console.log('🔧 Buscando funciones duplicadas...');
        const functionDuplicates = findDuplicateFunctions(files);
        console.log(`Encontradas ${functionDuplicates.length} funciones en múltiples archivos\n`);

        if (functionDuplicates.length > 0) {
            functionDuplicates.slice(0, 10).forEach((dup, index) => {
                console.log(`${index + 1}. Función: ${dup.function}`);
                console.log(`   📊 Aparece en ${dup.count} archivos:`);
                dup.locations.forEach(loc => {
                    console.log(`     - ${path.relative(projectPath, loc.file)}:línea ${loc.line}`);
                });
                console.log('');
            });
        }

        // 3. Bloques de código duplicados
        console.log('📋 Buscando bloques de código duplicados...');
        const blockDuplicates = findExactCodeBlocks(files);
        console.log(`Encontrados ${blockDuplicates.length} bloques duplicados\n`);

        if (blockDuplicates.length > 0) {
            blockDuplicates.slice(0, 10).forEach((dup, index) => {
                console.log(`${index + 1}. Bloque duplicado (${dup.count} veces):`);
                console.log(`   "${dup.block}"`);
                console.log('   Aparece en:');
                dup.locations.forEach(loc => {
                    console.log(`     - ${path.relative(projectPath, loc.file)}:línea ${loc.startLine}`);
                });
                console.log('');
            });
        }

        // 4. Análisis específico de duplicaciones conocidas
        console.log('🎯 Análisis de duplicaciones específicas:');

        // Buscar apiRequest function
        const apiRequestDuplicates = findSpecificFunction('apiRequest', files);
        if (apiRequestDuplicates.length > 1) {
            console.log(`\n🔍 Función 'apiRequest' duplicada:`);
            apiRequestDuplicates.forEach((loc, index) => {
                console.log(`   ${index + 1}. ${path.relative(projectPath, loc.file)}:línea ${loc.line}`);
            });
        }

        // Buscar isValidEAN13 function
        const ean13Duplicates = findSpecificFunction('isValidEAN13', files);
        if (ean13Duplicates.length > 1) {
            console.log(`\n🔍 Función 'isValidEAN13' duplicada:`);
            ean13Duplicates.forEach((loc, index) => {
                console.log(`   ${index + 1}. ${path.relative(projectPath, loc.file)}:línea ${loc.line}`);
            });
        }

        console.log('\n✅ Análisis de duplicación completado.');

    } catch (error) {
        console.error('❌ Error detectando duplicación:', error);
        process.exit(1);
    }
}

function findSpecificFunction(funcName, files) {
    const locations = [];

    files.forEach(file => {
        const regex = new RegExp(`function\\s+${funcName}|const\\s+${funcName}\\s*=|${funcName}\\s*\\(`, 'g');
        let match;

        while ((match = regex.exec(file.content)) !== null) {
            locations.push({
                file: file.path,
                line: file.content.substring(0, match.index).split('\n').length
            });
        }
    });

    return locations;
}

function getCodeFiles(basePath, excludeDirs = ['excluded']) {
    const files = [];
    const extensions = ['.js', '.ts', '.py', '.java'];

    function scanDir(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && !excludeDirs.includes(item)) {
                    scanDir(fullPath);
                } else if (stat.isFile() && extensions.includes(path.extname(item))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        files.push({
                            path: fullPath,
                            content,
                            lines: content.split('\n').length
                        });
                    } catch (error) {
                        console.warn(`⚠️ Error leyendo archivo ${fullPath}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error escaneando directorio ${dirPath}:`, error.message);
        }
    }

    scanDir(basePath);
    return files;
}

// Ejecutar si se llama directamente
if (require.main === module) {
    detectTextDuplication();
}

module.exports = { detectTextDuplication };