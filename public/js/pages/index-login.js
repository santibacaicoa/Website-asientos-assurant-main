document.addEventListener("DOMContentLoaded", () => {
  // ---------- Helpers ----------
  const show = (el) => el && el.removeAttribute("hidden");
  const hide = (el) => el && el.setAttribute("hidden", "");
  const byId = (id) => document.getElementById(id);

  const loginForm = byId("loginForm");
  const emailEl = byId("email");
  const passEl = byId("password");
  const btnLogin = byId("btnLogin");
  const errorMsg = byId("errorMsg");

  const registerModal = byId("registerModal");
  const openRegister = byId("openRegister");
  const closeRegisterBtn = byId("closeRegisterBtn");
  const closeRegisterBackdrop = byId("closeRegisterBackdrop");
  const switchToLogin = byId("switchToLogin");

  const registerForm = byId("registerForm");
  const regNombre = byId("regNombre");
  const regApellido = byId("regApellido");
  const regEmail = byId("regEmail");
  const regPassword = byId("regPassword");
  const regErrorMsg = byId("regErrorMsg");
  const btnRegister = byId("btnRegister");

  const forgotModal = byId("forgotModal");
  const openForgot = byId("openForgot");
  const closeForgotBtn = byId("closeForgotBtn");
  const closeForgotBackdrop = byId("closeForgotBackdrop");

  const forgotForm = byId("forgotForm");
  const forgotEmail = byId("forgotEmail");
  const forgotMsg = byId("forgotMsg");
  const btnForgot = byId("btnForgot");

  const setError = (el, msg) => {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("show", Boolean(msg));
  };

  const setInfo = (el, msg) => {
    if (!el) return;
    el.textContent = msg || "";
    // forgotMsg usa .info-msg (no tiene .show), así que no tocamos clases
  };

  // ---------- Modal controls ----------
  const openModal = (modalEl) => {
    if (!modalEl) return;
    modalEl.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeModal = (modalEl) => {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = "";
  };

  openRegister?.addEventListener("click", () => {
    setError(regErrorMsg, "");
    openModal(registerModal);
  });
  closeRegisterBtn?.addEventListener("click", () => closeModal(registerModal));
  closeRegisterBackdrop?.addEventListener("click", () =>
    closeModal(registerModal)
  );
  switchToLogin?.addEventListener("click", () => closeModal(registerModal));

  openForgot?.addEventListener("click", () => {
    setInfo(forgotMsg, "");
    openModal(forgotModal);
  });
  closeForgotBtn?.addEventListener("click", () => closeModal(forgotModal));
  closeForgotBackdrop?.addEventListener("click", () => closeModal(forgotModal));

  // ---------- Login ----------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(errorMsg, "");

    const email = String(emailEl?.value || "").trim();
    const password = String(passEl?.value || "");

    if (!email || !password) {
      setError(errorMsg, "Completá email y contraseña.");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        setError(
          errorMsg,
          data?.error || "No se pudo iniciar sesión. Revisá tus datos."
        );
        btnLogin.disabled = false;
        btnLogin.textContent = "Iniciar sesión";
        return;
      }

      // Guardar sesión mínima (si después querés JWT, se cambia)
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "/home.html";
    } catch {
      setError(errorMsg, "Error de red. Probá de nuevo.");
      btnLogin.disabled = false;
      btnLogin.textContent = "Iniciar sesión";
    }
  });

  // ---------- Register ----------
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(regErrorMsg, "");

    const nombre = String(regNombre?.value || "").trim();
    const apellido = String(regApellido?.value || "").trim();
    const email = String(regEmail?.value || "").trim();
    const password = String(regPassword?.value || "");

    if (!nombre || !apellido || !email || !password) {
      setError(regErrorMsg, "Completá todos los campos.");
      return;
    }
    if (password.length < 6) {
      setError(regErrorMsg, "La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    btnRegister.disabled = true;
    btnRegister.textContent = "Creando...";

    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        setError(regErrorMsg, data?.error || "No se pudo registrar.");
        btnRegister.disabled = false;
        btnRegister.textContent = "Crear cuenta";
        return;
      }

      // Éxito: backend pide verificación antes de login
      setError(
        regErrorMsg,
        data?.message ||
          "Cuenta creada. Revisá tu email para verificar antes de ingresar."
      );

      // Cerrar modal después de un toque
      setTimeout(() => {
        closeModal(registerModal);
        btnRegister.disabled = false;
        btnRegister.textContent = "Crear cuenta";
      }, 1200);
    } catch {
      setError(regErrorMsg, "Error de red. Probá de nuevo.");
      btnRegister.disabled = false;
      btnRegister.textContent = "Crear cuenta";
    }
  });

  // ---------- Forgot password ----------
  forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setInfo(forgotMsg, "");

    const email = String(forgotEmail?.value || "").trim();
    if (!email) {
      setInfo(forgotMsg, "Escribí tu email.");
      return;
    }

    btnForgot.disabled = true;
    btnForgot.textContent = "Enviando...";

    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        setInfo(
          forgotMsg,
          data?.error ||
            "No se pudo enviar. Si te da 404, revisá que estés corriendo el server actualizado."
        );
        btnForgot.disabled = false;
        btnForgot.textContent = "Enviar link";
        return;
      }

      // Por seguridad el backend responde igual exista o no exista el mail
      setInfo(
        forgotMsg,
        data?.message || "Listo. Si el email existe, te llegó un link de reseteo."
      );
      btnForgot.disabled = false;
      btnForgot.textContent = "Enviar link";
    } catch {
      setInfo(forgotMsg, "Error de red. Probá de nuevo.");
      btnForgot.disabled = false;
      btnForgot.textContent = "Enviar link";
    }
  });
});
