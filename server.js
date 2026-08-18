/**
 * =====================================================================
 * MEU CRIADOR DE APLICATIVOS (COM ROTAÇÃO DE CHAVES DO GEMINI)
 * =====================================================================
 * Como rodar:
 * 1. Instale o Node.js (18+).
 * 2. Rode: npm install
 * 3. Copie ".env.example" para ".env" e cole suas chaves reais do Gemini.
 * 4. Rode: npm start
 * 5. Abra: http://localhost:3000
 *
 * IMPORTANTE: as chaves ficam no arquivo ".env", que NUNCA é enviado
 * ao GitHub (está no .gitignore). Nunca cole chaves reais direto no
 * código se o repositório for público.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// CONFIGURAÇÃO DAS CHAVES (vem do arquivo .env, nunca do código)
// =====================================================================
const geminiKeys = (process.env.GEMINI_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 45000;

let currentKeyIndex = 0;

// =====================================================================
// PROMPT DE SISTEMA — pensado para gerar o app COMPLETO em uma rodada só
// =====================================================================
function montarPrompt(pedidoDoUsuario, codigoAnterior) {
  const regrasBase = `
Você é um engenheiro front-end sênior especializado em criar aplicativos web
completos, funcionais e visualmente bonitos em UMA ÚNICA RESPOSTA.

REGRAS OBRIGATÓRIAS:
1. Gere um ÚNICO arquivo HTML completo (<!DOCTYPE html> até </html>).
2. Inclua TODO o CSS dentro de <style> e TODO o JavaScript dentro de <script>,
   no mesmo arquivo. Não use arquivos externos, exceto:
   - Tailwind via <script src="https://cdn.tailwindcss.com"></script>
   - Ícones via lucide (https://unpkg.com/lucide@latest) se precisar
   - Fontes do Google Fonts se quiser tipografia melhor
3. O aplicativo deve funcionar de verdade: botões clicáveis, formulários que
   validam, dados salvos em variáveis JavaScript (nunca localStorage), listas
   que atualizam a tela sem recarregar a página.
4. NUNCA deixe texto de placeholder tipo "conteúdo aqui" ou "lorem ipsum".
   Preencha com conteúdo de exemplo real e coerente com o pedido.
5. Design: moderno, responsivo (funciona bem no celular), com boa hierarquia
   visual, espaçamento generoso e uma paleta de cores coerente. Evite o
   visual genérico "template de tutorial".
6. Responda APENAS com o código. Sem explicações antes ou depois, sem
   markdown, sem frases como "aqui está seu código". Comece direto com
   <!DOCTYPE html> e termine em </html>.
`.trim();

  if (codigoAnterior) {
    return `${regrasBase}

Você já gerou uma versão anterior deste aplicativo (código completo abaixo).
O usuário quer um AJUSTE, não um app do zero. Modifique apenas o necessário,
mantendo tudo o que já funcionava, e devolva o ARQUIVO HTML COMPLETO
atualizado (não um trecho, o arquivo inteiro de novo).

--- CÓDIGO ATUAL ---
${codigoAnterior}
--- FIM DO CÓDIGO ATUAL ---

PEDIDO DE AJUSTE DO USUÁRIO: ${pedidoDoUsuario}`;
  }

  return `${regrasBase}

PEDIDO DO USUÁRIO: ${pedidoDoUsuario}`;
}

// =====================================================================
// EXTRAÇÃO ROBUSTA DO CÓDIGO (a IA às vezes manda texto + ```html)
// =====================================================================
function extrairCodigo(textoBruto) {
  if (!textoBruto) return null;

  // 1) Tenta achar um bloco ```html ... ``` ou ``` ... ```
  const blocoMarkdown = textoBruto.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (blocoMarkdown && blocoMarkdown[1].trim()) {
    return blocoMarkdown[1].trim();
  }

  // 2) Tenta achar diretamente de <!DOCTYPE ou <html até </html>
  const doctypeMatch = textoBruto.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  if (doctypeMatch) return doctypeMatch[0].trim();

  const htmlMatch = textoBruto.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return `<!DOCTYPE html>\n${htmlMatch[0].trim()}`;

  // 3) Se nada bateu mas parece HTML mesmo assim, devolve como está
  if (textoBruto.includes('<') && textoBruto.includes('>')) {
    return textoBruto.trim();
  }

  return null;
}

// =====================================================================
// CHAMADA AO GEMINI COM ROTAÇÃO E RETRY INTELIGENTE
// =====================================================================
async function chamarGeminiComRotacao(promptCompleto) {
  if (geminiKeys.length === 0) {
    throw new Error(
      'Nenhuma chave configurada. Copie .env.example para .env e cole suas chaves em GEMINI_API_KEYS.'
    );
  }

  const maxTentativas = geminiKeys.length * 2; // dá 2 chances por chave (rede pode falhar 1x)
  let tentativas = 0;
  let ultimoErro = null;

  while (tentativas < maxTentativas) {
    const chaveAtual = geminiKeys[currentKeyIndex];
    tentativas++;

    if (!chaveAtual || chaveAtual.includes('SUA_CHAVE')) {
      currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
      ultimoErro = new Error(`Chave no índice [${currentKeyIndex}] é um exemplo, não uma chave real.`);
      continue;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`> Requisição usando chave [${currentKeyIndex}] e modelo ${GEMINI_MODEL}...`);

      const resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${chaveAtual}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptCompleto }] }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 8192
            }
          })
        }
      );

      clearTimeout(timeoutId);

      if (resposta.status === 429 || resposta.status === 403) {
        console.log(`⚠️ Chave [${currentKeyIndex}] sem cota ou sem permissão (${resposta.status}). Trocando...`);
        currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
        ultimoErro = new Error(`Chave [${currentKeyIndex}] esgotada/sem permissão.`);
        continue;
      }

      if (resposta.status >= 500) {
        console.log(`⚠️ Erro no servidor do Gemini (${resposta.status}). Tentando de novo...`);
        currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
        ultimoErro = new Error(`Erro ${resposta.status} no servidor do Gemini.`);
        continue;
      }

      const dados = await resposta.json();

      if (dados.error) {
        // Chave inválida de verdade (400 de API key malformada, por exemplo)
        if (resposta.status === 400) {
          console.log(`⚠️ Chave [${currentKeyIndex}] inválida. Trocando...`);
          currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
          ultimoErro = new Error(dados.error.message || 'Chave inválida.');
          continue;
        }
        throw new Error(dados.error.message || 'Erro retornado pela API do Gemini.');
      }

      const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!texto) {
        throw new Error('A API respondeu sem conteúdo utilizável (possível bloqueio de segurança do Gemini).');
      }

      return texto;
    } catch (erro) {
      clearTimeout(timeoutId);
      if (erro.name === 'AbortError') {
        console.log(`⚠️ Timeout na chave [${currentKeyIndex}]. Trocando...`);
      } else {
        console.log(`⚠️ Erro de rede/execução: ${erro.message}. Trocando...`);
      }
      currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
      ultimoErro = erro;
    }
  }

  throw ultimoErro || new Error('Todas as chaves falharam.');
}

// =====================================================================
// ROTAS DA API
// =====================================================================
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    chavesConfiguradas: geminiKeys.length,
    modelo: GEMINI_MODEL
  });
});

app.post('/api/gerar', async (req, res) => {
  const { prompt, codigoAnterior } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ sucesso: false, erro: 'O campo de instrução não pode estar vazio.' });
  }

  try {
    const promptCompleto = montarPrompt(prompt.trim(), codigoAnterior);
    const textoBruto = await chamarGeminiComRotacao(promptCompleto);
    const codigo = extrairCodigo(textoBruto);

    if (!codigo) {
      return res.status(502).json({
        sucesso: false,
        erro: 'O Gemini respondeu, mas não foi possível extrair código HTML da resposta.'
      });
    }

    res.json({ sucesso: true, codigo });
  } catch (error) {
    console.error('Erro em /api/gerar:', error.message);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando na porta ${PORTA}`);
  console.log(`   Abra: http://localhost:${PORTA}`);
  console.log(`   Chaves carregadas: ${geminiKeys.length}`);
  console.log(`   Modelo: ${GEMINI_MODEL}`);
  if (geminiKeys.length === 0) {
    console.log('   ⚠️  Nenhuma chave em .env — crie o arquivo a partir de .env.example');
  }
});
