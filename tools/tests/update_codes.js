const db = require('./database-sqlite.js').getDB();

db.serialize(() => {
    // Get all products ordered by current id
    db.all("SELECT id FROM productos ORDER BY id", (err, rows) => {
        if (err) {
            console.error('Error getting products:', err);
            return;
        }

        // Update each product's codigo to its id as string
        let completed = 0;
        rows.forEach((row, index) => {
            const newCode = (index + 1).toString();
            db.run("UPDATE productos SET codigo = ? WHERE id = ?", [newCode, row.id], (err) => {
                if (err) {
                    console.error('Error updating product:', err);
                } else {
                    completed++;
                    if (completed === rows.length) {
                        console.log('✅ Códigos actualizados a números incrementales');
                        db.close();
                    }
                }
            });
        });
    });
});