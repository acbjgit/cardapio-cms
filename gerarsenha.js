const bcrypt = require('bcryptjs');

async function gerar() {
    // --- DEFINA AQUI O SEU LOGIN E SENHA DE PRODUÇÃO ---
    const username = 'admin';
    const senhaForte = '1407CDio**'; // <-- TROQUE PELA SENHA QUE DESEJA USAR
    // ----------------------------------------------------

    console.log('A gerar hash para a senha...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senhaForte, salt);

    console.log('\n--- SUCESSO! ---');
    console.log('Copie o comando SQL abaixo e execute-o no phpMyAdmin do seu servidor:');
    console.log('\n================================================================');
    console.log(`INSERT INTO usuarios (username, password_hash) VALUES ('${username}', '${passwordHash}');`);
    console.log('================================================================\n');

    process.exit();
}

gerar();
