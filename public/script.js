      el.historyList.appendChild(li);
    });
  }

  // ---------------- copiar / baixar ----------------
  el.btnCopiar.addEventListener('click', async () => {
    if (!state.codigoAtual) return;
    await navigator.clipboard.writeText(state.codigoAtual);
    const original = el.btnCopiar.textContent;
    el.btnCopiar.textContent = 'Copiado!';
    setTimeout(() => (el.btnCopiar.textContent = original), 1500);
  });

  el.btnBaixar.addEventListener('click', () => {
    if (!state.codigoAtual) return;
    const blob = new Blob([state.codigoAtual], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meu-aplicativo.html';
    a.click();
  });

  // Ctrl+Enter para gerar rápido
  el.prompt.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') el.btnGerar.click();
  });
})();
