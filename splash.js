/* ============================================================
   FOCUS — Splash de entrada: objetivo de cámara buscando el enfoque
   ------------------------------------------------------------
   Un diafragma de 8 palas se abre y se cierra (hunting de autofocus),
   el wordmark "Focus." aparece desenfocado dentro de la apertura,
   el anillo de enfoque gira buscando... y al bloquear el enfoque
   (confirmación en verde) las palas se abren del todo y la cámara
   "atraviesa" el objetivo para entrar en la app.

   Autocontenido: inyecta su propio CSS y DOM.
   Colócalo justo después de <body> en index.html:
     <script src="splash.js"></script>

   Vías de entrada:
   - App recién abierta (primera vez en la sesión)  -> splash completo
   - Tras login / registro (flag "focus-entry")     -> splash + saludo
   - Navegación interna en la misma sesión          -> no se repite
   ============================================================ */
(function () {
  "use strict";

  var entry = sessionStorage.getItem("focus-entry"); // "login" | "signup" | null
  var shown = sessionStorage.getItem("focus-splash-shown");

  if (shown && !entry) return; // ya visto en esta sesión y no venimos de auth

  sessionStorage.setItem("focus-splash-shown", "1");
  sessionStorage.removeItem("focus-entry");

  var subtitle =
    entry === "signup" ? "Welcome to Focus" :
    entry === "login"  ? "Welcome back"     : "";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================ CSS ============================ */
  /* Timeline (s):
     0.00-0.45  el objetivo aparece (scale-in), palas casi cerradas
     0.45-2.00  HUNTING: palas abren -> se pasan -> cierran -> reabren
                el anillo de marcas gira adelante/atrás buscando
                el wordmark dentro de la apertura se (des)enfoca en sincronía
     2.00-2.45  LOCK: enfoque clavado -> destello verde en anillo y palas
     2.55/2.95  REVELADO: palas se abren del todo + zoom a través del
                objetivo, el overlay se desvanece y aparece la app
  */
  var css = [
    "#focus-splash{position:fixed;inset:0;z-index:99999;background:#00000A;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;overflow:hidden;}",
    "#focus-splash.opening{animation:fsZoomThrough .8s cubic-bezier(.6,0,.2,1) forwards;}",
    "@keyframes fsZoomThrough{0%{transform:scale(1);opacity:1;}60%{opacity:1;}100%{transform:scale(2.6);opacity:0;}}",

    /* --- El objetivo --- */
    "#focus-splash .fs-lens{width:min(74vmin,540px);height:min(74vmin,540px);position:relative;opacity:0;transform:scale(.82);animation:fsLensIn .5s cubic-bezier(.2,.9,.3,1.1) .05s forwards;}",
    "@keyframes fsLensIn{to{opacity:1;transform:scale(1);}}",
    "#focus-splash .fs-lens svg{width:100%;height:100%;display:block;}",

    /* Palas del diafragma: hunting de autofocus.
       rotate() controla la apertura: 2deg = casi cerrado, 60deg = abierto. */
    "#focus-splash .fs-blade{transform-box:view-box;transform-origin:178px 100px;animation:fsHunt 1.95s cubic-bezier(.45,.05,.35,1) .35s both;}",
    "@keyframes fsHunt{",
      "0%{transform:rotate(2deg);}",
      "22%{transform:rotate(30deg);}",   /* abre de golpe y se pasa */
      "38%{transform:rotate(12deg);}",   /* corrige: cierra */
      "56%{transform:rotate(34deg);}",   /* reabre buscando */
      "70%{transform:rotate(20deg);}",   /* duda */
      "88%{transform:rotate(29deg);}",   /* se acerca... */
      "100%{transform:rotate(26deg);}",  /* clavado */
    "}",
    "#focus-splash.opening .fs-blade{animation:fsBladesOpen .55s cubic-bezier(.7,0,.3,1) forwards;}",
    "@keyframes fsBladesOpen{from{transform:rotate(26deg);}to{transform:rotate(62deg);}}",

    /* Anillo de marcas de enfoque: gira buscando, en sincronía con las palas */
    "#focus-splash .fs-ticks{transform-box:view-box;transform-origin:100px 100px;animation:fsRingHunt 1.95s cubic-bezier(.45,.05,.35,1) .35s both;}",
    "@keyframes fsRingHunt{0%{transform:rotate(0);}22%{transform:rotate(38deg);}38%{transform:rotate(14deg);}56%{transform:rotate(44deg);}70%{transform:rotate(26deg);}88%{transform:rotate(38deg);}100%{transform:rotate(34deg);}}",

    /* Confirmación de enfoque: destello verde */
    "#focus-splash .fs-lens.locked .fs-blade path{stroke:#57e32c;transition:stroke .18s;}",
    "#focus-splash .fs-lens.locked .fs-ring-main{stroke:#57e32c;filter:drop-shadow(0 0 8px rgba(87,227,44,.75));transition:stroke .18s,filter .18s;}",
    "#focus-splash .fs-lens.settled .fs-blade path{stroke:rgba(255,255,255,.16);transition:stroke .5s;}",
    "#focus-splash .fs-lens.settled .fs-ring-main{stroke:rgba(255,255,255,.28);filter:none;transition:stroke .5s,filter .5s;}",

    /* Wordmark dentro de la apertura: se enfoca en sincronía con las palas */
    "#focus-splash .fs-word{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-weight:700;color:#fff;font-size:clamp(1.5rem,7.2vmin,3rem);letter-spacing:.01em;filter:blur(14px);opacity:0;animation:fsWordHunt 1.95s cubic-bezier(.45,.05,.35,1) .35s both;}",
    "@keyframes fsWordHunt{",
      "0%{opacity:0;filter:blur(14px);}",
      "22%{opacity:1;filter:blur(2.5px);}",
      "38%{filter:blur(9px);}",
      "56%{filter:blur(1.5px);}",
      "70%{filter:blur(6px);}",
      "88%{filter:blur(.8px);}",
      "100%{opacity:1;filter:blur(0);}",
    "}",
    "#focus-splash.opening .fs-word{animation:fsWordOut .55s ease forwards;}",
    "@keyframes fsWordOut{to{transform:scale(1.15);opacity:0;}}",

    /* Indicador AF (esquinas) dentro de la apertura, parpadea al bloquear */
    "#focus-splash .fs-af{transform-box:view-box;transform-origin:100px 100px;opacity:0;}",
    "#focus-splash .fs-lens.locked .fs-af{animation:fsAfBlink .45s steps(1) both;}",
    "@keyframes fsAfBlink{0%{opacity:1;}30%{opacity:0;}55%{opacity:1;}100%{opacity:0;}}",

    /* Subtítulo bajo el objetivo (solo tras login / registro) */
    "#focus-splash .fs-sub{font-family:'Inter',sans-serif;font-weight:400;font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.55);opacity:0;transform:translateY(8px);animation:fsSubIn .55s ease 2.35s forwards;}",
    "@keyframes fsSubIn{to{opacity:1;transform:translateY(0);}}",

    /* Accesibilidad: sin animaciones -> fundido simple */
    "#focus-splash.simple *{animation:none!important;}",
    "#focus-splash.simple{transition:opacity .45s ease;}",
    "#focus-splash.simple.done{opacity:0;}"
  ].join("\n");

  var style = document.createElement("style");
  style.id = "focus-splash-style";
  style.textContent = css;
  document.head.appendChild(style);

  /* ============================ SVG ============================ */
  // viewBox 0..200, centro (100,100). Cada pala pivota en (178,100) y su
  // grupo está rotado i*45° alrededor del centro: 8 palas = iris real.
  function blades() {
    var out = "";
    for (var i = 0; i < 8; i++) {
      out +=
        '<g transform="rotate(' + (i * 45) + ' 100 100)">' +
          '<g class="fs-blade">' +
            '<path d="M178,100 L-120,100 L-120,300 L178,300 Z" ' +
                  'fill="#0E0D17" stroke="rgba(255,255,255,.16)" stroke-width="1.2"/>' +
          "</g>" +
        "</g>";
    }
    return out;
  }

  // Marcas del anillo de enfoque (escala de distancias)
  function ticks() {
    var out = "";
    for (var i = 0; i < 48; i++) {
      var a = i * 7.5, long = i % 4 === 0;
      out += '<line x1="100" y1="' + (long ? 6.5 : 8.5) + '" x2="100" y2="12" ' +
             'stroke="rgba(255,255,255,' + (long ? ".4" : ".18") + ')" stroke-width="' + (long ? 1.1 : .7) + '" ' +
             'transform="rotate(' + a + ' 100 100)"/>';
    }
    return out;
  }

  // Esquinas AF dentro de la apertura
  function afCorners() {
    var s = 12, o = 34, out = "", cs = [[-1,-1],[1,-1],[-1,1],[1,1]];
    for (var i = 0; i < 4; i++) {
      var dx = cs[i][0], dy = cs[i][1];
      var x = 100 + dx * o, y = 100 + dy * o;
      out += '<path d="M' + (x - dx * s) + "," + y + " L" + x + "," + y + " L" + x + "," + (y - dy * s) +
             '" fill="none" stroke="#57e32c" stroke-width="1.6"/>';
    }
    return out;
  }

  var svg =
    '<svg viewBox="0 0 200 200">' +
      /* barril del objetivo */
      '<circle cx="100" cy="100" r="97" fill="#07070E"/>' +
      '<circle cx="100" cy="100" r="97" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1"/>' +
      '<g class="fs-ticks">' + ticks() + "</g>" +
      '<circle class="fs-ring-main" cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.6"/>' +
      /* palas, recortadas al interior del objetivo */
      '<clipPath id="fsClip"><circle cx="100" cy="100" r="86"/></clipPath>' +
      '<g clip-path="url(#fsClip)">' +
        '<circle cx="100" cy="100" r="86" fill="#100F19"/>' + /* fondo visible por la apertura */
        blades() +
      "</g>" +
      '<g class="fs-af">' + afCorners() + "</g>" +
    "</svg>";

  /* ============================ DOM ============================ */
  var root = document.createElement("div");
  root.id = "focus-splash";
  root.setAttribute("role", "presentation");
  root.setAttribute("aria-hidden", "true");

  if (reduceMotion) {
    root.className = "simple";
    root.innerHTML =
      '<div style="font-family:Inter,sans-serif;font-weight:700;font-size:3rem;color:#fff;">Focus.</div>';
    document.body.prepend(root);
    setTimeout(function () {
      root.classList.add("done");
      setTimeout(function () { root.remove(); style.remove(); }, 500);
    }, 650);
    return;
  }

  root.innerHTML =
    '<div class="fs-lens">' + svg + '<div class="fs-word">Focus.</div></div>' +
    (subtitle ? '<div class="fs-sub">' + subtitle + "</div>" : "");

  document.body.prepend(root);

  var lens = root.querySelector(".fs-lens");

  /* ---- Timeline ---- */
  var LOCK_AT = 2300;                       // hunting termina en ~2.3s
  var OPEN_AT = subtitle ? 3250 : 2900;     // deja leer el saludo si lo hay

  setTimeout(function () { lens.classList.add("locked"); }, LOCK_AT);
  setTimeout(function () {
    lens.classList.remove("locked");
    lens.classList.add("settled");
  }, LOCK_AT + 480);

  setTimeout(function () { root.classList.add("opening"); }, OPEN_AT);
  setTimeout(function () { root.remove(); style.remove(); }, OPEN_AT + 900);
})();
