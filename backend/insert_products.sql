-- ================================================================
-- BASE DE DATOS DE PRODUCTOS ARGENTINA - EAN REALES + GENÉRICOS
-- ===============================================================

-- 1. Limpieza inicial (Ordenada por dependencias)
DELETE FROM venta_items;
DELETE FROM ventas;
DELETE FROM cierres_caja;
DELETE FROM productos;

-- 2. Asegurar columna de códigos de barra
-- Si usas SQLite/Postgres/MySQL, asegurate que esta columna exista:
-- ALTER TABLE productos ADD COLUMN codigo_barras VARCHAR(20);

-- ================================================================
-- INSERTAR PRODUCTOS CON CÓDIGOS REALES (TOP MARCAS ARGENTINA)
-- ===============================================================

-- BEBIDAS (Gaseosas, Aguas y Alcohol)
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('BEB-001', 'Agua Mineral Villavicencio Sin Gas 1.5L', 1200, 0, 'Bebidas', '7792900092980'),
('BEB-002', 'Agua Saborizada Levite Pomelo 1.5L', 1400, 0, 'Bebidas', '7792900001777'),
('BEB-003', 'Coca Cola Sabor Original 2.25L', 2600, 0, 'Bebidas', '7790895000997'),
('BEB-004', 'Sprite Lima Limón 2.25L', 2600, 0, 'Bebidas', '7790895000430'),
('BEB-005', 'Fanta Naranja 2.25L', 2600, 0, 'Bebidas', '7790895000836'),
('BEB-008', 'Cerveza Quilmes Clásica 473ml (Lata)', 1300, 0, 'Bebidas', '7791290790971'),
('BEB-009', 'Vino Tinto Benjamin Malbec 750ml', 3500, 0, 'Bebidas', '7790142000787'),
('BEB-011', 'Fernet Branca 750ml', 9800, 0, 'Bebidas', '7790070411713');

-- ALMACÉN: CEREALES Y HARINAS
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('CER-001', 'Arroz Gallo Oro 1kg (Estuche)', 2800, 0, 'Cereales y Derivados', '7790070318616'),
('CER-002', 'Arroz Lucchetti Largo Fino 1kg', 1900, 0, 'Cereales y Derivados', '7790070507440'),
('CER-003', 'Harina de Trigo 000 Cañuelas 1kg', 1100, 0, 'Cereales y Derivados', '7792180005229'),
('CER-004', 'Harina de Trigo 0000 Blancaflor 1kg', 1500, 0, 'Cereales y Derivados', '7790070506924'),
('CER-005', 'Harina Leudante Blancaflor 1kg', 1600, 0, 'Cereales y Derivados', '7790070411843'),
('CER-006', 'Pan Rallado Preferido 500g', 1400, 0, 'Cereales y Derivados', '7790040133406'),
('CER-011', 'Polenta Prestopronta 500g', 1350, 0, 'Cereales y Derivados', '7790060023664'),
('CER-034', 'Copos de Maíz Kellogg''s 200g', 2500, 0, 'Cereales y Derivados', '7798113300243');

-- PASTAS SECAS (Marcas Líderes)
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('PAST-001', 'Fideos Matarazzo Tallarín 500g', 1800, 0, 'Pastas', '7790070336316'),
('PAST-002', 'Fideos Lucchetti Mostachol 500g', 1400, 0, 'Pastas', '7790070336149'),
('PAST-008', 'Fideos Spaghetti Matarazzo 500g', 1800, 0, 'Pastas', '7790070336347'),
('PAST-019', 'Fideos Tirabuzón Don Vicente 500g', 2200, 0, 'Pastas', '7790070318210'),
('PAST-004', 'Ñoquis de Papa La Salteña (Fresco)', 2800, 0, 'Pastas', '7790070342027');

-- CONSERVAS Y LATAS
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('CONS-001', 'Puré de Tomate Arcor 520g', 950, 0, 'Conservas', '7790580504201'),
('CONS-003', 'Arvejas La Campagnola Lata', 1100, 0, 'Conservas', '7790070225020'),
('CONS-005', 'Choclo Cremoso Arcor Lata', 1200, 0, 'Conservas', '7790580980906'),
('CONS-006', 'Atún La Campagnola al Natural 170g', 3200, 0, 'Conservas', '7790070228137'),
('CONS-014', 'Duraznos en Almíbar La Campagnola Lata', 3800, 0, 'Conservas', '7790070230215');

-- ACEITES, VINAGRES Y CONDIMENTOS
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('ACEI-001', 'Aceite Girasol Natura 1.5L', 2900, 0, 'Aceites y Vinagres', '7790272001005'),
('ACEI-003', 'Aceite Oliva Cocinero Clásico 500ml', 5500, 0, 'Aceites y Vinagres', '7790070231533'),
('ACEI-005', 'Vinagre de Alcohol Menoyo 1L', 1100, 0, 'Aceites y Vinagres', '7790100003116'),
('OTRO-001', 'Mayonesa Hellmanns Clásica Doypack 475g', 2200, 0, 'Otros', '7790060000436'),
('OTRO-002', 'Mostaza Savora Original 250g', 1600, 0, 'Otros', '7793360000166'),
('OTRO-003', 'Ketchup Arcor 250g', 1800, 0, 'Otros', '7790580980005'),
('COND-001', 'Sal Fina Dos Anclas Estuche 500g', 900, 0, 'Condimentos y Especias', '7792900000428'),
('AZUC-001', 'Azúcar Ledesma Clásica 1kg', 1400, 0, 'Azúcar y Edulcorantes', '7792540260138');

-- INFUSIONES
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('INFU-001', 'Yerba Mate Playadito 500g', 3200, 0, 'Infusiones', '7793704000911'),
('INFU-012', 'Yerba Mate Taragüi 500g', 3100, 0, 'Infusiones', '7790387013333'),
('INFU-002', 'Café Molido La Virginia 500g', 6500, 0, 'Infusiones', '7790477052129'),
('INFU-003', 'Café Instantáneo Nescafé Dolca 100g', 4200, 0, 'Infusiones', '7613036297600'),
('INFU-005', 'Té Taragüi 25 saquitos', 1100, 0, 'Infusiones', '7790019024165');

-- DULCES Y GALLETITAS
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('DULC-001', 'Dulce de Leche La Serenísima Colonial 400g', 2800, 0, 'Dulces y Mermeladas', '7790011284819'),
('DULC-002', 'Mermelada Arcor Durazno 454g', 2100, 0, 'Dulces y Mermeladas', '7790580506311'),
('GALL-001', 'Galletitas Criollitas Pack 3', 1800, 0, 'Galletitas y Snacks', '7790040304059'),
('GALL-002', 'Galletitas Bagley Surtido Diversión 400g', 2500, 0, 'Galletitas y Snacks', '7790580660006'),
('GALL-004', 'Galletitas Oreo 117g', 1900, 0, 'Galletitas y Snacks', '7622300724248'),
('GALL-005', 'Galletitas Traviata Paquete', 1200, 0, 'Galletitas y Snacks', '7790040502554');

-- LÁCTEOS
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('LACT-002', 'Leche La Serenísima Larga Vida Entera 1L', 1600, 0, 'Lácteos', '7790011163602'),
('LACT-004', 'Leche La Serenísima Larga Vida Descremada 1L', 1600, 0, 'Lácteos', '7790011163619'),
('LACT-007', 'Manteca La Serenísima 200g', 2800, 0, 'Lácteos', '7790011024088'),
('LACT-009', 'Queso Cremoso La Paulina (Trozo 500g aprox)', 4500, 0, 'Lácteos', '7790398003859'),
('LACT-011', 'Yogur Bebible Yogurísimo Frutilla 1L', 2200, 0, 'Lácteos', '7791070000740');

-- LIMPIEZA E HIGIENE
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('LIMP-001', 'Detergente Magistral Limón 750ml', 2800, 0, 'Productos de Limpieza e Higiene', '7793100111569'),
('LIMP-004', 'Lavandina Ayudín Clásica 1L', 1400, 0, 'Productos de Limpieza e Higiene', '7791293034225'),
('LIMP-005', 'Papel Higiénico Higienol 4 rollos 30m', 2500, 0, 'Productos de Limpieza e Higiene', '7790250054597');

-- ================================================================
-- PRODUCTOS GENÉRICOS / PESABLES (CÓDIGOS INTERNOS "20...")
-- Se asignan códigos fijos que empiezan con 20 para que los puedas
-- imprimir en etiquetas o tener en una lista rápida en caja.
-- ===============================================================

-- CARNICERÍA
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('CARN-001', 'Carne Picada Especial x kg', 6500, 0, 'Carnes y Embutidos', '2000010000010'),
('CARN-002', 'Asado de Tira x kg', 8500, 0, 'Carnes y Embutidos', '2000010000020'),
('CARN-005', 'Pollo Entero Fresco x kg', 2800, 0, 'Carnes y Embutidos', '2000010000030'),
('CARN-006', 'Pechuga de Pollo x kg', 5500, 0, 'Carnes y Embutidos', '2000010000040'),
('CARN-009', 'Jamón Cocido Feteado x 100g', 1500, 0, 'Carnes y Embutidos', '2000010000050'),
('LACT-010', 'Queso Tybo Feteado x 100g', 1800, 0, 'Lácteos', '2000010000060');

-- VERDULERÍA
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('VERD-001', 'Papa Negra x kg', 1200, 0, 'Verduras y Frutas', '2000020000010'),
('VERD-002', 'Cebolla x kg', 1000, 0, 'Verduras y Frutas', '2000020000020'),
('VERD-003', 'Tomate Redondo x kg', 2500, 0, 'Verduras y Frutas', '2000020000030'),
('VERD-004', 'Lechuga Criolla x kg', 1800, 0, 'Verduras y Frutas', '2000020000040'),
('FRUT-001', 'Banana Ecuador x kg', 1900, 0, 'Verduras y Frutas', '2000020000050'),
('FRUT-002', 'Manzana Roja x kg', 2200, 0, 'Verduras y Frutas', '2000020000060');

-- PANADERÍA
INSERT INTO productos (codigo, nombre, precio, stock, categoria, codigo_barras) VALUES 
('CER-000', 'Pan Francés x kg', 2200, 0, 'Cereales y Derivados', '2000030000010'),
('OTRO-007', 'Facturas Surtidas (docena)', 4800, 0, 'Otros', '2000030000020');