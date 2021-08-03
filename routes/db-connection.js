const mysql = require('mysql2');

const dbConnection = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE_DATABASE
});

module.exports = dbConnection.promise();