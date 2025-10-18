-- Archivo: lista_productos_organizada_ampliada.sql
-- Productos organizados por categoría con stock = 20
-- Base de datos ampliada para el mercado argentino

-- Reset database: Delete all records from tables
DELETE FROM ventas;
DELETE FROM venta_items;
DELETE FROM cierres_caja;
DELETE FROM productos;

-- Pastas
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-001', 'Fideos (tallarín, codito, mostachol, etc.)', 1000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-002', 'Pastas secas en general', 1000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-003', 'Ravioles frescos', 1800, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-004', 'Ñoquis', 1600, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-005', 'Lasaña para armar', 1200, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-006', 'Capeletis', 2000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-007', 'Sorrentinos', 2200, 20, 'Pastas');

-- Cereales y Derivados
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-001', 'Arroz blanco', 1750, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-002', 'Arroz integral', 2150, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-003', 'Harina de trigo (000)', 1000, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-004', 'Harina de trigo (0000)', 1100, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-005', 'Harina leudante', 1250, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-006', 'Pan rallado', 800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-007', 'Rebozador', 900, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-008', 'Maíz (en grano o para pochoclo)', 950, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-009', 'Quinoa', 3500, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-010', 'Avena', 1400, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-011', 'Polenta', 800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-012', 'Sémola', 1300, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-013', 'Cebada perlada', 1800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-014', 'Harina integral', 1350, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-015', 'Harina de maíz', 950, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-016', 'Salvado', 1100, 20, 'Cereales y Derivados');

-- Conservas
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-001', 'Puré de tomate / Tomate triturado', 750, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-002', 'Tomate entero / rodajas', 750, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-003', 'Arvejas', 650, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-004', 'Zanahorias', 650, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-005', 'Choclo', 650, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-006', 'Atún / Caballa en lata', 1050, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-007', 'Sardinas en lata', 800, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-008', 'Lentejas en lata', 750, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-009', 'Garbanzos en lata', 750, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-010', 'Porotos en lata', 750, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-011', 'Palmitos', 1200, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-012', 'Aceitunas verdes', 900, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-013', 'Aceitunas negras', 950, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-014', 'Duraznos en almíbar', 1100, 20, 'Conservas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CONS-015', 'Cocktail de frutas', 1000, 20, 'Conservas');

-- Aceites y Vinagres
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-001', 'Aceite de girasol', 1750, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-002', 'Aceite de maíz', 1850, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-003', 'Aceite de oliva', 2750, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-004', 'Aceite de soja', 1750, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-005', 'Vinagre', 550, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-006', 'Aceite de oliva extra virgen', 4500, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-007', 'Aceite en spray', 1200, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-008', 'Vinagre de manzana', 800, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-009', 'Vinagre balsámico', 1500, 20, 'Aceites y Vinagres');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('ACEI-010', 'Vinagre de vino tinto', 650, 20, 'Aceites y Vinagres');

-- Condimentos y Especias
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-001', 'Sal', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-002', 'Pimienta', 450, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-003', 'Orégano', 300, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-004', 'Ají molido', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-005', 'Pimentón', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-006', 'Ajo en polvo', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-007', 'Cebolla en polvo', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-008', 'Caldo en cubos o polvo', 550, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-009', 'Comino', 350, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-010', 'Provenzal', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-011', 'Perejil deshidratado', 300, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-012', 'Laurel', 250, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-013', 'Nuez moscada', 600, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-014', 'Canela en polvo', 450, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-015', 'Curry', 500, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-016', 'Chimichurri', 400, 20, 'Condimentos y Especias');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('COND-017', 'Sazonador para asado', 350, 20, 'Condimentos y Especias');

-- Azúcar y Edulcorantes
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-001', 'Azúcar blanca', 1250, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-002', 'Azúcar impalpable', 1500, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-003', 'Edulcorantes (sobre o líquido)', 700, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-004', 'Azúcar mascabo', 1400, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-005', 'Azúcar rubia', 1300, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-006', 'Stevia', 1200, 20, 'Azúcar y Edulcorantes');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('AZUC-007', 'Sucralosa', 800, 20, 'Azúcar y Edulcorantes');

-- Dulces y Mermeladas
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-001', 'Dulce de leche', 1050, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-002', 'Mermelada (frutilla, durazno, etc.)', 900, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-003', 'Miel', 1400, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-004', 'Dulce de batata', 800, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-005', 'Dulce de membrillo', 850, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-006', 'Mermelada diet', 1100, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-007', 'Nutella', 2800, 20, 'Dulces y Mermeladas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('DULC-008', 'Manjar', 1200, 20, 'Dulces y Mermeladas');

-- Infusiones
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-001', 'Yerba mate', 1600, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-002', 'Café molido', 2000, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-003', 'Café instantáneo', 1400, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-004', 'Café en cápsulas', 1150, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-005', 'Té / Mate cocido (saquitos o hebras)', 550, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-006', 'Té verde', 800, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-007', 'Té rojo', 850, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-008', 'Manzanilla', 600, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-009', 'Tilo', 650, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-010', 'Boldo', 700, 20, 'Infusiones');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('INFU-011', 'Café en grano', 2500, 20, 'Infusiones');

-- Galletitas y Snacks
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-001', 'Galletitas dulces (de agua, crackers)', 600, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-002', 'Galletitas surtidas / rellenas', 800, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-003', 'Snacks (papas fritas, maní, palitos)', 700, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-004', 'Galletitas tipo Oreo', 1200, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-005', 'Galletitas saladas', 700, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-006', 'Tostadas', 800, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-007', 'Grisines', 650, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-008', 'Maníes salados', 900, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-009', 'Mix de frutos secos', 1800, 20, 'Galletitas y Snacks');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('GALL-010', 'Papas Pringles', 1400, 20, 'Galletitas y Snacks');

-- Lácteos
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-001', 'Leche en polvo', 1200, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-002', 'Leche UAT (larga vida)', 800, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-003', 'Leche fresca', 900, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-004', 'Leche descremada', 850, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-005', 'Leche sin lactosa', 1100, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-006', 'Crema de leche', 950, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-007', 'Manteca', 1200, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-008', 'Margarina', 800, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-009', 'Queso cremoso', 2200, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-010', 'Queso rallado', 1800, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-011', 'Yogur natural', 600, 20, 'Lácteos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LACT-012', 'Yogur con frutas', 700, 20, 'Lácteos');

-- Postres y Repostería
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-001', 'Premezclas para tortas', 900, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-002', 'Flanes en polvo', 400, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-003', 'Gelatinas en polvo', 350, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-004', 'Cacao en polvo', 600, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-005', 'Polvo para flan', 450, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-006', 'Esencia de vainilla', 350, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-007', 'Colorante alimentario', 250, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-008', 'Chips de chocolate', 1200, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-009', 'Coco rallado', 800, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-010', 'Almendras', 2500, 20, 'Postres y Repostería');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('POST-011', 'Nueces', 3000, 20, 'Postres y Repostería');

-- Otros
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-001', 'Mayonesa', 900, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-002', 'Mostaza', 500, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-003', 'Ketchup', 800, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-004', 'Salsas (soja, picantes, etc.)', 600, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-005', 'Tapas para empanadas y tartas', 700, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-006', 'Levadura / Leudantes', 500, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-007', 'Alfajores', 300, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-008', 'Chocolates', 800, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-009', 'Salsa golf', 950, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-010', 'Aceto balsámico', 1200, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-011', 'Salsa barbacoa', 800, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-012', 'Salsa cesar', 1100, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-013', 'Salsa de ajo', 750, 20, 'Otros');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('OTRO-014', 'Salsa picante', 600, 20, 'Otros');

-- Carnes y Embutidos
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-001', 'Carne picada', 2800, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-002', 'Asado', 3500, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-003', 'Matambre', 4200, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-004', 'Bife de chorizo', 4800, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-005', 'Pollo entero', 2200, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-006', 'Pechuga de pollo', 3200, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-007', 'Chorizo parrillero', 2800, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-008', 'Morcilla', 2200, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-009', 'Jamón cocido', 3500, 20, 'Carnes y Embutidos');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CARN-010', 'Salchichas', 1800, 20, 'Carnes y Embutidos');

-- Verduras y Frutas
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-001', 'Papa', 800, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-002', 'Cebolla', 600, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-003', 'Tomate', 1200, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-004', 'Lechuga', 750, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-005', 'Zanahoria', 650, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-006', 'Zapallo', 500, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('VERD-007', 'Morrón rojo', 1100, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-001', 'Banana', 900, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-002', 'Manzana', 1200, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-003', 'Naranja', 800, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-004', 'Limón', 600, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-005', 'Pera', 1300, 20, 'Verduras y Frutas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('FRUT-006', 'Uva', 1800, 20, 'Verduras y Frutas');

-- Bebidas
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-001', 'Agua mineral sin gas', 350, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-002', 'Agua mineral con gas', 350, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-003', 'Coca Cola', 800, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-004', 'Sprite', 800, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-005', 'Fanta', 800, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-006', 'Jugo de naranja', 1200, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-007', 'Jugo de manzana', 1200, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-008', 'Cerveza Quilmes', 450, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-009', 'Vino tinto', 1800, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-010', 'Vino blanco', 1800, 20, 'Bebidas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('BEB-011', 'Fernet Branca', 2200, 20, 'Bebidas');

-- Productos de Limpieza e Higiene
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-001', 'Detergente', 1200, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-002', 'Jabón en polvo', 1500, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-003', 'Suavizante', 800, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-004', 'Lavandina', 450, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-005', 'Papel higiénico', 1100, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-006', 'Servilletas', 600, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-007', 'Bolsas de residuos', 900, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-008', 'Esponjas', 400, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-009', 'Limpiador multiuso', 750, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('LIMP-010', 'Desinfectante', 850, 20, 'Productos de Limpieza e Higiene');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-008', 'Fideos spaghetti', 950, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-009', 'Penne rigate', 1100, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-010', 'Fideos al huevo', 1200, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-011', 'Pasta orgánica', 2000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-012', 'Fideos saborizados', 1300, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-013', 'Lasaña precocida', 1800, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-014', 'Ravioles de verdura', 2200, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-015', 'Ñoquis de papa', 1400, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-016', 'Capellettis de pollo', 1600, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-017', 'Fideos sin gluten', 2500, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-018', 'Fideos integrales', 1800, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-019', 'Fusilli', 1100, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-020', 'Canelones rellenos', 2300, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-021', 'Tortellini de jamón', 2600, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-022', 'Pappardelle', 2100, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-023', 'Tagliatelle', 2000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-024', 'Fideos moñito', 1000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-025', 'Ravioles de ricota', 2400, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-026', 'Fideos cintas', 1150, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-027', 'Fideos cabello de ángel', 900, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-028', 'Pasta de arroz', 2700, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-029', 'Fideos tricolor', 1300, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-030', 'Fideos corte especial', 1200, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-031', 'Pasta rellena artesanal', 3000, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-032', 'Fideos para sopa', 850, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-033', 'Fideos con espinaca', 1400, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-034', 'Fideos con remolacha', 1500, 20, 'Pastas');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('PAST-035', 'Sorrentinos de jamón y queso', 2800, 20, 'Pastas');

INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-017', 'Arroz jazmín', 1900, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-018', 'Arroz parboil', 1800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-019', 'Arroz yamani', 2400, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-020', 'Harina de centeno integral', 1600, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-021', 'Harina premezcla sin TACC', 1700, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-022', 'Harina de mandioca', 1500, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-023', 'Avena instantánea', 1650, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-024', 'Polenta saborizada', 900, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-025', 'Granola', 2800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-026', 'Barritas de cereales', 1200, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-027', 'Harina de garbanzo', 1800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-028', 'Trigo burgol', 850, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-029', 'Mijo', 1400, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-030', 'Sorgo en grano', 1100, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-031', 'Avena extra fina', 1500, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-032', 'Harina orgánica', 2200, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-033', 'Pan lactal integral', 1900, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-034', 'Copos de maíz', 1300, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-035', 'Copos de arroz', 1200, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-036', 'Harina de arroz', 1600, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-037', 'Salvado de trigo', 1000, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-038', 'Pan rallado sin gluten', 1300, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-039', 'Harina leudante nacional', 1250, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-040', 'Cereal de quinoa', 3500, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-041', 'Polenta lista', 1000, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-042', 'Fideos de arroz', 2800, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-043', 'Rebozador sin gluten', 1400, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-044', 'Cereal para desayuno', 1600, 20, 'Cereales y Derivados');
INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES ('CER-045', 'Harina para panes artesanales', 1800, 20, 'Cereales y Derivados');