import { db } from './lib/db';
import { users } from './lib/db/schema';

async function test() {
    try {
        console.log('Inserting test user...');
        await db.insert(users).values({
            name: 'Test User',
            email: `test-${Date.now()}@example.com`,
        });
        console.log('Fetching users...');
        const allUsers = await db.select().from(users);
        console.log('Users in DB:', allUsers);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

test();
