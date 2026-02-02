document.addEventListener("DOMContentLoaded", () => {
  // ---------- Login ----------
  const loginForm = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const errorEl = document.getElementById("errorMsg");
  const btnLogin = document.getElementById("btnLogin");

  // ---------- Register ----------
  const registerModal = document.getElementById("registerModal");
  const openRegister = document.getElementById("openRegister");
  const closeRegisterBackdrop = document.getElementById("closeRegisterBackdrop");
  const closeRegisterBtn = document.getElementById("closeRegisterBtn");
  const switchToLogin = document.getElementById("switchToLogin");

  const registerForm = document.getElementById("registerForm");
  const regNombre = document.getElementById("regNombre");
  const regApellido = document.getElementById("regApellido");
  const regEmail = document.getElementById("regEmail");
  const regPassword = document.getElementById("regPassword");
  const regErrorEl = document.getElementById("regErrorMsg");
  const btnRegister = document.getElementById("btnRegister");

  const showError = (el, msg) => {
    el.textContent = msg || "";
    el.classList.toggle("show", Boolean(msg));
  };

  const setLoading = (btn, on, textOn, textOff) => {
    btn.disabled = on;
    btn.textContent = on ? textOn : textOff;
  };

  const openModal = () => {
    registerModal.hidden = false;
    showError(regErrorEl, "");
    setTimeout(() => regNombre?.focus(), 80);
  };

  const closeModal = () => {
    registerModal.hidden = true;
  };

  openRegister?.addEventListener("click", openModal);
  closeRegisterBackdrop?.addEventListener("click", closeModal);
  closeRegisterBtn?.addEventListener("click", closeModal);
  switchToLogin?.addEventListener("click", closeModal);

  //-----------forgot modal------------

  const forgotModal = document.getElementById("forgotModal");
const openForgot = document.getElementById("openForgot");
const closeForgotBackdrop = document.getElementById("closeForgotBackdrop");
const closeForgotBtn = document.getElementById("closeForgotBtn");
const forgotForm = document.getElementById("forgotForm");
const forgotEmail = document.getElementById("forgotEmail");
const forgotMsg = document.getElementById("forgotMsg");
const btnForgot = document.getElementById("btnForgot");

const openForgotModal = () => {
  forgotModal.hidden = false;
  forgotMsg.textContent = "";
  setTimeout(() => forgotEmail?.focus(), 80);
};
const closeForgotModal = () => (forgotModal.hidden = true);

openForgot?.addEventListener("click", openForgotModal);
closeForgotBackdrop?.addEventListener("click", closeForgotModal);
closeForgotBtn?.addEventListener("click", closeForgotModal);

forgotForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = String(forgotEmail.value || "").trim().toLowerCase();
  if (!email) return;

  btnForgot.disabled = true;
  btnForgot.textContent = "Enviando...";

  try {
    const r = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await r.json().catch(() => null);
    forgotMsg.textContent =
      data?.message || "Si el email existe, te enviamos un link para resetear.";
  } catch {
    forgotMsg.textContent = "Error de red. Probá de nuevo.";
  } finally {
    btnForgot.disabled = false;
    btnForgot.textContent = "Enviar link";
  }
});


  // ---------- LOGIN submit ----------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(errorEl, "");

    const email = String(emailEl.value || "").trim().toLowerCase();
    const password = String(passEl.value || "");

    if (!email || !password) {
      showError(errorEl, "Completá email y contraseña.");
      return;
    }

    setLoading(btnLogin, true, "Ingresando...", "Iniciar sesión");

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        showError(errorEl, data?.error || "No se pudo iniciar sesión.");
        setLoading(btnLogin, false, "", "Iniciar sesión");
        return;
      }

      localStorage.setItem("auth.user", JSON.stringify(data.user));
      window.location.href = "/home.html";
    } catch {
      showError(errorEl, "Error de red. Probá de nuevo.");
      setLoading(btnLogin, false, "", "Iniciar sesión");
    }
  });

  // ---------- REGISTER submit ----------
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(regErrorEl, "");

    const nombre = String(regNombre.value || "").trim();
    const apellido = String(regApellido.value || "").trim();
    const email = String(regEmail.value || "").trim().toLowerCase();
    const password = String(regPassword.value || "");

    if (!nombre || !apellido || !email || !password) {
      showError(regErrorEl, "Completá todos los campos.");
      return;
    }

    setLoading(btnRegister, true, "Creando...", "Crear cuenta");

    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        showError(regErrorEl, data?.error || "No se pudo registrar.");
        setLoading(btnRegister, false, "", "Crear cuenta");
        return;
      }

      // Auto-login: guardamos user y vamos a home
      localStorage.setItem("auth.user", JSON.stringify(data.user));
      window.location.href = "/home.html";
    } catch {
      showError(regErrorEl, "Error de red. Probá de nuevo.");
      setLoading(btnRegister, false, "", "Crear cuenta");
    }
  });

  // limpiar errors cuando escriben
  emailEl?.addEventListener("input", () => showError(errorEl, ""));
  passEl?.addEventListener("input", () => showError(errorEl, ""));
  regEmail?.addEventListener("input", () => showError(regErrorEl, ""));
  regPassword?.addEventListener("input", () => showError(regErrorEl, ""));
});
