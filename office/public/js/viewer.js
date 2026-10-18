// Document reader: shows a Markdown / text file from the workspace as a clean page, with a button
// to save it as PDF (the browser's print dialog, "Simpan sebagai PDF"). The text is escaped
// before formatting, so a file written by an agent cannot inject markup or scripts.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const inline = (raw) => {
  const codes = [];
  let s = esc(raw).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
};

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const LIST = /^\s*([-*+]|\d+[.)])\s+/;
const ROW = /^\s*\|.*\|\s*$/;

export const renderMarkdown = (text) => {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      for (i += 1; i < lines.length && !/^```/.test(lines[i]); i += 1) buf.push(lines[i]);
      i += 1;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
    } else if (/^\s*$/.test(line)) {
      i += 1;
    } else if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inline(line.replace(/^#+\s*/, ""))}</h${level}>`);
      i += 1;
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push("<hr>");
      i += 1;
    } else if (ROW.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || "")) {
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && ROW.test(lines[i]); i += 1) rows.push(cells(lines[i]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    } else if (/^\s*>/.test(line)) {
      const buf = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i += 1) buf.push(lines[i].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`);
    } else if (LIST.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items = [];
      for (; i < lines.length && LIST.test(lines[i]); i += 1) {
        const m = lines[i].match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
        const body = m[2].replace(/^\[( |x)\]\s/i, (_, c) => (c === " " ? "☐ " : "☑ "));
        items.push(`<li style="margin-left:${Math.min(3, Math.floor(m[1].length / 2)) * 1.2}em">${inline(body)}</li>`);
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
    } else {
      const buf = [];
      for (; i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|\s*>)/.test(lines[i]) && !ROW.test(lines[i]) && !LIST.test(lines[i]); i += 1) buf.push(lines[i]);
      if (!buf.length) { buf.push(line); i += 1; }
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
  }
  return out.join("\n");
};

const start = async () => {
  const rel = new URLSearchParams(location.search).get("path") || "";
  const q = encodeURIComponent(rel);
  const base = rel.split("/").pop() || "dokumen";
  document.title = base;
  document.getElementById("name").textContent = base;
  document.getElementById("dl").href = `/api/files/raw?path=${q}&download=1`;
  document.getElementById("print").onclick = () => window.print();
  const doc = document.getElementById("doc");
  try {
    const res = await fetch(`/api/files/raw?path=${q}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "File tidak ditemukan");
    const text = await res.text();
    const ext = base.split(".").pop().toLowerCase();
    doc.innerHTML = ext === "md" || ext === "markdown" || (ext === "txt" && /^#|\n#/.test(text)) ? renderMarkdown(text) : `<pre><code>${esc(text)}</code></pre>`;
    const h1 = doc.querySelector("h1");
    if (h1) document.title = h1.textContent;
  } catch (err) {
    doc.innerHTML = `<p class="err">⚠ ${esc(err.message)}</p>`;
  }
};
if (typeof document !== "undefined") start();
