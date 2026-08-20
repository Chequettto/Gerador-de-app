function setPrompt(text) {
  document.getElementById("prompt").value = text;
}

async function generateApp() {
  const prompt = document.getElementById("prompt").value;
  const preview = document.getElementById("preview");

  preview.innerHTML = `
    <div style="color:white">
      <h2>IA criando seu app...</h2>
    </div>
  `;

  const res = await fetch("/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();

  preview.innerHTML = `
    <iframe srcdoc="${data.html.replace(/"/g, '&quot;')}"></iframe>
  `;
}
