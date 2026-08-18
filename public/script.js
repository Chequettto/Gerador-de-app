document.addEventListener('DOMContentLoaded', () => {
  console.log("Sistema iniciado com sucesso!");

  // Tenta encontrar os elementos pelo ID ou pega os primeiros que achar
  const btnGerar = document.getElementById('generate-btn') || document.querySelector('button');
  const promptInput = document.getElementById('prompt-input') || document.querySelector('textarea, input[type="text"]');
  const statusMsg = document.getElementById('status-message') || document.createElement('div');
  const previewFrame = document.getElementById('preview-frame') || document.querySelector('iframe');

  if (!btnGerar) {
    alert("Erro crítico: Nenhum botão foi encontrado na sua página HTML!");
    return;
  }

  btnGerar.addEventListener('click', async () => {
    const prompt = promptInput ? promptInput.value.trim() : "";
    
    if (!prompt) {
      alert("Por favor, digite alguma instrução na caixa de texto.");
      return;
    }

    const textoOriginal = btnGerar.innerText;
    btnGerar.disabled = true;
    btnGerar.innerText = "Gerando...";
    
    if (statusMsg) statusMsg.innerText = "A Inteligência Artificial está criando seu app...";

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (response.ok) {
        if (statusMsg) statusMsg.innerText = "Pronto! Aplicativo gerado com sucesso.";
        
        if (previewFrame) {
          const blob = new Blob([data.code], { type: 'text/html' });
          previewFrame.src = URL.createObjectURL(blob);
        } else {
          // Se não achar o iframe, baixa o arquivo direto para você ver
          const blob = new Blob([data.code], { type: 'text/html' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'meu-aplicativo.html';
          a.click();
        }
      } else {
        throw new Error(data.error || "Erro ao gerar código");
      }
    } catch (err) {
      console.error(err);
      if (statusMsg) statusMsg.innerText = "Erro: " + err.message;
      alert("Erro ao gerar: " + err.message);
    } finally {
      btnGerar.disabled = false;
      btnGerar.innerText = textoOriginal;
    }
  });
});
