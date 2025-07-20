// db.js
const mysql = require('mysql2/promise');

// Cria um "pool" de conexões. Isso é mais eficiente do que criar
// uma nova conexão para cada consulta ao banco de dados.
const pool = mysql.createPool({
    
    host: process.env.DB_HOST || 'localhost', // O endereço do seu servidor MySQL (geralmente localhost)
    user: process.env.DB_USER || 'root', // O usuário do MySQL (o padrão do XAMPP é 'root')
    password: process.env.DB_PASSWORD || '', // A senha do MySQL (o padrão do XAMPP é em branco)
    database: process.env.DB_NAME || 'cardapio_db', // O nome do banco de dados que criamos
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Pool de conexões com o MySQL criado com sucesso.');

// Exportamos o pool para que outros arquivos possam usá-lo para fazer consultas.
module.exports = pool;