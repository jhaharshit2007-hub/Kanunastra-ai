/*
 * Kanunastra AI chat widget — drop-in, no framework, no build step.
 *
 * Add to any page (just before </body>):
 *   <script src="https://YOUR-SERVER/chat-widget.js" data-api="https://YOUR-SERVER/api/chat" defer></script>
 *
 * Optional attributes: data-title, data-color (hex), data-greeting
 */
(function () {
  if (window.__kanunastraChat) return;
  window.__kanunastraChat = true;

  var script = document.currentScript;
  var apiUrl =
    (script && script.getAttribute("data-api")) ||
    (script && script.src ? new URL("/api/chat", script.src).href : "/api/chat");
  var title = (script && script.getAttribute("data-title")) || "Kanunastra Assistant";
  var color = (script && script.getAttribute("data-color")) || "#1e3a8a";
  var greeting =
    (script && script.getAttribute("data-greeting")) ||
    "Namaste! 🙏 Tell me what you need help with and I'll point you to the right government helpline or legal portal.";

  var CHIPS = [
    "How do I get free legal aid?",
    "I was cheated online",
    "Women helpline number",
    "Which court handles consumer complaints?",
  ];

  var messages = []; // {role: 'user'|'assistant', content}
  var busy = false;

  var host = document.createElement("div");
  host.setAttribute("id", "kanunastra-chat-host");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Devanagari',sans-serif}" +
    ".fab{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:0;background:" + color + ";color:#fff;font-size:26px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28);z-index:2147483000;display:flex;align-items:center;justify-content:center}" +
    ".fab:hover{transform:scale(1.05)}" +
    ".panel{position:fixed;right:20px;bottom:90px;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;color:#111827}" +
    ".panel.open{display:flex}" +
    ".head{background:" + color + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}" +
    ".head b{font-size:15px}.head small{display:block;opacity:.8;font-size:11px;margin-top:2px}" +
    ".x{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}" +
    ".msgs{flex:1;overflow-y:auto;padding:14px;background:#f3f4f6;display:flex;flex-direction:column;gap:10px}" +
    ".m{max-width:86%;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word}" +
    ".m.bot{background:#fff;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.08)}" +
    ".m.me{background:" + color + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".m.err{background:#fef2f2;color:#991b1b;align-self:flex-start}" +
    ".m ul{margin:6px 0;padding-left:18px}.m li{margin:2px 0}.m a{color:inherit;text-decoration:underline}" +
    ".m.bot a{color:" + color + "}" +
    ".chips{display:flex;flex-wrap:wrap;gap:6px}" +
    ".chip{background:#fff;border:1px solid #d1d5db;border-radius:999px;padding:6px 10px;font-size:12.5px;cursor:pointer;color:#111827}" +
    ".chip:hover{border-color:" + color + ";color:" + color + "}" +
    ".typing{display:inline-flex;gap:4px;padding:4px 0}.typing i{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:b 1s infinite}" +
    ".typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}" +
    ".foot{border-top:1px solid #e5e7eb;background:#fff;padding:10px}" +
    ".row{display:flex;gap:8px}" +
    "textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:10px;padding:9px 10px;font-size:14px;outline:none;max-height:90px;color:#111827;background:#fff}" +
    "textarea:focus{border-color:" + color + "}" +
    ".send{background:" + color + ";color:#fff;border:0;border-radius:10px;padding:0 14px;font-size:14px;cursor:pointer}" +
    ".send:disabled{opacity:.5;cursor:default}" +
    ".note{font-size:10.5px;color:#6b7280;margin-top:6px;text-align:center}" +
    "</style>" +
    '<button class="fab" aria-label="Open chat">💬</button>' +
    '<div class="panel" role="dialog" aria-label="' + title + '">' +
    '<div class="head"><div><b></b><small>Government legal helplines — India</small></div><button class="x" aria-label="Close">×</button></div>' +
    '<div class="msgs"></div>' +
    '<div class="foot"><div class="row"><textarea rows="1" placeholder="Type your question…" maxlength="1000"></textarea><button class="send">Send</button></div>' +
    '<div class="note">AI answers may be wrong. Not legal advice. In danger? Call 112.</div></div>' +
    "</div>";

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".fab"), panel = $(".panel"), msgsEl = $(".msgs"),
    input = $("textarea"), sendBtn = $(".send");
  $(".head b").textContent = title;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Minimal, safe markdown: escapes first, then **bold**, bare URLs, "- " bullets.
  function render(text) {
    var lines = esc(text).split("\n"), out = [], inList = false;
    lines.forEach(function (line) {
      var bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      var body = bullet ? bullet[1] : line;
      body = body
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, function (u) {
          return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>";
        });
      if (bullet) {
        if (!inList) { out.push("<ul>"); inList = true; }
        out.push("<li>" + body + "</li>");
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(body ? body + "<br>" : "<br>");
      }
    });
    if (inList) out.push("</ul>");
    return out.join("").replace(/(<br>)+$/, "");
  }

  function add(cls, html) {
    var d = document.createElement("div");
    d.className = "m " + cls;
    d.innerHTML = html;
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return d;
  }

  function showIntro() {
    add("bot", render(greeting));
    var chips = document.createElement("div");
    chips.className = "chips";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip";
      b.textContent = c;
      b.onclick = function () { chips.remove(); send(c); };
      chips.appendChild(b);
    });
    msgsEl.appendChild(chips);
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "auto";
    var chips = root.querySelector(".chips");
    if (chips) chips.remove();

    messages.push({ role: "user", content: text });
    add("me", esc(text));
    var typing = add("bot", '<span class="typing"><i></i><i></i><i></i></span>');

    try {
      var r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      });
      var data = await r.json().catch(function () { return {}; });
      typing.remove();
      if (!r.ok || !data.reply) {
        messages.pop();
        add("err", esc(data.error || "Something went wrong. Please try again."));
      } else {
        messages.push({ role: "assistant", content: data.reply });
        add("bot", render(data.reply));
      }
    } catch (e) {
      typing.remove();
      messages.pop();
      add("err", "Can't reach the assistant. Check your connection and try again.");
    }
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  function toggle(open) {
    panel.classList.toggle("open", open);
    fab.textContent = open ? "×" : "💬";
    if (open) {
      if (!msgsEl.children.length) showIntro();
      input.focus();
    }
  }

  fab.onclick = function () { toggle(!panel.classList.contains("open")); };
  $(".x").onclick = function () { toggle(false); };
  sendBtn.onclick = function () { send(input.value); };
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 90) + "px";
  });
})();
