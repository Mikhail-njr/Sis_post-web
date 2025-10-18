const db = require('./database-sqlite.js').getDB();

const productos = [
    ['1', 'Fideos (tallarín, codito, mostachol, etc.)', 1000, 0, 'Pastas'],
    ['2', 'Pastas secas en general', 1000, 0, 'Pastas'],
    ['3', 'Arroz blanco', 1750, 0, 'Cereales y Derivados'],
    ['4', 'Arroz integral', 2150, 0, 'Cereales y Derivados'],
    ['5', 'Harina de trigo (000)', 1000, 0, 'Cereales y Derivados'],
    ['6', 'Harina de trigo (0000)', 1100, 0, 'Cereales y Derivados'],
    ['7', 'Harina leudante', 1250, 0, 'Cereales y Derivados'],
    ['8', 'Pan rallado', 800, 0, 'Cereales y Derivados'],
    ['9', 'Rebozador', 900, 0, 'Cereales y Derivados'],
    ['10', 'Maíz (en grano o para pochoclo)', 950, 0, 'Cereales y Derivados'],
    ['11', 'Puré de tomate / Tomate triturado', 750, 0, 'Conservas'],
    ['12', 'Tomate entero / rodajas', 750, 0, 'Conservas'],
    ['13', 'Arvejas', 650, 0, 'Conservas'],
    ['14', 'Zanahorias', 650, 0, 'Conservas'],
    ['15', 'Choclo', 650, 0, 'Conservas'],
    ['16', 'Atún / Caballa en lata', 1050, 0, 'Conservas'],
    ['17', 'Sardinas en lata', 800, 0, 'Conservas'],
    ['18', 'Aceite de girasol', 1750, 0, 'Aceites y Vinagres'],
    ['19', 'Aceite de maíz', 1850, 0, 'Aceites y Vinagres'],
    ['20', 'Aceite de oliva', 2750, 0, 'Aceites y Vinagres'],
    ['21', 'Aceite de soja', 1750, 0, 'Aceites y Vinagres'],
    ['22', 'Vinagre', 550, 0, 'Aceites y Vinagres'],
    ['23', 'Sal', 400, 0, 'Condimentos y Especias'],
    ['24', 'Pimienta', 450, 0, 'Condimentos y Especias'],
    ['25', 'Orégano', 300, 0, 'Condimentos y Especias'],
    ['26', 'Ají molido', 400, 0, 'Condimentos y Especias'],
    ['27', 'Pimentón', 400, 0, 'Condimentos y Especias'],
    ['28', 'Ajo en polvo', 400, 0, 'Condimentos y Especias'],
    ['29', 'Cebolla en polvo', 400, 0, 'Condimentos y Especias'],
    ['30', 'Caldo en cubos o polvo', 550, 0, 'Condimentos y Especias'],
    ['31', 'Azúcar blanca', 1250, 0, 'Azúcar y Edulcorantes'],
    ['32', 'Azúcar impalpable', 1500, 0, 'Azúcar y Edulcorantes'],
    ['33', 'Edulcorantes (sobre o líquido)', 700, 0, 'Azúcar y Edulcorantes'],
    ['34', 'Dulce de leche', 1050, 0, 'Dulces y Mermeladas'],
    ['35', 'Mermelada (frutilla, durazno, etc.)', 900, 0, 'Dulces y Mermeladas'],
    ['36', 'Miel', 1400, 0, 'Dulces y Mermeladas'],
    ['37', 'Yerba mate', 1600, 0, 'Infusiones'],
    ['38', 'Café molido', 2000, 0, 'Infusiones'],
    ['39', 'Café instantáneo', 1400, 0, 'Infusiones'],
    ['40', 'Café en cápsulas', 1150, 0, 'Infusiones'],
    ['41', 'Té / Mate cocido (saquitos o hebras)', 550, 0, 'Infusiones'],
    ['42', 'Galletitas dulces (de agua, crackers)', 600, 0, 'Galletitas y Snacks'],
    ['43', 'Galletitas surtidas / rellenas', 800, 0, 'Galletitas y Snacks'],
    ['44', 'Snacks (papas fritas, maní, palitos)', 700, 0, 'Galletitas y Snacks'],
    ['45', 'Leche en polvo', 1200, 0, 'Lácteos'],
    ['46', 'Leche UAT (larga vida)', 800, 0, 'Lácteos'],
    ['47', 'Premezclas para tortas', 900, 0, 'Postres y Repostería'],
    ['48', 'Flanes en polvo', 400, 0, 'Postres y Repostería'],
    ['49', 'Gelatinas en polvo', 350, 0, 'Postres y Repostería'],
    ['50', 'Cacao en polvo', 600, 0, 'Postres y Repostería'],
    ['51', 'Mayonesa', 900, 0, 'Otros'],
    ['52', 'Mostaza', 500, 0, 'Otros'],
    ['53', 'Ketchup', 800, 0, 'Otros'],
    ['54', 'Salsas (soja, picantes, etc.)', 600, 0, 'Otros'],
    ['55', 'Tapas para empanadas y tartas', 700, 0, 'Otros'],
    ['56', 'Levadura / Leudantes', 500, 0, 'Otros'],
    ['57', 'Alfajores', 300, 0, 'Otros'],
    ['58', 'Chocolates', 800, 0, 'Otros']
];

const stmt = db.prepare(`
    INSERT OR IGNORE INTO productos (codigo, nombre, precio, stock, categoria) 
    VALUES (?, ?, ?, ?, ?)
`);

productos.forEach(producto => {
    stmt.run(producto, (err) => {
        if (err) {
            console.error('Error inserting:', err);
        }
    });
});

stmt.finalize(() => {
    console.log('✅ Productos insertados');
    db.close();
});