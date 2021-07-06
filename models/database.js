const {
    Client
} = require('pg');
const database = 'busbooking';
const devConfig = {
    host: 'localhost',
    database: `${database}`,
    password: 'password@2001',
    user: 'postgres',
    port: 5432,
    ssl: true
}
const prodConfig = process.env.DATABASE_URL //coming from heroku addons
const client = new Client({
    connectionString: process.env.NODE_ENV === 'production' ? prodConfig : devConfig
});
const connection = client.connect(); //connecting
if (connection) {
    console.log(`connected to database`);
}
module.exports.client = client;