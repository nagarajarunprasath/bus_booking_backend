const {Client} = require('pg');
const database='busbooking'
const client = new Client({
    host: 'localhost',
    database: `${database}`,
    password: 'kayitare@123',
    user: 'postgres',
    port:5432
})
const connection = client.connect();
if (connection) {
    console.log(`connected to database "${database}"`);
}
module.exports.client = client;