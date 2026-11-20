(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- sonido (sintetizado, sin archivos) ---------------- */
  let actx = null;
  let muted = false;
  const tone = (freq, start, dur, type = "sine", vol = 0.12) => {
    if (muted) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + start;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const sfx = {
    pop: () => { tone(880, 0, 0.12, "triangle", 0.1); tone(1320, 0.05, 0.1, "sine", 0.06); },
    yes: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.11)),
    dodge: () => { tone(520, 0, 0.07, "square", 0.035); tone(940, 0.05, 0.09, "square", 0.03); },
  };
  $("#mute").addEventListener("click", () => {
    muted = !muted;
    $("#mute").textContent = muted ? "🔇" : "🔊";
    $("#mute").setAttribute("aria-label", muted ? "Activar sonidos" : "Silenciar sonidos");
  });

  /* ---------------- elementos flotantes de fondo ---------------- */
  const floaters = $("#floaters");
  const icons = ["💗", "🎀", "⭐", "🌸", "💕", "🍓", "✨", "💜"];
  const spawnFloater = (set = icons) => {
    const el = document.createElement("span");
    el.className = "floater";
    el.textContent = set[Math.floor(Math.random() * set.length)];
    el.style.left = Math.random() * 100 + "vw";
    el.style.setProperty("--s", 16 + Math.random() * 22 + "px");
    el.style.setProperty("--t", 10 + Math.random() * 10 + "s");
    el.style.setProperty("--x", (Math.random() * 120 - 60) + "px");
    floaters.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  };
  if (!reduced) {
    for (let i = 0; i < 10; i++) setTimeout(spawnFloater, i * 500);
    setInterval(() => spawnFloater(), 1100);
  }

  /* ---------------- partículas (canvas) ---------------- */
  const cvs = $("#fx");
  const ctx = cvs.getContext("2d");
  let parts = [];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = innerWidth * dpr;
    cvs.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const burst = (x, y, n = 14, set = ["💗", "💖", "✨", "🎀"], power = 6) => {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random());
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - power * 0.5,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        size: 14 + Math.random() * 18,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.2,
        ch: set[Math.floor(Math.random() * set.length)],
      });
    }
  };
  const loop = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.16; p.vx *= 0.99;
      p.rot += p.vr; p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.ch, 0, 0);
      ctx.restore();
    }
    requestAnimationFrame(loop);
  };
  loop();

  /* estela de corazones con el cursor */
  let lastTrail = 0;
  addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - lastTrail < 70 || reduced) return;
    lastTrail = now;
    parts.push({
      x: e.clientX, y: e.clientY,
      vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random(),
      life: 0.9, decay: 0.03, size: 10 + Math.random() * 8,
      rot: 0, vr: 0, ch: Math.random() > 0.5 ? "✨" : "💗",
    });
  });

  /* click en cualquier parte: chispitas */
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    burst(e.clientX, e.clientY, 7, ["✨", "⭐", "💗"], 4);
  });

  /* ---------------- personajes interactivos ---------------- */
  const bubble = (x, y, text) => {
    const b = document.createElement("div");
    b.className = "bubble";
    b.textContent = text;
    b.style.left = x + "px";
    b.style.top = y + "px";
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 2600);
  };

  $$(".char").forEach((c) => {
    c.addEventListener("click", () => {
      const r = c.getBoundingClientRect();
      c.classList.remove("boing");
      void c.offsetWidth;
      c.classList.add("boing");
      bubble(Math.min(Math.max(r.left + r.width / 2, 80), innerWidth - 80), Math.max(r.top - 6, 50), c.dataset.say);
      burst(r.left + r.width / 2, r.top + r.height / 2, 10);
      sfx.pop();
    });
  });

  /* ---------------- pregunta: Sí / No ---------------- */
  const states = { ask: $("#ask"), yes: $("#yesState") };
  const show = (key) => {
    Object.values(states).forEach((s) => s.classList.remove("is-active"));
    states[key].classList.add("is-active");
    document.body.classList.toggle("celebrate", key === "yes");
    const focusTarget = states[key].querySelector("button");
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
  };

  const yesBtn = $("#yes");
  const noBtn = $("#no");

  yesBtn.addEventListener("mouseenter", () => document.body.classList.add("yes-hover"));
  yesBtn.addEventListener("mouseleave", () => document.body.classList.remove("yes-hover"));

  let rain = null;
  const stopRain = () => { clearInterval(rain); rain = null; };

  const doYes = () => {
    document.body.classList.remove("yes-hover");
    closeModal();
    noBtn.hidden = true;
    show("yes");
    sfx.yes();
    const r = $("#card").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    burst(cx, cy, 60, ["💗", "💖", "💕", "🎀", "✨", "⭐", "🍓"], 11);
    setTimeout(() => burst(innerWidth * 0.2, innerHeight * 0.3, 30, undefined, 8), 250);
    setTimeout(() => burst(innerWidth * 0.8, innerHeight * 0.3, 30, undefined, 8), 450);
    stopRain();
    if (!reduced) rain = setInterval(() => spawnFloater(["💗", "💖", "💕", "🎀"]), 160);
    setTimeout(stopRain, 6000);
  };
  yesBtn.addEventListener("click", doYes);

  /* ---------------- el "No" troll: varias trampas y al final se escapa ---------------- */
  const hero = $("#hero");
  const sub = $("#sub");
  const modal = $("#modal");
  const HERO_SRC = hero.getAttribute("src");
  const HERO_ALT = hero.getAttribute("alt");
  const SUB_TXT = sub.textContent;
  let stage = 0;
  let busy = false;
  let disguiseTimer = null;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const setSub = (t) => { sub.textContent = t; sub.classList.remove("pop-in"); void sub.offsetWidth; sub.classList.add("pop-in"); };
  const setNo = (t) => { noBtn.textContent = t; noBtn.classList.toggle("long", [...t].length > 8); };
  const grow = (g) => yesBtn.style.setProperty("--grow", g.toFixed(2));
  const sayAt = (sel, text) => {
    const c = $(sel);
    const r = c && c.getBoundingClientRect();
    if (r && r.width) bubble(Math.min(Math.max(r.left + r.width / 2, 110), innerWidth - 110), Math.max(r.top - 6, 50), text);
  };
  const shake = (el) => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };

  function closeModal() { modal.hidden = true; }

  const tricks = [
    // 1. drama: cambia el personaje
    () => {
      hero.src = "assets/kuromi_duda.png";
      hero.alt = "Kuromi confundida";
      hero.classList.remove("pop-in"); void hero.offsetWidth; hero.classList.add("pop-in");
      setSub("Kuromi no entendió tu respuesta 🤔");
      setNo("¿De verdad? 🥺");
    },
    // 2. se cambian de lugar
    () => {
      noBtn.style.order = "-1";
      [yesBtn, noBtn].forEach((b) => { b.classList.remove("swap"); void b.offsetWidth; b.classList.add("swap"); });
      setSub("Ups… se cambiaron de lugar 🙃");
      setNo("¿Y si lo piensas?");
    },
    // 3. cargando… error
    () => {
      busy = true;
      noBtn.classList.add("loading");
      setNo("Cargando");
      setSub("Procesando tu respuesta… ⏳");
      later(() => {
        noBtn.classList.remove("loading");
        setNo("Error 💥");
        shake(noBtn);
        sfx.dodge();
        setSub("Ese botón está fallando, prueba el otro 🛠️");
        busy = false;
      }, 1700);
    },
    // 4. coro de personajes
    () => {
      const lines = [[".c-tl", "¡Nooo! 😭"], [".c-tr", "¡Mi flecha falló! 💔"], [".c-ml", "¿Por quéee? 🥺"], [".c-mr", "¡Así no se vale! 😤"], [".c-bl", "Se me cayó el helado 🍦"], [".c-br", "¡Nooo! 🍓"], [".c-bc", "Miau… 😿"]];
      lines.forEach(([s, t], i) => later(() => sayAt(s, t), i * 120));
      document.body.classList.add("panic");
      later(() => document.body.classList.remove("panic"), 1600);
      setSub("Mira lo que hiciste 😢");
      setNo("¿100% en serio?");
    },
    // 5. diálogo de súplica
    () => {
      modal.hidden = false;
      setTimeout(() => $("#modalYes").focus({ preventScroll: true }), 50);
      setSub("My Melody quiere hablar contigo 🙏");
      setNo("No…");
    },
    // 6. disfraz: el No se viste de Sí por 3 segundos
    () => {
      noBtn.classList.add("disguised");
      setNo("Sí 💖");
      setSub("Ahora los dos dicen Sí 😇");
      clearTimeout(disguiseTimer);
      disguiseTimer = setTimeout(() => {
        noBtn.classList.remove("disguised");
        setNo("Bueno… no");
        setSub("Está bien, te queda un último intento 😒");
      }, 3000);
    },
    // 7. sin fuerzas
    () => {
      noBtn.classList.add("tiny");
      setNo("no");
      setSub("El No se está quedando sin fuerzas 🥀");
    },
    // 8. final: modo escapista
    () => {
      noBtn.classList.remove("tiny");
      setSub("Ahora atrápalo si puedes 😈");
      sayAt(".c-mr", "Jijiji 😈 no te dejo");
      startRunaway();
    },
  ];

  const nextTrick = () => {
    if (busy) return;
    const fn = tricks[stage];
    stage++;
    grow(1 + stage * 0.06);
    sfx.dodge();
    fn();
  };

  $("#modalYes").addEventListener("click", doYes);
  $("#modalNo").addEventListener("click", () => {
    closeModal();
    setSub("My Melody se fue llorando 😭");
    noBtn.focus({ preventScroll: true });
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) $("#modalNo").click(); });

  /* ----- etapa final: se escapa y nunca se deja presionar ----- */
  const noPhrases = [
    "¿En serio? 🥺", "Piénsalo bien", "¡Atrápame! 😜", "Nop, por aquí no",
    "Error 404: No no encontrado", "Kuromi no te deja 😈", "Casi… 🤏", "Mejor presiona Sí 💖",
    "¡Muy lento! 🐢", "Eso no es una opción", "Inténtalo otra vez 😏", "Te estás cansando 💦",
  ];
  const trollQuotes = [
    [".c-mr", "Jijiji 😈 no te dejo"],
    [".c-tr", "¡El Sí es más bonito! 💘"],
    [".c-ml", "Presiona el Sí 🙏"],
    [".c-br", "¡Jajaja, se escapó! 🍓"],
    [".c-bl", "Ese botón no sirve 🍮"],
  ];
  let tries = 0;
  let lastDodge = 0;
  let runaway = false;
  let pointer = { x: -999, y: -999 };

  function startRunaway() {
    runaway = true;
    lastDodge = 0;
    noBtn.classList.remove("swap", "shake", "tiny", "disguised", "loading");
    dodge();
  }

  function dodge() {
    const now = performance.now();
    if (now - lastDodge < 180) return;
    lastDodge = now;
    tries++;

    // la primera vez se "despega" de su lugar sin saltar visualmente
    if (!noBtn.classList.contains("runaway")) {
      const r0 = noBtn.getBoundingClientRect();
      noBtn.style.left = r0.left + "px";
      noBtn.style.top = r0.top + "px";
      noBtn.classList.add("runaway");
      document.body.appendChild(noBtn); // fuera de la tarjeta para moverse por toda la pantalla
      void noBtn.offsetWidth;
    }

    noBtn.textContent = noPhrases[(tries - 1) % noPhrases.length];
    noBtn.style.setProperty("--s", Math.max(0.62, 1 - tries * 0.04).toFixed(2));
    grow(Math.min(1.9, 1 + stage * 0.06 + tries * 0.05));

    // nueva posición: lejos del cursor y sin tapar el "Sí"
    const w = noBtn.offsetWidth, h = noBtn.offsetHeight, pad = 16;
    const yr = yesBtn.getBoundingClientRect();
    let best = null, bestScore = -1;
    for (let i = 0; i < 30; i++) {
      const x = pad + Math.random() * (innerWidth - w - pad * 2);
      const y = pad + Math.random() * (innerHeight - h - pad * 2);
      const overlapsYes = x < yr.right + 20 && x + w > yr.left - 20 && y < yr.bottom + 20 && y + h > yr.top - 20;
      if (overlapsYes) continue;
      const d = Math.hypot(x + w / 2 - pointer.x, y + h / 2 - pointer.y);
      if (d > bestScore) { bestScore = d; best = { x, y }; }
    }
    if (best) {
      noBtn.style.left = best.x + "px";
      noBtn.style.top = best.y + "px";
    }

    sfx.dodge();
    if (tries % 3 === 0) {
      const [sel, text] = trollQuotes[(tries / 3 - 1) % trollQuotes.length];
      sayAt(sel, text);
    }
  }

  // modo escapista: huye cuando el cursor se acerca
  addEventListener("pointermove", (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!runaway || !states.ask.classList.contains("is-active")) return;
    const r = noBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < Math.max(r.width, r.height) / 2 + 60) dodge();
  });
  // en celular (toque): en modo escapista se va antes de que el toque cuente
  noBtn.addEventListener("pointerdown", (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!runaway) return;
    e.preventDefault();
    dodge();
  });
  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (noBtn.classList.contains("disguised")) return doYes(); // cayó en el disfraz 😇
    if (runaway) { lastDodge = 0; return dodge(); }
    nextTrick();
  });

  const resetNo = () => {
    timers.splice(0).forEach(clearTimeout);
    clearTimeout(disguiseTimer);
    closeModal();
    stage = 0;
    tries = 0;
    busy = false;
    runaway = false;
    noBtn.className = "btn btn-no";
    noBtn.style.cssText = "";
    yesBtn.style.removeProperty("--grow");
    noBtn.textContent = "No";
    noBtn.hidden = false;
    yesBtn.after(noBtn); // vuelve a su lugar junto al "Sí"
    hero.src = HERO_SRC;
    hero.alt = HERO_ALT;
    sub.textContent = SUB_TXT;
  };

  $$("[data-back]").forEach((b) =>
    b.addEventListener("click", () => {
      stopRain();
      resetNo();
      show("ask");
      sfx.pop();
    })
  );
})();
