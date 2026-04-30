let mysql = require('mysql');

let connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'db_sparepart'
});

connection.connect(function (error) {
    if (!!error) {
        console.log(error);
    } else {
        console.log('Connected to MySQL database!');
        const ensureColumn = (table, column, definition, next) => {
            connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column], (showErr, rows) => {
                if (showErr) {
                    console.error(`Schema check failed for ${table}.${column}:`, showErr.message);
                    if (next) next();
                    return;
                }

                if (rows && rows.length > 0) {
                    if (next) next();
                    return;
                }

                connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Schema bootstrap failed for ${table}.${column}:`, alterErr.message);
                    }
                    if (next) next();
                });
            });
        };

        ensureColumn('users', 'avatar', 'VARCHAR(255) NULL AFTER whatsapp', () => {
            ensureColumn('pembelian', 'metode_pembayaran', "VARCHAR(20) DEFAULT 'bca' AFTER bukti_transfer", () => {
                ensureColumn('pembelian', 'resi', 'VARCHAR(100) NULL AFTER metode_pembayaran', () => {
                    ensureColumn('pembelian', 'alasan_penolakan', 'TEXT NULL AFTER resi');
                });
            });
        });
    }
});

module.exports = connection;
