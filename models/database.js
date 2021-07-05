const {Client} = require('pg');
const database='busbooking'
const client = new Client({
    host: 'localhost',
    database: `${database}`,
    password: 'password@2001',
    user: 'postgres',
    port:5432
})
const connection = client.connect();
if (connection) {
    console.log(`connected to database "${database}"`);
}