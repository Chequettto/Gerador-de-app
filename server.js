const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Carrega as chaves do ambiente (Render) ou do .env
const keys = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (key) {
    keys.push(key);
  }
}

console.log(`🚀 Servidor rodando na porta ${PORT}`);
console.log(`   Chaves carregadas: ${keys.length}`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o front-end verificar se o servidor está OK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', keysLoaded: keys.length });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso!`);
});
