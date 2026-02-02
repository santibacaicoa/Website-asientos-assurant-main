// =============================================================================
// home.js - Hub post-login
// - Lee user desde localStorage (key: "user")
// - Detecta rol (SUPERVISOR/ADMIN vs EMPLEADO)
// - Permite elegir fecha y continuar a floors.html
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elWelcome = $("welcome");
  const elRoleBadge = $("roleBadge");
  const elDate = $("datePick");
  const elPrimary = $("btnPrimary");
  const elSecondary = $("btnSecondary");
  const elLogout = $("btnLogout");
  const elMsg = $("homeMsg");

  const safeJson = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const user = safeJson(localStorage.getItem("user"));
  if (!user?.id) {
    window.location.href = "/index.html";
    return;
  }

  const role = String(user.rol || "").toUpperCase();
  const isSupervisor = role === "SUPERVISOR" || role === "ADMIN";
  const mode = isSupervisor ? "supervisor" : "empleado";

  const todayISO = () => new Date().toISOString().slice(0, 10);

  // UI
  if (elWelcome) {
    const nombre = user.nombre ? String(user.nombre) : "";
    const apellido = user.apellido ? String(user.apellido) : "";
    elWelcome.textContent = `Hola ${nombre} ${apellido}`.trim();
  }

  if (elRoleBadge) {
    elRoleBadge.textContent = isSupervisor ? "Modo Supervisor" : "Modo Empleado";
  }

  if (elPrimary) {
    elPrimary.textContent = isSupervisor
      ? "Configurar pool de asientos"
      : "Elegir piso y reservar";
  }

  if (elSecondary) {
    elSecondary.textContent = isSupervisor ? "Ver pisos" : "Mis reservas";
  }

  // Fecha: default = hoy (o last usada)
  const lastFecha = localStorage.getItem("reserva.fecha");
  const initialFecha =
    lastFecha && /^\d{4}-\d{2}-\d{2}$/.test(lastFecha) ? lastFecha : todayISO();

  if (elDate) {
    elDate.value = initialFecha;
    elDate.addEventListener("change", () => {
      const v = String(elDate.value || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        localStorage.setItem("reserva.fecha", v);
      }
    });
  }

  const getFecha = () => {
    const v = elDate ? String(elDate.value || "") : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return todayISO();
  };

  const setMsg = (t) => {
    if (elMsg) elMsg.textContent = t || "";
  };

  const goFloors = () => {
    const fecha = getFecha();
    localStorage.setItem("reserva.fecha", fecha);
    window.location.href = `/floors.html?mode=${encodeURIComponent(
      mode
    )}&fecha=${encodeURIComponent(fecha)}`;
  };

  const goMisReservas = async () => {
    const fecha = getFecha();
    setMsg("Cargando tus reservas...");
    try {
      const r = await fetch(
        `/api/empleado/mis-reservas?empleado_id=${encodeURIComponent(
          user.id
        )}&fecha=${encodeURIComponent(fecha)}`
      );
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        setMsg(data?.error || "No se pudieron cargar tus reservas.");
        return;
      }

      const items = Array.isArray(data.reservas) ? data.reservas : [];
      if (!items.length) {
        setMsg("No tenés reservas para esa fecha.");
        return;
      }

      // Mensaje simple (home es solo hub). Más adelante lo hacemos UI lindo.
      const lines = items.slice(0, 6).map((x) => `• ${x.codigo} (piso ${x.piso_id})`);
      const extra = items.length > 6 ? `\n… y ${items.length - 6} más` : "";
      setMsg(`Reservas ${fecha}:\n${lines.join("\n")}${extra}`);
    } catch {
      setMsg("Error de red. Probá de nuevo.");
    }
  };

  // Actions
  elPrimary?.addEventListener("click", goFloors);

  elSecondary?.addEventListener("click", () => {
    if (isSupervisor) goFloors();
    else goMisReservas();
  });

  elLogout?.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/index.html";
  });
});
