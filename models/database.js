const dotenv = require("dotenv");
dotenv.config();
const { Client } = require("pg");
let client = "";
if (process.env.NODE_ENV === "production") {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  client = new Client({
    host: "localhost",
    password: "password@2001",
    user: "postgres",
    port: 5432,
    database: "busbooking",
  });
}
const connect = client.connect();
if (connect) {
  console.log("database connected");
}
module.exports.client = client;
