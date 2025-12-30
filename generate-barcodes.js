#!/usr/bin/env node

/**
 * Generador de Códigos de Barras - Sistema POS
 * Genera imágenes PNG de códigos de barras para testing
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Productos de ejemplo con códigos reales
const productos = [
    { nombre: 'Agua Villavicencio 1.5L', precio: 1200, codigo: '7792900092980' },
    { nombre: 'Coca Cola 2.25L', precio: 2600, codigo: '7790895000997' },
    { nombre: 'Leche La Serenísima 1L', precio: 1600, codigo: '7790011163602' },
    { nombre: 'Arroz Gallo Oro 1kg', precio: 2800, codigo: '7790070318616' },
    { nombre: 'Fideos Matarazzo 500g', precio: 1800, codigo: '7790070336316' },
    { nombre: 'Aceite Natura 1.5L', precio: 2900, codigo: '7790272001005' },
    { nombre: 'Yerba Playadito 500g', precio: 3200, codigo: '7793704000911' },
    { nombre: 'Galletitas Oreo 117g', precio: 1900, codigo: '7622300724248' },
    { nombre: 'Carne Picada x kg', precio: 6500, codigo: '2000010000010' },
    { nombre: 'Papa Negra x kg', precio: 1200, codigo: '2000020000010' }
];

// Función para calcular dígito verificador EAN-13
function calcularDigitoVerificador(codigo) {
    if (codigo.length !== 12) return null;

    let suma = 0;
    for (let i = 0; i < 12; i++) {
        const digito = parseInt(codigo[i]);
        suma += i % 2 === 0 ? digito : digito * 3;
    }

    const resto = suma % 10;
    return resto === 0 ? 0 : 10 - resto;
}

// Función para generar código de barras EAN-13
function generarEAN13(codigo) {
    const digitoVerificador = calcularDigitoVerificador(codigo);
    if (digitoVerificador === null) return null;

    return codigo + digitoVerificador;
}

// Función para generar patrón de barras EAN-13
function generarPatronBarras(codigoCompleto) {
    // Patrones de codificación EAN-13 (simplificado)
    const izquierda = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const derecha = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

    // Patrón de paridad para el lado izquierdo
    const paridad = [
        'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
    ];

    const primerDigito = parseInt(codigoCompleto[0]);
    const patronParidad = paridad[primerDigito];

    let barras = '101'; // Inicio

    // Lado izquierdo (primeros 6 dígitos)
    for (let i = 1; i <= 6; i++) {
        const digito = parseInt(codigoCompleto[i]);
        const esPar = patronParidad[i-1] === 'L';
        barras += esPar ? izquierda[digito] : derecha[digito];
    }

    barras += '01010'; // Medio

    // Lado derecho (últimos 6 dígitos)
    for (let i = 7; i <= 12; i++) {
        const digito = parseInt(codigoCompleto[i]);
        barras += derecha[digito];
    }

    barras += '101'; // Fin

    return barras;
}

// Función para generar imagen del código de barras
function generarImagenBarcode(codigo, nombreProducto, precio) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);

    // Título del producto
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(nombreProducto, 200, 20);

    // Precio
    ctx.font = '16px Arial';
    ctx.fillText(`$${precio.toLocaleString()}`, 200, 40);

    // Código numérico
    ctx.font = '12px monospace';
    ctx.fillText(codigo, 200, 170);

    // Generar patrón de barras
    const barras = generarPatronBarras(codigo);
    if (!barras) {
        console.error(`Error generando patrón para ${codigo}`);
        return null;
    }

    // Dibujar barras
    const anchoBarra = 2;
    let x = 50;

    for (let i = 0; i < barras.length; i++) {
        const esBarra = barras[i] === '1';
        if (esBarra) {
            ctx.fillStyle = 'black';
            ctx.fillRect(x, 60, anchoBarra, 100);
        }
        x += anchoBarra;
    }

    return canvas;
}

// Función principal
function main() {
    console.log('🛒 Generador de Códigos de Barras - Sistema POS');
    console.log('==============================================\n');

    // Crear directorio para códigos de barras
    const outputDir = path.join(__dirname, 'barcodes');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
        console.log(`📁 Directorio creado: ${outputDir}`);
    }

    let generados = 0;
    let errores = 0;

    productos.forEach(producto => {
        try {
            console.log(`📦 Generando: ${producto.nombre}`);

            // Para códigos que empiezan con 20, usar CODE128 (genéricos)
            let codigoFinal = producto.codigo;
            if (producto.codigo.startsWith('20')) {
                // Usar CODE128 para códigos genéricos
                codigoFinal = producto.codigo;
            } else {
                // Verificar/completar EAN-13
                if (producto.codigo.length === 12) {
                    const digitoVerif = calcularDigitoVerificador(producto.codigo);
                    if (digitoVerif !== null) {
                        codigoFinal = producto.codigo + digitoVerif;
                        console.log(`   ✅ EAN-13 completado: ${codigoFinal}`);
                    }
                }
            }

            // Generar imagen (simplificada - solo texto por ahora)
            const canvas = createCanvas(400, 200);
            const ctx = canvas.getContext('2d');

            // Fondo blanco
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 400, 200);

            // Título del producto
            ctx.fillStyle = 'black';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(producto.nombre, 200, 30);

            // Precio
            ctx.font = '16px Arial';
            ctx.fillText(`$${producto.precio.toLocaleString()}`, 200, 55);

            // Código
            ctx.font = '12px monospace';
            ctx.fillText(`Código: ${codigoFinal}`, 200, 170);

            // Dibujar barras simples (representación visual)
            ctx.fillStyle = 'black';
            const codigoLimpio = codigoFinal.replace(/\D/g, '');
            for (let i = 0; i < codigoLimpio.length; i++) {
                const ancho = 8 + (parseInt(codigoLimpio[i]) * 2);
                ctx.fillRect(50 + (i * 25), 75, ancho, 80);
            }

            // Guardar imagen
            const nombreArchivo = producto.nombre
                .replace(/[^a-zA-Z0-9]/g, '_')
                .toLowerCase()
                .substring(0, 30);

            const outputPath = path.join(outputDir, `${nombreArchivo}.png`);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            console.log(`   ✅ Guardado: ${outputPath}`);
            generados++;

        } catch (error) {
            console.error(`   ❌ Error con ${producto.nombre}: ${error.message}`);
            errores++;
        }
    });

    console.log('\n==============================================');
    console.log(`✅ Generados: ${generados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📁 Archivos en: ${outputDir}`);
    console.log('\n💡 Abre barcode-generator.html en tu navegador para ver códigos interactivos');
    console.log('💡 O usa las imágenes PNG generadas para imprimir');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    // Verificar si canvas está instalado
    try {
        require('canvas');
        main();
    } catch (error) {
        console.error('❌ Error: Necesitas instalar canvas');
        console.log('Ejecuta: npm install canvas');
        process.exit(1);
    }
}

module.exports = { generarEAN13, calcularDigitoVerificador, generarPatronBarras };