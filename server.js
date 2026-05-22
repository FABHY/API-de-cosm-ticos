require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const app = express();
app.use(cors());
app.use(express.json());

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

// Modelo de Cosméticos
const CosmeticoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    marca: { type: String, required: true },
    preco: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagemUrl: { type: String } 
});
const Cosmetico = mongoose.model('Cosmetico', CosmeticoSchema);

// Modelo de Usuários do Sistema
const UsuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);


// ==================== MIDDLEWARE DE SEGURANÇA (CORRIGIDO) ====================
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Padrão "Bearer TOKEN"

    // 🛡️ CORREÇÃO: Barra a requisição ANTES de tentar processar se o token não existir
    if (!token) {
        return res.status(401).json({ 
            erro: "Acesso negado. Você precisa fazer login e colar o Token na aba Authorization do Postman." 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, usuarioLogado) => {
        if (err) {
            return res.status(403).json({ 
                erro: "Token inválido ou expirado. Faça login novamente para gerar um novo token." 
            });
        }
        req.usuario = usuarioLogado; 
        next(); // Token correto, pode seguir para a rota!
    });
}


// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Rota para registrar um novo Administrador no sistema
app.post('/auth/register', async (req, res) => {
    try {
        const { email, ...rest } = req.body;
        const senha = req.body.senha;

        if (!email || !senha) {
            return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
        }

        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        const novoUsuario = new Usuario({
            email,
            senha: senhaCriptografada
        });

        await novoUsuario.save();
        res.status(201).json({ mensagem: "Administrador criado com sucesso!" });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao registrar usuário.", detalhes: error.message });
    }
});

// Rota de Login (Gera o Token JWT)
app.post('/auth/login', async (req, res) => {
    try {
        const { email, ...rest } = req.body;
        const senha = req.body.senha;

        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ erro: "E-mail ou senha incorretos." });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(400).json({ erro: "E-mail ou senha incorretos." });
        }

        const token = jwt.sign({ id: usuario._id, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.json({ mensagem: "Login efetuado com sucesso!", token });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao efetuar login." });
    }
});


// ==================== ROTAS DE COSMÉTICOS ====================

// ROTA DE LISTAGEM (Pública)
app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Cosmetico.find();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os produtos." });
    }
});

app.get('/produtos/:id', async (req, res) => {
    try {
        const produto = await Cosmetico.findById(req.params.id);
        if (!produto) return res.status(404).json({ erro: "Cosmético não encontrado." });
        res.json(produto);
    } catch (error) {
        res.status(400).json({ erro: "ID inválido." });
    }
});

// ROTA DE CADASTRO (Protegida)
app.post('/cadastro', autenticarToken, upload.single('imagem'), async (req, res) => {
    try {
        const { nome, marca, preco, categoria } = req.body;
        const imagemUrl = req.file ? req.file.path : '';

        if (!nome || !marca || !preco || !categoria) {
            return res.status(400).json({ erro: "Campos obrigatórios ausentes." });
        }

        const novoProduto = new Cosmetico({
            nome,
            marca,
            preco: Number(preco),
            categoria,
            imagemUrl
        });

        await novoProduto.save();
        res.status(201).json({ mensagem: "Produto cadastrado com sucesso!", produto: novoProduto });
    
    } catch (error) {
        console.error("❌ ERRO NO BACKEND:", error);
        res.status(500).json({ erro: "Erro interno no servidor.", detalhes: error.message });
    }
});

// ROTA DE EDIÇÃO (Protegida)
app.put('/produtos/:id', autenticarToken, async (req, res) => {
    try {
        const produtoAtualizado = await Cosmetico.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!produtoAtualizado) return res.status(404).json({ erro: "Cosmético não encontrado." });
        res.json({ mensagem: "Produto updated com sucesso!", produto: produtoAtualizado });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao atualizar." });
    }
});

// ROTA DE DELEÇÃO (Protegida)
app.delete('/produtos/:id', autenticarToken, async (req, res) => {
    try {
        const produtoDeletado = await Cosmetico.findByIdAndDelete(req.params.id);
        if (!produtoDeletado) return res.status(404).json({ erro: "Cosmético não encontrado." });
        res.json({ mensagem: `O produto '${produtoDeletado.nome}' foi removido com sucesso!` });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao deletar." });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});