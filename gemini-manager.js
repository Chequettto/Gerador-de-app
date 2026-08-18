import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
].filter(Boolean);

if (API_KEYS.length === 0) {
  throw new Error("Nenhuma chave GEMINI_API_KEY foi configurada.");
}

let currentKeyIndex = 0;

function getClient() {
  return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
}

function isQuotaError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
}

function nextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

  console.log(
    `Gemini: mudando para a chave ${currentKeyIndex + 1}/${API_KEYS.length}`
  );
}

export async function generateText(prompt) {
  let attempts = 0;

  while (attempts < API_KEYS.length) {
    try {
      const client = getClient();

      const model = client.getGenerativeModel({
        model: MODEL,
      });

      const result = await model.generateContent(prompt);

      return result.response.text();

    } catch (error) {
      console.error(
        `Erro usando chave ${currentKeyIndex + 1}:`,
        error?.message || error
      );

      if (!isQuotaError(error)) {
        throw error;
      }

      nextKey();
      attempts++;
    }
  }

  throw new Error(
    "Todas as chaves Gemini atingiram o limite ou estão indisponíveis."
  );
}
```[cite: 4]

3. Depois de colar, clique no botão verde no canto superior direito: **`Commit changes...`**.

Me avise assim que salvar!
