const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Función para remover acentos
function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Testing search query for "Afna"...');

const searchTerm = 'Afna';
const normalizedTerm = searchTerm.toLowerCase().trim();
const exactCodeMatch = normalizedTerm;
const startsWithName = normalizedTerm + '%';
const containsMatch = '%' + normalizedTerm + '%';

console.log('Search term:', searchTerm);
console.log('Normalized:', normalizedTerm);
console.log('Exact code match:', exactCodeMatch);
console.log('Starts with name:', startsWithName);
console.log('Contains match:', containsMatch);

const params = [
    removeAccents(exactCodeMatch), // for exact code
    removeAccents(startsWithName), // for starts with name
    removeAccents(containsMatch), removeAccents(containsMatch), // for contains
    `${normalizedTerm}* OR ${normalizedTerm}` // for FTS
];

console.log('Params:', params);

const query = `
    SELECT p.id, p.nombre, p.codigo,
           CASE WHEN removeAccents(LOWER(p.codigo)) = removeAccents(?) THEN 100 ELSE 0 END +
           CASE WHEN removeAccents(LOWER(p.nombre)) LIKE removeAccents(?) THEN 90 ELSE 0 END +
           CASE WHEN (removeAccents(LOWER(p.nombre)) LIKE removeAccents(?) OR removeAccents(LOWER(p.codigo)) LIKE removeAccents(?)) THEN 70 ELSE 0 END +
           CASE WHEN p.id IN (SELECT rowid FROM productos_fts WHERE productos_fts MATCH ?) THEN 50 ELSE 0 END
           as search_score
    FROM productos p
    WHERE p.activo = 1
    HAVING search_score > 0
    ORDER BY search_score DESC, p.nombre ASC
    LIMIT 50 OFFSET 0
`;

db.all(query, params, (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Results:', rows.length);
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Nombre: ${row.nombre}, Código: ${row.codigo}, Score: ${row.search_score}`);
        });
    }
    db.close();
});