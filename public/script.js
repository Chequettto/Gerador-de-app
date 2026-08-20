document.addEventListener('DOMContentLoaded', () => {
  const el = {
    prompt: document.getElementById('prompt'),
    btnGerar: document.getElementById('btnGerar'),
    btnGerarLabel: document.getElementById('btnGerarLabel'),
    spinner: document.getElementById('spinner'),
    status: document.getElementById('status'),
    historyList: document.getElementById('historyList'),
    apiStatus: document.getElementById('apiStatus'),
    previewFrame: document.getElementById('previewFrame'),
    codeViewText: document.getElementById('codeViewText'),
    codeView: document.getElementById('codeView'),
    emptyState: document.getElementById('emptyState'),
    btnCopiar: document.getElementById('btnCopiar'),
    btnBaixar: document.getElementById('btnBaixar'),
    btnSalvar: document.getElementById('btnSalvar'),
    examples: document.getElementById('examples'),
    tabs: document.querySelectorAll('.tab'),
    devices: document.querySelectorAll('.device'),
    frameWrap: document.getElementById('frameWrap'),
    stageBar: document.getElementById('stageBar'),
    stagePlanejar: document.getElementById('stagePlanejar'),
    stageCriar: document.getElementById('stageCriar'),
    planoList: document.getElementById('planoList'),
  };

  let state = {
    codigoAtual: '',
    promptAtual: '',
    planoAtual: [],
    historico: []
  };

  fetch('/api/health')
    .then(res => res.json())
    .then(() => {
      if (el.apiStatus) el.apiStatus.textContent = 'servidor online';
    })
    .catch(() => {
      if (el.apiStatus) el.apiStatus.textContent = 'erro no servidor';
    });

  if (el.examples) {
    el.examples.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && el.prompt) {
        el.prompt.value = chip.getAttribute('data-example');
      }
    });
  }

  function setStage(stage) {
    if (!el.stageBar) return;
    el.stageBar.hidden = false;
    el.stagePlanejar.classList.toggle('is-active', stage === 'planejando');
    el.stagePlanejar.classList.toggle('is-done', stage === 'criando' || stage === 'concluido');
    el.stageCriar.classList.toggle('is-active', stage === 'criando');
    el.stageCriar.classList.toggle('is-done', stage === 'concluido');
  }

  function renderPlano(plano) {
    if (!el.planoList || !plano) return;
    el.planoList.innerHTML = '';
    plano.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      el.planoList.appendChild(li);
    });
    el.planoList.hidden = false;
  }

  if (el.btnGerar) {
    el.btnGerar.addEventListener('click', () => {
      const promptText = el.prompt ? el.prompt.value.trim() : '';
      if (!promptText) {
        alert('Por favor, descreva o aplicativo que você quer criar.');
        return;
      }

      setLoading(true);
      state.promptAtual = promptText;
      if (el.planoList) { el.planoList.innerHTML = ''; el.planoList.hidden = true; }
      setStage('planejando');

      const source = new EventSource('/generate/stream?prompt=' + encodeURIComponent(promptText));

      source.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.stage === 'planejando' && data.plano) {
          renderPlano(data.plano);
          state.planoAtual = data.plano;
        }
        if (data.stage === 'criando') {
          setStage('criando');
          if (el.status) el.status.textContent = data.message;
        }
        if (data.stage === 'planejando' && !data.plano) {
          if (el.status) el.status.textContent = data.message;
        }

        if (data.stage === 'salvo_temp') {
          state.codigoAtual = data.html;

          const blob = new Blob([data.html], { type: 'text/html' });
          if (el.previewFrame) {
            el.previewFrame.hidden = false;
            el.previewFrame.src = URL.createObjectURL(blob);
          }
          if (el.codeViewText) el.codeViewText.textContent = data.html;

          if (el.emptyState) el.emptyState.hidden = true;
          if (el.btnCopiar) el.btnCopiar.disabled = false;
          if (el.btnBaixar) el.btnBaixar.disabled = false;
          if (el.btnSalvar) el.btnSalvar.disabled = false;

          state.historico.push({ prompt: promptText, code: data.html, plano: state.planoAtual });
          renderHistory();

          if (el.status) el.status.textContent = 'Aplicativo gerado com sucesso!';
          setLoading(false);
          source.close();
        }

        if (data.stage === 'erro') {
          if (el.status) el.status.textContent = 'Erro: ' + data.message;
          setLoading(false);
          source.close();
        }
      };

      source.onerror = () => {
        if (el.status) el.status.textContent = 'Erro de conexão ao gerar o aplicativo.';
        setLoading(false);
        source.close();
      };
    });
  }

  function setLoading(loading) {
    if (el.btnGerar) el.btnGerar.disabled = loading;
    if (el.spinner) el.spinner.hidden = !loading;
    if (el.btnGerarLabel) el.btnGerarLabel.textContent = loading ? 'Gerando...' : 'Gerar aplicativo';
    if (loading && el.status) el.status.textContent = 'A Inteligência Artificial está montando o app...';
    if (!loading && el.stageBar) {
      setTimeout(() => { el.stageBar.hidden = true; }, 1200);
    }
  }

  function renderHistory() {
    if (!el.historyList) return;
    el.historyList.innerHTML = '';
    state.historico.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.prompt;
      li.addEventListener('click', () => {
        state.codigoAtual = item.code;
        state.promptAtual = item.prompt;
        state.planoAtual = item.plano || [];
        const blob = new Blob([item.code], { type: 'text/html' });
        if (el.previewFrame) {
          el.previewFrame.hidden = false;
          el.previewFrame.src = URL.createObjectURL(blob);
        }
        if (el.codeViewText) el.codeViewText.textContent = item.code;
        if (el.emptyState) el.emptyState.hidden = true;
        if (el.btnCopiar) el.btnCopiar.disabled = false;
        if (el.btnBaixar) el.btnBaixar.disabled = false;
        if (el.btnSalvar) el.btnSalvar.disabled = false;
      });
      el.historyList.appendChild(li);
    });
  }

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

  if (el.btnSalvar) {
    el.btnSalvar.addEventListener('click', async () => {
      if (!state.codigoAtual) return;
      el.btnSalvar.disabled = true;
      const original = el.btnSalvar.textContent;
      el.btnSalvar.textContent = 'Salvando...';
      try {
        const res = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: state.promptAtual, plano: state.planoAtual, html: state.codigoAtual }),
        });
        if (!res.ok) throw new Error('Falha ao salvar');
        el.btnSalvar.textContent = 'Salvo ✓';
        setTimeout(() => { el.btnSalvar.textContent = original; el.btnSalvar.disabled = false; }, 1800);
      } catch {
        el.btnSalvar.textContent = 'Erro ao salvar';
        setTimeout(() => { el.btnSalvar.textContent = original; el.btnSalvar.disabled = false; }, 1800);
      }
    });
  }

  if (el.tabs) {
    el.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const view = tab.getAttribute('data-view');
        if (view === 'preview') {
          if (el.previewFrame) el.previewFrame.hidden = false;
          if (el.codeView) el.codeView.hidden = true;
        } else {
          if (el.previewFrame) el.previewFrame.hidden = true;
          if (el.codeView) el.codeView.hidden = false;
        }
      });
    });
  }

  if (el.devices) {
    el.devices.forEach(dev => {
      dev.addEventListener('click', () => {
        el.devices.forEach(d => d.classList.remove('is-active'));
        dev.classList.add('is-active');
        const w = dev.getAttribute('data-width');
        if (el.frameWrap) el.frameWrap.style.width = w;
      });
    });
  }
});
