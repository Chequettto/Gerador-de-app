document.addEventListener('DOMContentLoaded', () => {
  const el = {
    form: document.getElementById('generator-form'),
    prompt: document.getElementById('prompt-input'),
    btnGerar: document.getElementById('generate-btn'),
    preview: document.getElementById('preview-frame'),
    codeTab: document.getElementById('code-content'),
    previewTab: document.getElementById('preview-tab-btn'),
    codeTabBtn: document.getElementById('code-tab-btn'),
    status: document.getElementById('status-message'),
    historyList: document.getElementById('history-list'),
    btnCopiar: document.getElementById('copy-btn'),
    btnBaixar: document.getElementById('download-btn')
  };

  let state = {
    codigoAtual: '',
    historico: []
  };

  // Verifica se o servidor está online ao carregar
  fetch('/api/health')
    .then(res => res.json())
    .then(data => {
      if (el.status) el.status.textContent = '';
    })
    .catch(() => {
      if (el.status) el.status.textContent = 'Erro ao conectar ao servidor.';
    });

  // Evento de envio do formulário / clique em gerar
  if (el.btnGerar) {
    el.btnGerar.addEventListener('click', async () => {
      const promptText = el.prompt.value.trim();
      if (!promptText) return;

      el.btnGerar.disabled = true;
      el.btnGerar.textContent = 'Gerando aplicativo...';
      if (el.status) el.status.textContent = 'A Inteligência Artificial está criando seu app...';

      try {
        const response = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, history: state.historico })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao gerar');

        state.codigoAtual = data.code;
        
        // Atualiza a pré-via com o código gerado
        const blob = new Blob([data.code], { type: 'text/html' });
        el.preview.src = URL.createObjectURL(blob);
        el.codeTab.textContent = data.code;

        // Adiciona ao histórico
        state.historico.push({ prompt: promptText, code: data.code });
        renderHistory();

        if (el.status) el.status.textContent = 'Aplicativo gerado com sucesso!';
      } catch (err) {
        console.error(err);
        if (el.status) el.status.textContent = 'Erro: ' + err.message;
      } finally {
        el.btnGerar.disabled = false;
        el.btnGerar.textContent = 'Gerar aplicativo';
      }
    });
  }

  function renderHistory() {
    if (!el.historyList) return;
    el.historyList.innerHTML = '';
    state.historico.forEach((item, index) => {
      const li = document.createElement('li');
      li.textContent = item.prompt;
      li.addEventListener('click', () => {
        state.codigoAtual = item.code;
        const blob = new Blob([item.code], { type: 'text/html' });
        el.preview.src = URL.createObjectURL(blob);
        el.codeTab.textContent = item.code;
      });
      el.historyList.appendChild(li);
    });
  }

  // ---------------- copiar / baixar ----------------
  if (el.btnCopiar) {
    el.btnCopiar.addEventListener('click', async () => {
      if (!state.codigoAtual) return;
      await navigator.clipboard.writeText(state.codigoAtual);
      const original = el.btnCopiar.textContent;
      el.btnCopiar.textContent = 'Copiado!';
      setTimeout(() => (el.btnCopiar.textContent = original), 1500);
    });
  }

  if (el.btnBaixar) {
    el.btnBaixar.addEventListener('click', () => {
      if (!state.codigoAtual) return;
      const blob = new Blob([state.codigoAtual], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meu-aplicativo.html';
      a.click();
    });
  }

  // Ctrl+Enter para gerar rápido
  if (el.prompt) {
    el.prompt.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') el.btnGerar.click();
    });
  }
});
