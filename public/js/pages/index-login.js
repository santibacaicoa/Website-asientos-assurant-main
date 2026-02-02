document.addEventListener("DOMContentLoaded", () => {
  // ---------- Helpers ----------
  const byId = (id) => document.getElementById(id);
  const show = (el) => el && el.removeAttribute("hidden");
  const hide = (el) => el && el.setAttribute("hidden", "");

  const setError = (el, msg) => {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("show", Boolean(msg));
  };

  const setInfo = (el, msg) => {
    if (!el) return;
    el.textContent = msg || "";
  };

  // ---------- Login elements ----------
  const loginForm = byId("loginForm");
  const emailEl = byId("email");
  const passEl = byId("password");
  const btnLogin = byId("btnLogin");
  const errorMsg = byId("errorMsg");

  const loginResendWrap = byId("loginResendWrap");
  const btnResendVerifyLogin = byId("btnResendVerifyLogin");
  const loginResendMsg = byId("loginResendMsg");

  // ---------- Register elements ----------
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

  const regResendWrap = byId("regResendWrap");
  const btnResendVerifyRegister = byId("btnResendVerifyRegister");
  const regResendMsg = byId("regResendMsg");

  // ---------- Forgot password elements ----------
  const forgotModal = byId("forgotModal");
  const openForgot = byId("openForgot");
  const closeForgotBtn = byId("closeForgotBtn");
  const closeForgotBackdrop = byId("closeForgotBackdrop");

  const forgotForm = byId("forgotForm");
  const forgotEmail = byId("forgotEmail");
  const forgotMsg = byId("forgotMsg");
  const btnForgot = byId("btnForgot");

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
    setInfo(regResendMsg, "");
    hide(regResendWrap);
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
  closeForgotBackdrop?.addEventListener("click", () =>
    closeModal(forgotModal)
  );

  // ---------- Util: resend verification ----------
  const resendVerification = async (email, btn, msgEl) => {
    const cleanEmail = String(email || "").trim();
    if (!cleanEmail) {
      setInfo(msgEl, "Escribí tu email primero.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent || "";
      btn.textContent = "Reenviando...";
    }
    setInfo(msgEl, "");

    try {
      const r = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        setInfo(msgEl, data?.error || "No se pudo reenviar. Probá de nuevo.");
      } else {
        setInfo(
          msgEl,
          data?.message ||
            "Listo. Si tu cuenta existe y todavía no está verificada, te reenviamos el email."
        );
      }
    } catch {
      setInfo(msgEl, "Error de red. Probá de nuevo.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || "Reenviar verificación";
      }
    }
  };

  btnResendVerifyLogin?.addEventListener("click", () =>
    resendVerification(emailEl?.value, btnResendVerifyLogin, loginResendMsg)
  );

  btnResendVerifyRegister?.addEventListener("click", () =>
    resendVerification(regEmail?.value, btnResendVerifyRegister, regResendMsg)
  );

  // ---------- Flag "verified=1" (vuelve desde /api/auth/verify-email) ----------
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setInfo(loginResendMsg, "✅ Email verificado. Ya podés iniciar sesión.");
      hide(loginResendWrap);
    }
  } catch {
    // nada
  }

  // ---------- Login ----------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    setError(errorMsg, "");
    setInfo(loginResendMsg, "");
    hide(loginResendWrap);

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
        const msg = data?.error || "No se pudo iniciar sesión. Revisá tus datos.";
        setError(errorMsg, msg);

        // Si el backend bloquea por no verificación, mostramos "Reenviar verificación"
        const isVerifyBlock =
          r.status === 403 && /verific/i.test(String(msg || ""));
        if (isVerifyBlock) {
          show(loginResendWrap);
        }

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
    setInfo(regResendMsg, "");
    hide(regResendWrap);

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

      // Mostramos el botón para reenviar por si no les llega
      show(regResendWrap);
      setInfo(regResendMsg, "¿No te llegó? Podés reenviar el mail de verificación.");

      btnRegister.disabled = false;
      btnRegister.textContent = "Crear cuenta";
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
