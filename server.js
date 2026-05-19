require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- CONFIGURAÇÃO ESSENCIAL (O CORRETOR DO ERRO) ---
// Esta linha deve vir ANTES de qualquer definição de rota
app.use(express.json()); 
app.use(cors());

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB!"))
  .catch(err => console.error("❌ Erro de conexão:", err));

// Definição do Modelo
const CosmeticoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    marca: { type: String, required: true },
    preco: Number,
    categoria: String,
});

const Cosmetico = mongoose.model('Cosmetico', CosmeticoSchema);
 

// Rota de Cadastro (Corrigida)
app.post('/cadastro', async (req, res) => {
    try {
        // Verificação de segurança para evitar o erro de "undefined"
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ erro: "O corpo da requisição está vazio ou não é um JSON válido." });
        }

        const { nome, marca, preco, categoria } = req.body;

        // Validação manual básica
        if (!nome || !marca) {
            return res.status(400).json({ erro: "Nome e Marca são campos obrigatórios." });
        }

        const novoProduto = new Cosmetico({ nome, marca, preco, categoria });
        await novoProduto.save();

        res.status(201).json({ 
            mensagem: 'Produto cadastrado com sucesso!', 
            produto: novoProduto 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao salvar no banco de dados.' });
    }
});


// Rota para listar produtos
app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Cosmetico.find();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar produtos.' });
    }
});


app.get('/produtos/categoria/:cat', async (req, res) => {
    try {
        const produtos = await Cosmetico.find({ categoria: req.params.cat });
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao filtrar produtos.' });
    }
});

// Rota para consultar apenas 1 produto pelo ID
app.get('/produtos/:id', async (req, res) => {
    try {
        // req.params.id pega o ID que você digitou na URL
        const produto = await Cosmetico.findById(req.params.id);

        // Se o banco não encontrar nada com esse ID
        if (!produto) {
            return res.status(404).json({ erro: "Cosmético não encontrado." });
        }

        // Se encontrar, retorna o produto
        res.json(produto);

    } catch (error) {
        // Se o ID digitado for inválido (com menos caracteres do que o MongoDB exige)
        res.status(400).json({ erro: "ID inválido ou mal formatado." });
    }
});

app.put('/produtos/:id', async (req, res) => {
    try {
        const produtoAtualizado = await Cosmetico.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // Retorna o objeto já atualizado
        );
        res.json({ mensagem: 'Produto atualizado!', produto: produtoAtualizado });
    } catch (error) {
        res.status(400).json({ erro: 'Erro ao atualizar. Verifique o ID.' });
    }
});


app.delete('/produtos/:id', async (req, res) => {
    try {
        await Cosmetico.findByIdAndDelete(req.params.id);
        res.json({ mensagem: 'Produto removido com sucesso!' });
    } catch (error) {
        res.status(400).json({ erro: 'Erro ao deletar. Verifique o ID.' });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});