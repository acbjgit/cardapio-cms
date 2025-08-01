// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    // ✨ CORREÇÃO AQUI: Aponta para o novo banco de dados SaaS ✨
    database: process.env.DB_NAME || 'cardapio_saas_db', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;