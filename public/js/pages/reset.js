document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const pass = document.getElementById("newPass");
  const err = document.getElementById("resetError");
  const btn = document.getElementById("btnReset");

  const token = new URLSearchParams(location.search).get("token");

  const showError = (msg) => {
    err.textContent = msg || "";
    err.classList.toggle("show", Boolean(msg));
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");

    if (!token) {
      showError("Token inválido.");
      return;
    }

    const password = String(pass.value || "");
    if (password.length < 6) {
      showError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        showError(data?.error || "No se pudo resetear.");
        btn.disabled = false;
        btn.textContent = "Guardar";
        return;
      }

      // éxito
      window.location.href = "/index.html?reset=1";
    } catch {
      showError("Error de red. Probá de nuevo.");
      btn.disabled = false;
      btn.textContent = "Guardar";
    }
  });
});
