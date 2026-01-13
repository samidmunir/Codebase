const q = document.getElementById("q");
const askBtn = document.getElementById("ask");
const answerEl = document.getElementById("answer");
const sourcesEl = document.getElementById("sources");

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function ask() {
  const question = q.value.trim();
  if (!question) return;

  answerEl.textContent = "Thinking...";
  sourcesEl.innerHTML = "";

  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const data = await res.json();
  answerEl.textContent = data.answer || "";

  (data.sources || []).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "source";
    div.innerHTML = `
      <div class="source-title">[${i + 1}] ${escapeHtml(
      s.source || "unknown"
    )} (page ${escapeHtml(String(s.page ?? "n/a"))})</div>
      <div class="source-snippet">${escapeHtml(s.snippet || "")}</div>
    `;
    sourcesEl.appendChild(div);
  });
}

askBtn.addEventListener("click", ask);
q.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});
