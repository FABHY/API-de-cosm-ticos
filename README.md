# 💄 API de Cadastro - Empresa de Cosméticos (Ambiente de Teste)

Esta é a documentação técnica da API de gerenciamento de catálogo de cosméticos, desenvolvida em Node.js e publicada em ambiente de homologação/teste na nuvem.

## 🚀 Links do Ambiente
- **URL Base da API (Render):** `https://api-de-cosm-ticos.onrender.com`
- **Banco de Dados (MongoDB Atlas):** Cluster em Nuvem (Persistência de dados ativa)

## 🏗️ Arquitetura do Sistema
A API foi construída seguindo o padrão REST, utilizando as seguintes tecnologias:
- **Node.js** & **Express**: Motor do servidor e gerenciamento de rotas HTTP.
- **Mongoose**: Modelagem de dados e integração com o banco de dados.
- **MongoDB Atlas**: Banco de dados NoSQL baseado em documentos para armazenamento do catálogo.
- **Render**: Infraestrutura de hospedagem com deploy contínuo (integrado ao GitHub).

---

## 🔌 Guia de Endpoints (Rotas da API)

### 1. Cadastrar Novo Cosmético
- **Método:** `POST`
- **Endpoint:** `/cadastro`
- **Corpo da Requisição (JSON):**
```json
{
  "nome": "Batom Matte Hidratante Vegano",
  "marca": "EcoBeauty",

Resposta de Sucesso (201 Created):

JSON
{
  "mensagem": "Produto cadastrado com sucesso!",
  "produto": {
    "_id": "6649df123a4b5c6789de0f11",
    "nome": "Batom Matte Hidratante Vegano",
    "marca": "EcoBeauty",
    "preco": 42.90,
    "categoria": "Maquiagem"
  }
}

2. Listar Todos os Produtos
Método: GET

Endpoint: /produtos

Resposta: Retorna um array contendo todos os cosméticos salvos no banco de dados.

3. Consultar 1 Produto Específico
Método: GET

Endpoint: /produtos/:id

Exemplo de Uso: /produtos/6649df123a4b5c6789de0f11

🛠️ Como Executar e Testar Localmente
Clone o repositório.

Instale as dependências:
npm install

Crie um arquivo .env na raiz do projeto e adicione sua string de conexão:
MONGO_URI=sua_string_do_mongodb
PORT=3000

Inicie o servidor:
npm start




  "preco": 42.90,
  "categoria": "Maquiagem"
}
