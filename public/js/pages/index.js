(() => {
  // === CONFIG ===
  // Cambiá estos 2 valores según tu export:
  const TOTAL_FRAMES = 122; // cantidad total
  const FPS = 30;

  // Cambiá extensión si usás .png o .jpg en lugar de .webp
  const FRAME_EXT = "webp";
const FRAME_PATH = (i) => `/earth/frame_${String(i).padStart(4, "0")}.${FRAME_EXT}`;


  const canvas = document.getElementById("earthCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const authUI = document.getElementById("authUI");
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPass = document.getElementById("loginPass");
  const errorMsg = document.getElementById("errorMsg");

  const openRegister = document.getElementById("openRegister");
  const registerModal = document.getElementById("registerModal");
  const registerBackdrop = document.getElementById("registerBackdrop");
  const closeRegister = document.getElementById("closeRegister");
  const registerForm = document.getElementById("registerForm");
  const regNombre = document.getElementById("regNombre");
  const regApellido = document.getElementById("regApellido");
  const regEmail = document.getElementById("regEmail");
  const regPass = document.getElementById("regPass");
  const regSupervisorEmail = document.getElementById("regSupervisorEmail");
  const regError = document.getElementById("regError");

  let images = new Array(TOTAL_FRAMES);
  let playing = true;

  function setError(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function drawCover(img) {
    if (!img || !img.naturalWidth) return;

    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale, h = ih * scale;
    const x = (cw - w) / 2, y = (ch - h) / 2;

    ctx.drawImage(img, x, y, w, h);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preload() {
    // carga rápida inicial para arrancar sin esperar todo
    const critical = Math.min(12, TOTAL_FRAMES);
    for (let i = 1; i <= critical; i++) {
      images[i - 1] = await loadImage(FRAME_PATH(i));
    }
    // resto en background
    for (let i = critical + 1; i <= TOTAL_FRAMES; i++) {
      loadImage(FRAME_PATH(i)).then((img) => (images[i - 1] = img)).catch(() => {});
    }
  }

  function showAuth() {
    document.body.classList.add("ready");
    authUI.classList.remove("hidden");
    requestAnimationFrame(() => authUI.classList.add("visible"));
    setTimeout(() => loginEmail?.focus(), 150);
  }

  function stopOnLastFrame() {
    playing = false;
    showAuth();
  }

  function play() {
    resizeCanvas();
    const frameDuration = 1000 / FPS;
    let frameIndex = 0;
    let last = performance.now();

    function tick(now) {
      if (!playing) return;

      if (now - last >= frameDuration) {
        last = now;

        const img = images[frameIndex];
        if (img) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawCover(img);
        }

        frameIndex++;
        if (frameIndex >= TOTAL_FRAMES) {
          const lastImg = images[TOTAL_FRAMES - 1] || img;
          if (lastImg) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawCover(lastImg);
          }
          stopOnLastFrame();
          return;
        }
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function redrawLast() {
    resizeCanvas();
    const lastImg = images[TOTAL_FRAMES - 1];
    if (!playing && lastImg) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCover(lastImg);
    }
  }

  window.addEventListener("resize", redrawLast);

  // === AUTH ===
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(errorMsg, "");
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(loginEmail.value || "").trim(),
          password: String(loginPass.value || "")
        })
      });
      const data = await resp.json();
      if (!data.ok) return setError(errorMsg, data.error || "No se pudo iniciar sesión");

      localStorage.setItem("session.user", JSON.stringify(data.user));
      window.location.href = "/home.html";
    } catch {
      setError(errorMsg, "Error de red / servidor");
    }
  });

  function openReg() {
    setError(regError, "");
    registerModal.classList.remove("hidden");
    registerModal.setAttribute("aria-hidden", "false");
    setTimeout(() => regNombre?.focus(), 120);
  }
  function closeReg() {
    registerModal.classList.add("hidden");
    registerModal.setAttribute("aria-hidden", "true");
  }

  openRegister?.addEventListener("click", openReg);
  closeRegister?.addEventListener("click", closeReg);
  registerBackdrop?.addEventListener("click", closeReg);

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(regError, "");
    try {
      const supervisor_email = String(regSupervisorEmail.value || "").trim();
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: String(regNombre.value || "").trim(),
          apellido: String(regApellido.value || "").trim(),
          email: String(regEmail.value || "").trim(),
          password: String(regPass.value || ""),
          supervisor_email: supervisor_email ? supervisor_email : undefined
        })
      });
      const data = await resp.json();
      if (!data.ok) return setError(regError, data.error || "No se pudo registrar");

      localStorage.setItem("session.user", JSON.stringify(data.user));
      window.location.href = "/home.html";
    } catch {
      setError(regError, "Error de red / servidor");
    }
  });

  // === START ===
  (async () => {
    try {
      await preload();
      play();
    } catch (e) {
      console.warn("Falló la animación Earth:", e);
      showAuth();
    }
  })();
})();
