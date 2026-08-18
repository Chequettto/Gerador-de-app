document.addEventListener('DOMContentLoaded', () => {
  const btnGerar = document.getElementById('generate-btn');
  const promptInput = document.getElementById('prompt-input');
  const statusMsg = document.getElementById('status-message');
  const previewFrame = document.getElementById('preview-frame');

  if (!btnGerar) {
    console.error("Botão de gerar não encontrado na página!");
    return;
  }

  btnGerar.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert("Por favor, digite algo primeiro.");
      return;
    }

    btnGerar.disabled = true;
    btnGerar.innerText = "Gerando...";
    statusMsg.innerText = "Aguardando resposta do Gemini...";

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (response.ok) {
        statusMsg.innerText = "Sucesso! Aplicativo gerado.";
        const blob = new Blob([data.code], { type: 'text/html' });
        previewFrame.src = URL.createObjectURL(blob);
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error(err);
      statusMsg.innerText = "Erro: " + err.message;
    } finally {
      btnGerar.disabled = false;
      btnGerar.innerText = "Gerar aplicativo";
    }
  });
});
