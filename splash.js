/* ============================================================
   FOCUS — Splash de entrada (lente enfocando + iris de diafragma)
   Autocontenido: inyecta su propio CSS y DOM.
   Colócalo justo después de <body> en index.html:
     <script src="splash.js"></script>

   Lógica de entrada:
   - Primera entrada de la sesión (app recién abierta)  -> splash completo
   - Venir de login/registro (flag "focus-entry")        -> splash + saludo
   - Navegación interna entre páginas de la misma sesión -> no se repite
   ============================================================ */
(function () {
  "use strict";

  var entry = sessionStorage.getItem("focus-entry"); // "login" | "signup" | null
  var shown = sessionStorage.getItem("focus-splash-shown");

  // Si ya se mostró en esta sesión y no venimos de autenticarnos, no repetir.
  if (shown && !entry) return;

  sessionStorage.setItem("focus-splash-shown", "1");
  sessionStorage.removeItem("focus-entry");

  var subtitle =
    entry === "signup" ? "Welcome to Focus" :
    entry === "login"  ? "Welcome back"     : "";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- CSS ---------- */
  var css = [
    "#focus-splash{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;pointer-events:all;}",
    "#focus-splash svg.fs-iris{position:absolute;inset:0;width:100%;height:100%;display:block;}",
    "#focus-splash .fs-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:1.1rem;will-change:transform,opacity;}",

    /* Wordmark: desenfocado -> enfoque con 'hunting' de lente */
    "#focus-splash .fs-word{font-family:'Inter',sans-serif;font-weight:700;font-size:clamp(2.6rem,9vw,4.2rem);color:#fff;letter-spacing:.01em;opacity:0;filter:blur(18px);animation:fsFocus 1s cubic-bezier(.3,.7,.3,1) .12s forwards;}",
    "@keyframes fsFocus{0%{opacity:0;filter:blur(18px);transform:scale(1.05);}30%{opacity:1;filter:blur(3px);transform:scale(1.015);}52%{filter:blur(6px);}100%{opacity:1;filter:blur(0);transform:scale(1);}}",

    /* Corchetes AF alrededor del wordmark */
    "#focus-splash .fs-frame{position:absolute;inset:-1.4rem -2rem;opacity:0;transform:scale(1.22);animation:fsFrameIn .55s cubic-bezier(.2,.8,.2,1) .2s forwards, fsLock .5s ease 1.05s;}",
    "@keyframes fsFrameIn{to{opacity:1;transform:scale(1);}}",
    "#focus-splash .fs-corner{position:absolute;width:1.15rem;height:1.15rem;border:2px solid rgba(255,255,255,.45);transition:border-color .2s;}",
    "#focus-splash .fs-corner.tl{top:0;left:0;border-right:0;border-bottom:0;}",
    "#focus-splash .fs-corner.tr{top:0;right:0;border-left:0;border-bottom:0;}",
    "#focus-splash .fs-corner.bl{bottom:0;left:0;border-right:0;border-top:0;}",
    "#focus-splash .fs-corner.br{bottom:0;right:0;border-left:0;border-top:0;}",
    /* Confirmación de enfoque: destello verde en los corchetes */
    "@keyframes fsLock{0%,100%{filter:none;}35%{filter:drop-shadow(0 0 6px rgba(87,227,44,.7));}}",
    "#focus-splash .fs-frame.locked .fs-corner{border-color:#57e32c;}",
    "#focus-splash .fs-frame.settled .fs-corner{border-color:rgba(255,255,255,.28);transition:border-color .45s ease;}",

    /* Subtítulo (solo tras login / registro) */
    "#focus-splash .fs-sub{font-family:'Inter',sans-serif;font-weight:400;font-size:.85rem;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.55);opacity:0;transform:translateY(6px);animation:fsSubIn .6s ease 1.15s forwards;}",
    "@keyframes fsSubIn{to{opacity:1;transform:translateY(0);}}",

    /* Salida del contenido al abrirse el iris */
    "#focus-splash.opening .fs-stage{animation:fsStageOut .55s cubic-bezier(.7,0,.3,1) forwards;}",
    "@keyframes fsStageOut{to{opacity:0;transform:scale(1.12);}}",

    /* Iris: el hexágono-máscara y su contorno escalan juntos */
    "#focus-splash .fs-hole,#focus-splash .fs-ring{transform-box:fill-box;transform-origin:center;transform:scale(0) rotate(0deg);}",
    "#focus-splash.opening .fs-hole,#focus-splash.opening .fs-ring{animation:fsIris .7s cubic-bezier(.65,0,.25,1) forwards;}",
    "@keyframes fsIris{to{transform:scale(16) rotate(24deg);}}",
    "#focus-splash .fs-ring{fill:none;stroke:rgba(255,255,255,.10);stroke-width:.35;}",
    "#focus-splash.opening .fs-ring{animation:fsIris .7s cubic-bezier(.65,0,.25,1) forwards, fsRingFade .7s linear forwards;}",
    "@keyframes fsRingFade{0%{opacity:1;}70%{opacity:.5;}100%{opacity:0;}}",

    /* Accesibilidad: sin animaciones -> fundido simple */
    "#focus-splash.simple{background:#00000A;transition:opacity .45s ease;}",
    "#focus-splash.simple.done{opacity:0;}"
  ].join("\n");

  var style = document.createElement("style");
  style.id = "focus-splash-style";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var root = document.createElement("div");
  root.id = "focus-splash";
  root.setAttribute("role", "presentation");
  root.setAttribute("aria-hidden", "true");

  if (reduceMotion) {
    // Versión accesible: logo estático y fundido rápido.
    root.className = "simple";
    root.innerHTML =
      '<div class="fs-stage"><div class="fs-word" style="animation:none;opacity:1;filter:none;">Focus.</div></div>';
    document.body.prepend(root);
    setTimeout(function () {
      root.classList.add("done");
      setTimeout(function () { root.remove(); style.remove(); }, 500);
    }, 650);
    return;
  }

  // Hexágono (diafragma) centrado en 50,50 con radio 6 unidades.
  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(3) + "," + (cy + r * Math.sin(a)).toFixed(3));
    }
    return pts.join(" ");
  }
  var hex = hexPoints(50, 50, 6);

  root.innerHTML =
    '<svg class="fs-iris" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">' +
      '<defs><mask id="fsMask">' +
        '<rect x="-20" y="-20" width="140" height="140" fill="#fff"/>' +
        '<polygon class="fs-hole" points="' + hex + '" fill="#000"/>' +
      '</mask></defs>' +
      '<rect x="-20" y="-20" width="140" height="140" fill="#00000A" mask="url(#fsMask)"/>' +
      '<polygon class="fs-ring" points="' + hex + '"/>' +
    '</svg>' +
    '<div class="fs-stage">' +
      '<div class="fs-frame">' +
        '<span class="fs-corner tl"></span><span class="fs-corner tr"></span>' +
        '<span class="fs-corner bl"></span><span class="fs-corner br"></span>' +
      '</div>' +
      '<div class="fs-word">Focus.</div>' +
      (subtitle ? '<div class="fs-sub">' + subtitle + "</div>" : "") +
    "</div>";

  document.body.prepend(root);

  var frame = root.querySelector(".fs-frame");

  // t=1.05s: la lente "confirma" el enfoque (verde) y luego se asienta.
  setTimeout(function () { frame.classList.add("locked"); }, 1050);
  setTimeout(function () { frame.classList.remove("locked"); frame.classList.add("settled"); }, 1480);

  // Apertura del iris. Un pelín más tarde si hay saludo, para que se lea.
  var openAt = subtitle ? 2050 : 1750;
  setTimeout(function () { root.classList.add("opening"); }, openAt);
  setTimeout(function () { root.remove(); style.remove(); }, openAt + 800);
})();
