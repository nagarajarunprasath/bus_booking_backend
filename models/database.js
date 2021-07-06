const dotenv = require("dotenv");
dotenv.config();
const {
    Client
} = require('pg');
const env = process.env;
const devConfig = `postgresql://${env.PG_USER}:${env.PG_PASSWORD}@${env.PG_HOST}:${env.PG_PORT}/${env.PG_DATABASE}`;
const prodConfig = process.env.DATABASE_URL //coming from heroku addons
const client = new Client({
    connectionString: env.NODE_ENV === 'production' ? prodConfig : devConfig
});
const connection = client.connect(); //connecting
if (connection) {
    console.log(`connected to database`);
}
module.exports.client = client;