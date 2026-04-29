const db = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    console.log('Starting Seeder...');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        {
            id: uuidv4(),
            username: 'Admin AutoPart',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: 'admin',
            whatsapp: '08123456789',
            alamat_lengkap: 'Jakarta, Indonesia'
        },
        {
            id: uuidv4(),
            username: 'Customer Sparepart',
            email: 'customer@gmail.com',
            password: hashedPassword,
            role: 'customer',
            whatsapp: '08987654321',
            alamat_lengkap: 'Bandung, Indonesia'
        }
    ];

    // Clear existing users first (optional, but good for clean seed)
    db.query('DELETE FROM users', (err) => {
        if (err) {
            console.error('Error clearing users:', err.message);
            process.exit(1);
        }

        let completed = 0;
        users.forEach(user => {
            db.query('INSERT INTO users SET ?', user, (err) => {
                if (err) {
                    console.error(`Error seeding user ${user.email}:`, err.message);
                } else {
                    console.log(`User seeded: ${user.email} (${user.role})`);
                }
                
                completed++;
                if (completed === users.length) {
                    console.log('Seeding completed successfully.');
                    process.exit(0);
                }
            });
        });
    });
}

seed();
