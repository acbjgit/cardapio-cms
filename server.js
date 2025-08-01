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

// Adiciona o suporte para o ficheiro .env em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// IMPORTA E CONFIGURA A STRIPE
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

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

// ROTA DE WEBHOOK PRECISA DO CORPO "RAW" DO PEDIDO
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const id_loja = session.client_reference_id;

        console.log(`[Webhook] Pagamento bem-sucedido para a loja ID: ${id_loja}`);

        try {
            await db.query(
                "UPDATE lojas SET status_assinatura = 'ativo' WHERE id = ?",
                [id_loja]
            );
            console.log(`[Webhook] Assinatura da loja ID: ${id_loja} foi ativada.`);
        } catch (dbError) {
            console.error(`[Webhook] Erro ao atualizar o banco de dados para a loja ID: ${id_loja}`, dbError);
        }
    }

    res.json({received: true});
});

app.use(express.json());

app.use(express.static('public'));
app.use('/admin', express.static('admin'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'segredo-de-desenvolvimento-muito-longo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// =================================================================
//                      MIDDLEWARE DE AUTENTICAÇÃO E ASSINATURA
// =================================================================
const verificarAutenticacao = (req, res, next) => {
    if (req.session && req.session.userId && req.session.id_loja) {
        return next();
    } else {
        return res.status(401).json({ message: 'Acesso não autorizado. Por favor, faça login.' });
    }
};

const verificarAssinatura = async (req, res, next) => {
    try {
        const { id_loja } = req.session;
        const [rows] = await db.query('SELECT status_assinatura, data_fim_trial FROM lojas WHERE id = ?', [id_loja]);
        
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Loja não encontrada.' });
        }

        const loja = rows[0];
        const hoje = new Date();
        const dataFimTrial = new Date(loja.data_fim_trial);

        if (loja.status_assinatura === 'ativo') {
            return next();
        }

        if (loja.status_assinatura === 'trial' && hoje <= dataFimTrial) {
            return next();
        }

        return res.status(403).json({ 
            message: 'O seu período de teste acabou ou a sua assinatura está inativa. Por favor, renove para continuar a usar o sistema.',
            assinaturaInvalida: true 
        });

    } catch (error) {
        console.error("Erro ao verificar assinatura:", error);
        return res.status(500).json({ message: 'Erro interno ao verificar a sua assinatura.' });
    }
};


// =================================================================
//                      API DE AUTENTICAÇÃO E INSCRIÇÃO
// =================================================================

app.post('/api/register', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { nome_loja, username, password } = req.body;
        if (!nome_loja || !username || !password) {
            return res.status(400).json({ message: 'Nome da loja, utilizador e senha são obrigatórios.' });
        }
        await connection.beginTransaction();

        const dataFimTrial = new Date();
        dataFimTrial.setDate(dataFimTrial.getDate() + 7);

        const [lojaResult] = await connection.query(
            'INSERT INTO lojas (nome_loja, data_fim_trial) VALUES (?, ?)', 
            [nome_loja, dataFimTrial]
        );
        const id_loja = lojaResult.insertId;

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await connection.query('INSERT INTO usuarios (id_loja, username, password_hash) VALUES (?, ?, ?)', [id_loja, username, passwordHash]);
        
        await connection.commit();
        res.status(201).json({ message: 'Loja e utilizador criados com sucesso!' });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Este nome de utilizador já existe.' });
        }
        console.error("Erro no registo:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    } finally {
        connection.release();
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Utilizador e senha são obrigatórios.' });
        }
        const [rows] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        const senhaCorreta = await bcrypt.compare(password, user.password_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        req.session.userId = user.id;
        req.session.id_loja = user.id_loja; 
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

app.get('/api/check-auth', verificarAutenticacao, async (req, res) => {
    const { id_loja } = req.session;
    const [rows] = await db.query('SELECT status_assinatura, data_fim_trial FROM lojas WHERE id = ?', [id_loja]);
    res.status(200).json({ 
        message: 'Autenticado',
        assinatura: rows[0] 
    });
});

// =================================================================
//                      API DE ASSINATURAS (STRIPE)
// =================================================================

app.post('/api/criar-sessao-checkout', verificarAutenticacao, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { plano } = req.body;

        const YOUR_DOMAIN = process.env.YOUR_DOMAIN || `http://localhost:${PORT}`;

        let priceId;
        if (plano === 'anual') {
            priceId = process.env.STRIPE_PRICE_ID_ANUAL;
        } else {
            priceId = process.env.STRIPE_PRICE_ID;
        }

        if (!priceId) {
            return res.status(400).json({ message: 'Plano de assinatura não configurado.' });
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${YOUR_DOMAIN}/admin/sucesso.html`,
            cancel_url: `${YOUR_DOMAIN}/admin/index.html`,
            client_reference_id: id_loja 
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Erro ao criar sessão de checkout:", error);
        res.status(500).json({ message: 'Erro ao iniciar o processo de pagamento.' });
    }
});


// =================================================================
//                      APIs DO CRUD (MULTI-TENANT E PROTEGIDAS)
// =================================================================

// --- API DE CATEGORIAS ---
app.get('/api/categorias', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [rows] = await db.query('SELECT * FROM categorias WHERE id_loja = ? ORDER BY nome ASC', [id_loja]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/categorias', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { nome } = req.body;
        const [result] = await db.query('INSERT INTO categorias (id_loja, nome) VALUES (?, ?)', [id_loja, nome]);
        res.status(201).json({ id: result.insertId, nome });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.put('/api/categorias/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        const { nome } = req.body;
        await db.query('UPDATE categorias SET nome = ? WHERE id = ? AND id_loja = ?', [nome, id, id_loja]);
        res.status(200).json({ message: 'Categoria atualizada.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.delete('/api/categorias/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        await db.query('DELETE FROM categorias WHERE id = ? AND id_loja = ?', [id, id_loja]);
        res.status(200).json({ message: 'Categoria apagada.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// --- API DE ADICIONAIS ---
app.get('/api/adicionais', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [rows] = await db.query('SELECT * FROM adicionais WHERE id_loja = ? ORDER BY nome ASC', [id_loja]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/adicionais', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { nome, preco } = req.body;
        const [result] = await db.query('INSERT INTO adicionais (id_loja, nome, preco) VALUES (?, ?, ?)', [id_loja, nome, preco]);
        res.status(201).json({ id: result.insertId, nome, preco });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.put('/api/adicionais/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        const { nome, preco } = req.body;
        await db.query('UPDATE adicionais SET nome = ?, preco = ? WHERE id = ? AND id_loja = ?', [nome, preco, id, id_loja]);
        res.status(200).json({ message: 'Adicional atualizado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.delete('/api/adicionais/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        await db.query('DELETE FROM adicionais WHERE id = ? AND id_loja = ?', [id, id_loja]);
        res.status(200).json({ message: 'Adicional apagado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// --- API DE TAXAS DE ENTREGA ---
app.get('/api/taxas-entrega', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [rows] = await db.query('SELECT * FROM taxas_entrega WHERE id_loja = ? ORDER BY bairro ASC', [id_loja]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/taxas-entrega', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { bairro, taxa } = req.body;
        const [result] = await db.query('INSERT INTO taxas_entrega (id_loja, bairro, taxa) VALUES (?, ?, ?)', [id_loja, bairro, taxa]);
        res.status(201).json({ id: result.insertId, bairro, taxa });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.put('/api/taxas-entrega/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        const { bairro, taxa } = req.body;
        await db.query('UPDATE taxas_entrega SET bairro = ?, taxa = ? WHERE id = ? AND id_loja = ?', [bairro, taxa, id, id_loja]);
        res.status(200).json({ message: 'Taxa atualizada.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.delete('/api/taxas-entrega/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        await db.query('DELETE FROM taxas_entrega WHERE id = ? AND id_loja = ?', [id, id_loja]);
        res.status(200).json({ message: 'Taxa apagada.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// --- API DE PRODUTOS ---
app.get('/api/produtos', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [produtos] = await db.query(`
            SELECT p.*, c.nome AS nome_categoria
            FROM produtos AS p
            JOIN categorias AS c ON p.id_categoria = c.id
            WHERE p.id_loja = ?
        `, [id_loja]);
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
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/produtos', verificarAutenticacao, verificarAssinatura, upload.single('imagem'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id_loja } = req.session;
        await connection.beginTransaction();
        const { nome, descricao, preco, id_categoria, adicionais } = req.body;
        const imagem = req.file;
        if (!nome || !preco || !id_categoria || !imagem) {
            return res.status(400).json({ message: 'Campos obrigatórios em falta.' });
        }
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: `loja_${id_loja}` }, (error, result) => {
                if (error) reject(error); else resolve(result);
            }).end(imagem.buffer);
        });
        const imagem_url = result.secure_url;
        const queryProduto = 'INSERT INTO produtos (id_loja, nome, descricao, preco, id_categoria, imagem_url) VALUES (?, ?, ?, ?, ?, ?)';
        const [dbResult] = await connection.query(queryProduto, [id_loja, nome, descricao, preco, id_categoria, imagem_url]);
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
        res.status(201).json({ message: 'Produto criado.' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ message: 'Erro no servidor ao criar o produto.' });
    } finally {
        connection.release();
    }
});

app.put('/api/produtos/:id', verificarAutenticacao, verificarAssinatura, upload.single('imagem'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        await connection.beginTransaction();
        const { nome, descricao, preco, id_categoria, adicionais } = req.body;
        const imagem = req.file;
        let imagem_url;
        if (imagem) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: `loja_${id_loja}` }, (error, result) => {
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
        queryProduto += ' WHERE id = ? AND id_loja = ?';
        params.push(id, id_loja);
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
        res.status(200).json({ message: 'Produto atualizado.' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar o produto.' });
    } finally {
        connection.release();
    }
});

app.delete('/api/produtos/:id', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        await db.query('DELETE FROM produtos WHERE id = ? AND id_loja = ?', [id, id_loja]);
        res.status(200).json({ message: 'Produto apagado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});


// --- API DE CONFIGURAÇÕES (LOJA) ---
app.get('/api/configuracoes', verificarAutenticacao, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [rows] = await db.query('SELECT * FROM lojas WHERE id = ?', [id_loja]);
        res.status(200).json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

const uploadConfig = upload.fields([
    { name: 'imagem_fundo', maxCount: 1 },
    { name: 'logo_loja', maxCount: 1 }
]);
app.put('/api/configuracoes', verificarAutenticacao, verificarAssinatura, uploadConfig, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const campos = req.body;
        const files = req.files;

        if (files && files.imagem_fundo) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: `loja_${id_loja}` }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                }).end(files.imagem_fundo[0].buffer);
            });
            campos.imagem_fundo_url = result.secure_url;
        }

        if (files && files.logo_loja) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: `loja_${id_loja}` }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                }).end(files.logo_loja[0].buffer);
            });
            campos.logo_url = result.secure_url;
        }
        
        if (campos.mostrar_endereco) {
            campos.mostrar_endereco = campos.mostrar_endereco === 'true';
        }

        await db.query('UPDATE lojas SET ? WHERE id = ?', [campos, id_loja]);
        res.status(200).json({ message: 'Configurações atualizadas com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar configurações:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar as configurações.' });
    }
});

// --- API DE PEDIDOS ---
app.get('/api/pedidos', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const [pedidos] = await db.query('SELECT * FROM pedidos WHERE id_loja = ? ORDER BY data_pedido DESC', [id_loja]);
        res.status(200).json(pedidos);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar pedidos.' });
    }
});

app.get('/api/pedidos/:id/detalhes', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        const [pedidoRows] = await db.query('SELECT * FROM pedidos WHERE id = ? AND id_loja = ?', [id, id_loja]);
        if (pedidoRows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        const pedido = pedidoRows[0];
        const [itensRows] = await db.query('SELECT * FROM pedido_itens WHERE id_pedido = ?', [id]);
        const itensComAdicionais = await Promise.all(
            itensRows.map(async (item) => {
                const [adicionaisRows] = await db.query('SELECT * FROM pedido_item_adicionais WHERE id_pedido_item = ?', [item.id]);
                return { ...item, adicionais: adicionaisRows };
            })
        );
        const detalhesCompletos = { ...pedido, itens: itensComAdicionais };
        res.status(200).json(detalhesCompletos);
    } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar detalhes do pedido.' });
    }
});

app.put('/api/pedidos/:id/status', verificarAutenticacao, verificarAssinatura, async (req, res) => {
    try {
        const { id_loja } = req.session;
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'O novo status é obrigatório.' });
        }
        await db.query('UPDATE pedidos SET status = ? WHERE id = ? AND id_loja = ?', [status, id, id_loja]);
        res.status(200).json({ message: 'Status do pedido atualizado com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar status.' });
    }
});


// =================================================================
//                      ROTAS PÚBLICAS
// =================================================================
app.get('/api/public/loja/:id_loja', async (req, res) => {
    try {
        const { id_loja } = req.params;
        const [rows] = await db.query('SELECT nome_loja, logo_url, endereco_loja, mostrar_endereco, horario_funcionamento, status_loja, cor_tema, imagem_fundo_url, whatsapp_loja FROM lojas WHERE id = ?', [id_loja]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Loja não encontrada.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/public/categorias/:id_loja', async (req, res) => {
    try {
        const { id_loja } = req.params;
        const [rows] = await db.query('SELECT * FROM categorias WHERE id_loja = ? ORDER BY nome ASC', [id_loja]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/public/produtos/:id_loja', async (req, res) => {
    try {
        const { id_loja } = req.params;
        const [produtos] = await db.query(`
            SELECT p.*, c.nome AS nome_categoria
            FROM produtos AS p
            JOIN categorias AS c ON p.id_categoria = c.id
            WHERE p.id_loja = ?
        `, [id_loja]);

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
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/public/taxa-por-bairro', async (req, res) => {
    try {
        const { id_loja, bairro } = req.query;
        if (!id_loja || !bairro) {
            return res.status(400).json({ message: 'ID da loja e nome do bairro são obrigatórios.' });
        }
        const [rows] = await db.query('SELECT taxa FROM taxas_entrega WHERE id_loja = ? AND bairro = ?', [id_loja, bairro]);
        if (rows.length > 0) {
            res.status(200).json({ taxa: rows[0].taxa });
        } else {
            res.status(404).json({ message: 'Taxa de entrega não encontrada para este bairro.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/public/pedidos', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id_loja, carrinho, totais, entrega, pagamento } = req.body;
        
        if (!id_loja || !carrinho || !totais || !entrega || !pagamento) {
            return res.status(400).json({ message: 'Dados do pedido incompletos.' });
        }

        await connection.beginTransaction();

        const numeroPedido = `PEDIDO-${Date.now()}`;
        const queryPedido = `
            INSERT INTO pedidos (id_loja, numero_pedido, subtotal, taxa_entrega, total, metodo_entrega, forma_pagamento, troco_para, endereco_cep, endereco_rua, endereco_bairro, endereco_numero, endereco_complemento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [pedidoResult] = await connection.query(queryPedido, [
            id_loja,
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


// =================================================================
//                      INICIALIZAÇÃO DO SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
