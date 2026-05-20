require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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

// 3. CONFIGURAÇÃO DO STORAGE (ARMAZENAMENTO) DO MULTER NO CLOUDINARY
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'produtos_cosmeticos', // Nome da pasta que será criada no seu Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg'], // Formatos de imagem permitidos
    },
});

const upload = multer({ storage: storage });

// 4. MODELO DO MONGOOSE (SCHEMA ATUALIZADO COM IMAGEM)
const CosmeticoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    marca: { type: String, required: true },
    preco: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagemUrl: { type: String } // <-- Campo onde salvaremos o link da foto
});

const Cosmetico = mongoose.model('Cosmetico', CosmeticoSchema);

// ==================== ROTAS DA API ====================

// ROTA DE CADASTRO (MUDOU! Agora aceita o upload de 1 arquivo chamado 'imagem')
app.post('/cadastro', upload.single('imagem'), async (req, res) => {
    try {
        const { nome, marca, preco, categoria } = req.body;
        
        // req.file.path contém a URL gerada pelo Cloudinary após o upload
        const imagemUrl = req.file ? req.file.path : '';

        const novoProduto = new Cosmetico({
            nome,
            marca,
            preco,
            categoria,
            imagemUrl // Salvando o link no banco de dados
        });

        await novoProduto.save();
        res.status(201).json({ mensagem: "Produto cadastrado com sucesso!", produto: novoProduto });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao cadastrar o produto.", detalhes: error.message });
    }
});

// ROTA PARA LISTAR TODOS OS PRODUTOS
app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Cosmetico.find();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os produtos." });
    }
});

// ROTA PARA CONSULTAR APENAS 1 PRODUTO PELO ID
app.get('/produtos/:id', async (req, res) => {
    try {
        const produto = await Cosmetico.findById(req.params.id);
        if (!produto) {
            return res.status(404).json({ erro: "Cosmético não encontrado." });
        }
        res.json(produto);
    } catch (error) {
        res.status(400).json({ erro: "ID inválido ou mal formatado." });
    }
});

// ROTA PARA EDITAR UM PRODUTO (PUT)
app.put('/produtos/:id', async (req, res) => {
    try {
        const produtoAtualizado = await Cosmetico.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!produtoAtualizado) {
            return res.status(404).json({ erro: "Cosmético não encontrado para atualização." });
        }
        res.json({ mensagem: "Produto atualizado com sucesso!", produto: produtoAtualizado });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao atualizar o produto." });
    }
});

// ROTA PARA DELETAR UM PRODUTO (DELETE)
app.delete('/produtos/:id', async (req, res) => {
    try {
        const produtoDeletado = await Cosmetico.findByIdAndDelete(req.params.id);
        if (!produtoDeletado) {
            return res.status(404).json({ erro: "Cosmético não encontrado para exclusão." });
        }
        res.json({ mensagem: `O produto '${produtoDeletado.nome}' foi removido com sucesso!` });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao deletar o produto." });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});