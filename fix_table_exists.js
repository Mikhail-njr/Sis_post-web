#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Cambiar CREATE TABLE a CREATE TABLE IF NOT EXISTS
content = content.replace(
    '`CREATE TABLE pagos_deudas (',
    '`CREATE TABLE IF NOT EXISTS pagos_deudas ('
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Tabla pagos_deudas ahora usa IF NOT EXISTS');
