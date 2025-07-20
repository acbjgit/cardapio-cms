// test-db.js
const db = require('./db');

async function testarConexao() {
    console.log('Iniciando teste de conexão com o banco de dados...');
    try {
        // Tenta pegar uma conexão do pool
        const connection = await db.getConnection();
        console.log('✅ Conexão com o pool obtida com sucesso!');
        
        // Tenta executar uma query simples
        const [rows] = await connection.query('SELECT 1 + 1 AS resultado');
        console.log('✅ Query executada com sucesso!');
        console.log('Resultado do banco:', rows[0].resultado); // Deve mostrar 2
        
        // Libera a conexão de volta para o pool
        connection.release();
        console.log('Conexão liberada.');

    } catch (error) {
        // Se qualquer passo falhar, mostra o erro
        console.error('❌ ERRO no teste de conexão:', error);
    } finally {
        // Fecha o pool de conexões para o script terminar
        console.log('Finalizando o teste.');
        db.end();
    }
}

testarConexao();