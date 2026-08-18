const { GoogleGenerativeAI } = require('@google/generative-ai');

function getApiKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

async function gerarComGemini(prompt, history = []) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('Nenhuma chave de API configurada.');
  }

  for (const key of keys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn('Erro com uma das chaves, tentando a próxima...', err.message);
    }
  }

  throw new Error('Todas as chaves de API falharam ao processar a requisição.');
}

module.exports = { gerarComGemini };
