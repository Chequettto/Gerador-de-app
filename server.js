const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { gerarComGemini } = require('./gemini-manager');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota de Health Check que o seu front-end consulta
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota de Geração do Aplicativo
app.post('/generate', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt não fornecido' });
    }

    const resultado = await gerarComGemini(prompt, history || []);
    res.json({ code: resultado });
  } catch (error) {
    console.error('Erro na geração:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar requisição com IA' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
