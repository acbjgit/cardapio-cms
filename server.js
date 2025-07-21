// =================================================================
//                      IMPORTS E CONFIGURAÇÕES INICIAIS
// =================================================================
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// =================================================================
//                      CONFIGURAÇÃO DE SERVIÇOS EXTERNOS
// =================================================================

// Configuração do Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// =================================================================
//                      MIDDLEWARES GLOBAIS
// =================================================================

app.use(cors());
app.use(express.json());

app.use(express.static('public'));
app.use('/admin', express.static('admin'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Em produção (com HTTPS), mude para true
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// =================================================================
//                      MIDDLEWARE DE AUTENTICAÇÃO
// =================================================================
const verificarAutenticacao = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.status(401).json({ message: 'Acesso não autorizado. Por favor, faça login.' });
    }
};

// =================================================================
//                      API DE AUTENTICAÇÃO
// =================================================================

// ✨ ROTA DE LOGIN ATUALIZADA COM DEPURADORES ✨
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log(`[DEBUG] Tentativa de login para o utilizador: ${username}`);

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
        }
        
        const [rows] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);
        const user = rows[0];

        if (user) {
            console.log(`[DEBUG] Utilizador '${username}' encontrado no banco de dados. ID: ${user.id}`);
            console.log(`[DEBUG] Hash guardado no banco: ${user.password_hash}`);
        } else {
            console.log(`[DEBUG] Utilizador '${username}' NÃO foi encontrado no banco de dados.`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const senhaCorreta = await bcrypt.compare(password, user.password_hash);
        
        console.log(`[DEBUG] A comparação da senha para '${username}' retornou: ${senhaCorreta}`);

        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        res.status(200).json({ message: 'Login bem-sucedido!' });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Não foi possível fazer logout.' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout bem-sucedido.' });
    });
});

app.get('/api/check-auth', verificarAutenticacao, (req, res) => {
    res.status(200).json({ message: 'Autenticado' });
});


// =================================================================
//                      APIs DO CRUD
// =================================================================

// --- API DE CATEGORIAS ---
app.get('/api/categorias', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categorias ORDER BY nome ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar categorias.' });
    }
});

// ... (Resto do seu código de APIs sem alterações) ...
app.post('/api/categorias', verificarAutenticacao, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ message: 'O nome da categoria é obrigatório.' });
        }
        const [result] = await db.query('INSERT INTO categorias (nome) VALUES (?)', [nome]);
        res.status(201).json({ id: result.insertId, nome });
    } catch (error) {
        console.error("Erro ao criar categoria:", error);
        res.status(500).json({ message: 'Erro no servidor ao criar categoria.' });
    }
});

app.put('/api/categorias/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ message: 'O nome da categoria é obrigatório.' });
        }
        await db.query('UPDATE categorias SET nome = ? WHERE id = ?', [nome, id]);
        res.status(200).json({ message: 'Categoria atualizada com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar categoria:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar categoria.' });
    }
});

app.delete('/api/categorias/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM categorias WHERE id = ?', [id]);
        res.status(200).json({ message: 'Categoria deletada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Não é possível deletar esta categoria, pois existem produtos associados a ela.' });
        }
        console.error("Erro ao deletar categoria:", error);
        res.status(500).json({ message: 'Erro no servidor ao deletar categoria.' });
    }
});

// --- API DE ADICIONAIS ---
app.get('/api/adicionais', verificarAutenticacao, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM adicionais ORDER BY nome ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar adicionais:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar adicionais.' });
    }
});

app.post('/api/adicionais', verificarAutenticacao, async (req, res) => {
    try {
        const { nome, preco } = req.body;
        if (!nome || !preco) {
            return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
        }
        const [result] = await db.query('INSERT INTO adicionais (nome, preco) VALUES (?, ?)', [nome, preco]);
        res.status(201).json({ id: result.insertId, nome, preco });
    } catch (error) {
        console.error("Erro ao criar adicional:", error);
        res.status(500).json({ message: 'Erro no servidor ao criar adicional.' });
    }
});

app.put('/api/adicionais/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, preco } = req.body;
        if (!nome || !preco) {
            return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
        }
        await db.query('UPDATE adicionais SET nome = ?, preco = ? WHERE id = ?', [nome, preco, id]);
        res.status(200).json({ message: 'Adicional atualizado com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar adicional:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar adicional.' });
    }
});

app.delete('/api/adicionais/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM adicionais WHERE id = ?', [id]);
        res.status(200).json({ message: 'Adicional deletado com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar adicional:", error);
        res.status(500).json({ message: 'Erro no servidor ao deletar adicional.' });
    }
});


// --- API DE PRODUTOS ---
app.get('/api/produtos', async (req, res) => {
    try {
        const [produtos] = await db.query(`
            SELECT p.*, c.nome AS nome_categoria
            FROM produtos AS p
            JOIN categorias AS c ON p.id_categoria = c.id
        `);
        const produtosComAdicionais = await Promise.all(
            produtos.map(async (produto) => {
                const [adicionais] = await db.query(`
                    SELECT a.id, a.nome, a.preco
                    FROM produto_adicionais pa
                    JOIN adicionais a ON pa.id_adicional = a.id
                    WHERE pa.id_produto = ?
                `, [produto.id]);
                return { ...produto, adicionais: adicionais };
            })
        );
        res.status(200).json(produtosComAdicionais);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ message: 'Erro no servidor ao buscar produtos.' });
    }
});

app.post('/api/produtos', verificarAutenticacao, upload.single('imagem'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { nome, descricao, preco, id_categoria, adicionais } = req.body;
        const imagem = req.file;
        if (!nome || !preco || !id_categoria || !imagem) {
            return res.status(400).json({ message: 'Campos nome, preço, categoria e imagem são obrigatórios.' });
        }
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: "cardapio_online" }, (error, result) => {
                if (error) reject(error); else resolve(result);
            }).end(imagem.buffer);
        });
        const imagem_url = result.secure_url;
        const queryProduto = 'INSERT INTO produtos (nome, descricao, preco, id_categoria, imagem_url) VALUES (?, ?, ?, ?, ?)';
        const [dbResult] = await connection.query(queryProduto, [nome, descricao, preco, id_categoria, imagem_url]);
        const produtoId = dbResult.insertId;
        if (adicionais && adicionais.length > 0) {
            const adicionaisIds = JSON.parse(adicionais);
            if (adicionaisIds.length > 0) {
                const queryAdicionais = 'INSERT INTO produto_adicionais (id_produto, id_adicional) VALUES ?';
                const values = adicionaisIds.map(id_adicional => [produtoId, id_adicional]);
                await connection.query(queryAdicionais, [values]);
            }
        }
        await connection.commit();
        res.status(201).json({ id: produtoId, nome, descricao, preco, id_categoria, imagem_url });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ message: 'Erro no servidor ao criar produto.' });
    } finally {
        connection.release();
    }
});

app.put('/api/produtos/:id', verificarAutenticacao, upload.single('imagem'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { nome, descricao, preco, id_categoria, adicionais } = req.body;
        const imagem = req.file;
        let imagem_url;
        if (imagem) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: "cardapio_online" }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                }).end(imagem.buffer);
            });
            imagem_url = result.secure_url;
        }
        let queryProduto = 'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, id_categoria = ?';
        const params = [nome, descricao, preco, id_categoria];
        if (imagem_url) {
            queryProduto += ', imagem_url = ?';
            params.push(imagem_url);
        }
        queryProduto += ' WHERE id = ?';
        params.push(id);
        await connection.query(queryProduto, params);
        await connection.query('DELETE FROM produto_adicionais WHERE id_produto = ?', [id]);
        if (adicionais && adicionais.length > 0) {
            const adicionaisIds = JSON.parse(adicionais);
            if (adicionaisIds.length > 0) {
                const queryAdicionais = 'INSERT INTO produto_adicionais (id_produto, id_adicional) VALUES ?';
                const values = adicionaisIds.map(id_adicional => [id, id_adicional]);
                await connection.query(queryAdicionais, [values]);
            }
        }
        await connection.commit();
        res.status(200).json({ message: 'Produto atualizado com sucesso.' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar produto.' });
    } finally {
        connection.release();
    }
});

app.delete('/api/produtos/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM produtos WHERE id = ?', [id]);
        res.status(200).json({ message: 'Produto deletado com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        res.status(500).json({ message: 'Erro no servidor ao deletar produto.' });
    }
});

// --- API DE TAXAS DE ENTREGA ---
app.get('/api/taxas-entrega', verificarAutenticacao, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM taxas_entrega ORDER BY bairro ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar taxas de entrega:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar taxas.' });
    }
});

app.get('/api/taxa-por-bairro', async (req, res) => {
    try {
        const { bairro } = req.query;
        if (!bairro) {
            return res.status(400).json({ message: 'O nome do bairro é obrigatório.' });
        }
        const [rows] = await db.query('SELECT taxa FROM taxas_entrega WHERE bairro = ?', [bairro]);
        if (rows.length > 0) {
            res.status(200).json({ taxa: rows[0].taxa });
        } else {
            res.status(404).json({ message: 'Taxa de entrega não encontrada para este bairro.' });
        }
    } catch (error) {
        console.error("Erro ao consultar taxa por bairro:", error);
        res.status(500).json({ message: 'Erro no servidor ao consultar taxa.' });
    }
});

app.post('/api/taxas-entrega', verificarAutenticacao, async (req, res) => {
    try {
        const { bairro, taxa } = req.body;
        if (!bairro || taxa === undefined) {
            return res.status(400).json({ message: 'Bairro e taxa são obrigatórios.' });
        }
        const [result] = await db.query('INSERT INTO taxas_entrega (bairro, taxa) VALUES (?, ?)', [bairro, taxa]);
        res.status(201).json({ id: result.insertId, bairro, taxa });
    } catch (error) {
        console.error("Erro ao criar taxa:", error);
        res.status(500).json({ message: 'Erro no servidor ao criar taxa.' });
    }
});

app.put('/api/taxas-entrega/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        const { bairro, taxa } = req.body;
        if (!bairro || taxa === undefined) {
            return res.status(400).json({ message: 'Bairro e taxa são obrigatórios.' });
        }
        await db.query('UPDATE taxas_entrega SET bairro = ?, taxa = ? WHERE id = ?', [bairro, taxa, id]);
        res.status(200).json({ message: 'Taxa atualizada com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar taxa:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar taxa.' });
    }
});

app.delete('/api/taxas-entrega/:id', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM taxas_entrega WHERE id = ?', [id]);
        res.status(200).json({ message: 'Taxa deletada com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar taxa:", error);
        res.status(500).json({ message: 'Erro no servidor ao deletar taxa.' });
    }
});


// --- API DE CONFIGURAÇÕES ---
app.get('/api/configuracoes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM configuracoes');
        const configs = rows.reduce((acc, row) => {
            acc[row.chave] = row.valor;
            return acc;
        }, {});
        res.status(200).json(configs);
    } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar configurações.' });
    }
});

const uploadConfig = upload.fields([
    { name: 'imagem_fundo', maxCount: 1 },
    { name: 'logo_loja', maxCount: 1 }
]);
app.put('/api/configuracoes', verificarAutenticacao, uploadConfig, async (req, res) => {
    try {
        const configuracoes = req.body;
        const files = req.files;
        if (files && files.imagem_fundo) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: "cardapio_online/config" }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                }).end(files.imagem_fundo[0].buffer);
            });
            configuracoes.imagem_fundo_url = result.secure_url;
        }
        if (files && files.logo_loja) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: "cardapio_online/config" }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                }).end(files.logo_loja[0].buffer);
            });
            configuracoes.logo_url = result.secure_url;
        }
        const promises = Object.entries(configuracoes).map(([chave, valor]) => {
            const sql = 'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?';
            return db.query(sql, [chave, valor, valor]);
        });
        await Promise.all(promises);
        res.status(200).json({ message: 'Configurações atualizadas com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar configurações:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar configurações.' });
    }
});


// --- API DE PEDIDOS ---
app.get('/api/pedidos', verificarAutenticacao, async (req, res) => {
    try {
        const [pedidos] = await db.query('SELECT * FROM pedidos ORDER BY data_pedido DESC');
        res.status(200).json(pedidos);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar pedidos.' });
    }
});

app.post('/api/pedidos', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { carrinho, totais, entrega, pagamento } = req.body;
        const numeroPedido = `PEDIDO-${Date.now()}`;
        const queryPedido = `
            INSERT INTO pedidos (numero_pedido, subtotal, taxa_entrega, total, metodo_entrega, forma_pagamento, troco_para, endereco_cep, endereco_rua, endereco_bairro, endereco_numero, endereco_complemento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [pedidoResult] = await connection.query(queryPedido, [
            numeroPedido,
            totais.subTotal,
            totais.taxaEntrega,
            totais.totalGeral,
            entrega.metodo,
            pagamento.forma,
            pagamento.troco,
            entrega.cep,
            entrega.rua,
            entrega.bairro,
            entrega.numero,
            entrega.complemento
        ]);
        const pedidoId = pedidoResult.insertId;
        for (const item of carrinho) {
            const queryItem = `
                INSERT INTO pedido_itens (id_pedido, id_produto, nome_produto, quantidade, preco_unitario, observacoes)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [itemResult] = await connection.query(queryItem, [
                pedidoId,
                item.id,
                item.name,
                item.quantity,
                item.price,
                item.observacoes
            ]);
            const pedidoItemId = itemResult.insertId;
            if (item.adicionais && item.adicionais.length > 0) {
                const queryAdicionais = `
                    INSERT INTO pedido_item_adicionais (id_pedido_item, nome_adicional, preco_adicional) VALUES ?
                `;
                const valuesAdicionais = item.adicionais.map(ad => [pedidoItemId, ad.nome, ad.preco]);
                await connection.query(queryAdicionais, [valuesAdicionais]);
            }
        }
        await connection.commit();
        res.status(201).json({ message: 'Pedido criado com sucesso!', numeroPedido: numeroPedido });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ message: 'Erro no servidor ao criar pedido.' });
    } finally {
        connection.release();
    }
});

app.put('/api/pedidos/:id/status', verificarAutenticacao, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'O novo status é obrigatório.' });
        }
        await db.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
        res.status(200).json({ message: 'Status do pedido atualizado com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar status.' });
    }
});


// =================================================================
//                      INICIALIZAÇÃO DO SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
