const dotenv = require('dotenv');
dotenv.config();
const {
    Client
} = require('pg');
const database = 'busbooking';
const devConfig =new Client({
    host: 'localhost',
    database: `${database}`,
    password: 'kayitare@123',
    user: 'postgres',
    port: 5432,
   dialectOptions: {
       ssl: {
           require: 'true'
       }
   }
})
const prodConfig = ({connectionString: process.env.DATABASE_URL })//coming from heroku addons
 const client = new Client(
   process.env.NODE_ENV == 'production' ? prodConfig : devConfig
 );
const connection = client.connect(); //connecting
if (connection) {
    console.log(`connected to database`);
}
module.exports.client = client;