require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

// 📦 IMPORTAR APENAS O UI E O NOSSO ARQUIVO JSON
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
app.use(cors());
app.use(express.json());

// 📖 CARREGAR DOCUMENTAÇÃO DIRETO DO JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 1. CONEXÃO COM O MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// 2. CONFIGURAÇÃO DO CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. CONFIGURAÇÃO DO STORAGE DO MULTER NO CLOUDINARY
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'produtos_cosmeticos',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

// 4. MODELOS DO MONGOOSE (SCHEMAS)
const CosmeticoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    marca: { type: String, required: true },
    preco: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagemUrl: { type: String } 
});
const Cosmetico = mongoose.model('Cosmetico', CosmeticoSchema);

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    role: { type: String, enum: ['cliente', 'admin'], default: 'cliente' }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);


// ==================== MIDDLEWARES DE SEGURANÇA ====================
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: "Acesso negado. Token ausente." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, usuarioLogado) => {
        if (err) {
            return res.status(403).json({ erro: "Token inválido ou expirado." });
        }
        req.usuario = usuarioLogado; 
        next(); 
    });
}

function verificarRole(rolesPermitidos) {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.usuario.role)) {
            return res.status(403).json({ erro: "Acesso proibido. Nível de acesso insuficiente." });
        }
        next();
    };
}


// ==================== ROTAS DE AUTENTICAÇÃO ====================

app.post('/auth/register', async (req, res) => {
    try {
        const { email, senha, role } = req.body;
        if (!email || !senha) return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });

        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) return res.status(400).json({ erro: "Este e-mail já está cadastrado." });

        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        const novoUsuario = new Usuario({ email, senha: senhaCriptografada, role: role || 'cliente' });
        await novoUsuario.save();
        res.status(201).json({ mensagem: `Usuário cadastrado com sucesso como [${novoUsuario.role}]!` });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao registrar usuário." });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) return res.status(400).json({ erro: "E-mail ou senha incorretos." });

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(400).json({ erro: "E-mail ou senha incorretos." });

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email, role: usuario.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' }
        );
        res.json({ mensagem: "Login efetuado com sucesso!", role: usuario.role, token });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao efetuar login." });
    }
});


// ==================== ROTAS DE COSMÉTICOS ====================

app.get('/produtos', async (req, res) => {
    try {
        const { busca, categoria, marca, page = 1, limit = 10 } = req.query;
        let filtro = {};

        if (busca) filtro.nome = { $regex: busca, $options: 'i' }; 
        if (categoria) filtro.categoria = { $regex: categoria, $options: 'i' };
        if (marca) filtro.marca = { $regex: marca, $options: 'i' };

        const numeroPagina = parseInt(page);
        const limiteProdutos = parseInt(limit);
        const pular = (numeroPagina - 1) * limiteProdutos;

        const produtos = await Cosmetico.find(filtro).skip(pular).limit(limiteProdutos);
        const totalProdutos = await Cosmetico.countDocuments(filtro);
        const totalPaginas = Math.ceil(totalProdutos / limiteProdutos);

        res.json({
            meta: { totalProdutos, totalPaginas, paginaAtual: numeroPagina, produtosPorPagina: limiteProdutos },
            produtos
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os produtos." });
    }
});

app.post('/cadastro', autenticarToken, verificarRole(['admin']), upload.single('imagem'), async (req, res) => {
    try {
        const { nome, marca, preco, categoria } = req.body;
        const imagemUrl = req.file ? req.file.path : '';

        if (!nome || !marca || !preco || !categoria) {
            return res.status(400).json({ erro: "Campos obrigatórios ausentes." });
        }

        const novoProduto = new Cosmetico({ nome, marca, preco: Number(preco), categoria, imagemUrl });
        await novoProduto.save();
        res.status(201).json({ mensagem: "Produto cadastrado com sucesso!", produto: novoProduto });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📖 Documentação Swagger disponível em: http://localhost:${PORT}/api-docs`);
});