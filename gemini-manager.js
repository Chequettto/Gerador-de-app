const { GoogleGenerativeAI } = require('@google/generative-ai');

function getApiKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

function extrairHtml(texto) {
  const match = texto.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (match) {
    return match[1].trim();
  }
  const doctypeIndex = texto.search(/<!DOCTYPE html>/i);
  const htmlIndex = texto.search(/<html/i);
  const start = doctypeIndex !== -1 ? doctypeIndex : htmlIndex;
  if (start !== -1) {
    return texto.slice(start).trim();
  }
  return texto.trim();
}

const INSTRUCAO_SISTEMA = `Você é um gerador de mini-aplicativos web.
Responda APENAS com o código HTML completo (incluindo <style> e <script> internos, tudo em um único arquivo).
NÃO escreva nenhuma explicação, introdução, comentário ou lista de funcionalidades antes ou depois do código.
NÃO use blocos de markdown com \`\`\`.
Sua resposta deve começar diretamente com <!DOCTYPE html> e terminar com </html>.`;

async function gerarComGemini(prompt, history = []) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('Nenhuma chave de API configurada.');
  }

  const promptFinal = `${INSTRUCAO_SISTEMA}\n\nPedido do usuário: ${prompt}`;

  let ultimoErro = null;

  for (const key of keys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const result = await model.generateContent(promptFinal);
      const response = await result.response;
      const textoBruto = response.text();
      return extrairHtml(textoBruto);
    } catch (err) {
      console.warn('Erro com uma das chaves, tentando a próxima...', err.message);
      ultimoErro = err;
    }
  }

  throw new Error(
    'Todas as chaves de API falharam ao processar a requisição. Último erro: ' +
    (ultimoErro ? ultimoErro.message : 'desconhecido')
  );
}

module.exports = { gerarComGemini };
