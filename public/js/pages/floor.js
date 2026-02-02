// =============================================================================
// floor.js - Vista única para todos los pisos
// URL: /floor.html?piso=8&fecha=YYYY-MM-DD&mode=empleado|supervisor
// - empleado: muestra asientos (libre/ocupado) y permite reservar (1 asiento)
// - supervisor/admin: permite habilitar pool de asientos para una fecha
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const seatsLayer = $("seatsLayer");
  const datePick = $("datePick");
  const btnConfirm = $("btnConfirm");
  const btnClearSel = $("btnClearSel");
  const selCount = $("selCount");
  const btnBack = $("btnBack");
  const btnLogout = $("btnLogout");
  const sideMsg = $("sideMsg");
  const floorTitle = $("floorTitle");
  const modeBadge = $("modeBadge");
  const floorBg = $("floorBg");
  const legendEmpleado = $("legendEmpleado");

  if (
    !seatsLayer ||
    !datePick ||
    !btnConfirm ||
    !btnClearSel ||
    !selCount ||
    !btnBack ||
    !btnLogout ||
    !sideMsg ||
    !floorTitle ||
    !modeBadge ||
    !floorBg
  ) {
    console.warn("[floor] faltan elementos en HTML");
    return;
  }

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

  const params = new URLSearchParams(window.location.search);
  const piso = String(params.get("piso") || "").trim();
  const fechaParam = String(params.get("fecha") || "").trim();
  const modeParam = String(params.get("mode") || "").trim().toLowerCase();

  const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const role = String(user.rol || "").toUpperCase();
  const isSupervisorRole = role === "SUPERVISOR" || role === "ADMIN";

  // mode final (no confiamos 100% en la URL)
  const mode =
    modeParam === "supervisor" && isSupervisorRole ? "supervisor" : "empleado";

  const fecha = isISO(fechaParam)
    ? fechaParam
    : localStorage.getItem("reserva.fecha") && isISO(localStorage.getItem("reserva.fecha"))
    ? localStorage.getItem("reserva.fecha")
    : todayISO();

  if (!/^(7|8|11|12)$/.test(piso)) {
    sideMsg.textContent = "Piso inválido.";
    btnConfirm.disabled = true;
    return;
  }

  // Config de imágenes por piso
const FLOOR_BG = {
  "7": "/assets/images/piso7.png",
  "8": "/assets/images/piso8.jpg",
  "11": "/assets/images/piso11.png",
  "12": "/assets/images/piso12.png",
};


  floorTitle.textContent = `Piso ${piso}`;
  document.title = `Piso ${piso}`;
  datePick.value = fecha;
  localStorage.setItem("reserva.fecha", fecha);
  localStorage.setItem("reserva.floor", piso);

  const bg = FLOOR_BG[piso];
  if (bg) {
    floorBg.src = bg;
    floorBg.alt = `Plano piso ${piso}`;
  } else {
    floorBg.removeAttribute("src");
    floorBg.alt = "";
  }

  // UI por modo
  if (mode === "supervisor") {
    modeBadge.textContent = "🛡️ Modo Supervisor: habilitás asientos (pool)";
    modeBadge.classList.remove("is-hidden");
    btnConfirm.textContent = "Guardar pool";
    legendEmpleado?.classList.add("is-hidden");
  } else {
    modeBadge.textContent = "👤 Modo Empleado: reservá un asiento";
    modeBadge.classList.remove("is-hidden");
    btnConfirm.textContent = "Confirmar reserva";
  }

  const setMsg = (t) => (sideMsg.textContent = t || "");

  // Estado
  const seatEls = new Map();
  const allSeats = new Map(); // id -> seat
  let occupied = new Set();
  let enabledPool = new Set();
  let selected = new Set();

  const setSelected = (id, on) => {
    if (on) {
      if (mode === "empleado") selected.clear(); // empleado elige 1
      selected.add(id);
    } else {
      selected.delete(id);
    }
  };

  const updateSelectionUI = () => {
    selCount.textContent = String(selected.size);
    const has = selected.size > 0;
    btnConfirm.disabled = !has;
    btnClearSel.disabled = !has;
  };

  const applySeatClasses = () => {
    seatEls.forEach((btn, id) => {
      const isOcc = occupied.has(id);
      const isSel = selected.has(id);
      const isEnabled = enabledPool.has(id);

      btn.classList.toggle("is-busy", isOcc);
      btn.classList.toggle("is-free", !isOcc);
      btn.classList.toggle("is-selected", isSel);

      if (mode === "empleado") {
        // empleado: ocupados deshabilitados y si no está habilitado por pool también
        btn.disabled = isOcc || !isEnabled;
        btn.classList.toggle("is-disabled", btn.disabled);
      } else {
        // supervisor: puede seleccionar cualquiera
        btn.disabled = false;
        btn.classList.remove("is-disabled");
      }
    });
  };

  const renderSeats = () => {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    if (!FLOOR_BG[piso]) {
      setMsg("Este piso todavía está en preparación.");
      return;
    }

    for (const [id, s] of allSeats.entries()) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = `${Number(s.x)}%`;
      b.style.top = `${Number(s.y)}%`;

      const r = Number(s.radio || 0);
      if (r > 0) {
        const d = Math.max(10, Math.min(30, r));
        b.style.width = `${d}px`;
        b.style.height = `${d}px`;
      }

      b.dataset.seatId = id;
      b.title = s.codigo || id;

      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (mode === "empleado" && b.disabled) return;

        if (selected.has(id)) setSelected(id, false);
        else setSelected(id, true);

        updateSelectionUI();
        applySeatClasses();
      });

      seatsLayer.appendChild(b);
      seatEls.set(id, b);
    }

    updateSelectionUI();
    applySeatClasses();
  };

  // API calls
  const fetchAllSeats = async () => {
    const r = await fetch(`/api/asientos?piso=${encodeURIComponent(piso)}`);
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando asientos");

    allSeats.clear();
    (data.asientos || []).forEach((s) => {
      allSeats.set(String(s.id), s);
    });
  };

  const fetchEmpleadoState = async () => {
    const rPool = await fetch(
      `/api/empleado/pool-status?empleado_id=${encodeURIComponent(
        user.id
      )}&piso=${encodeURIComponent(piso)}&fecha=${encodeURIComponent(datePick.value)}`
    );
    const data = await rPool.json().catch(() => null);
    if (!rPool.ok || !data?.ok) throw new Error(data?.error || "Error cargando pool");

    const seats = Array.isArray(data.asientos) ? data.asientos : [];

    enabledPool = new Set(seats.map((s) => String(s.id)));
    occupied = new Set(seats.filter((s) => !!s.ocupado).map((s) => String(s.id)));

    if (enabledPool.size === 0) setMsg("No hay asientos habilitados para esta fecha (pool vacío o no configurado).");
    else setMsg("");
  };

  const fetchSupervisorState = async () => {
    const r = await fetch(
      `/api/supervisor/pool?supervisor_id=${encodeURIComponent(
        user.id
      )}&piso=${encodeURIComponent(piso)}&fecha=${encodeURIComponent(datePick.value)}`
    );
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando pool");

    const ids = Array.isArray(data.asientos) ? data.asientos : [];
    enabledPool = new Set(ids.map((x) => String(x)));
    selected = new Set([...enabledPool]);
    setMsg("");
  };

  const refresh = async () => {
    setMsg("Cargando...");
    btnConfirm.disabled = true;
    btnClearSel.disabled = true;

    await fetchAllSeats();
    if (mode === "supervisor") await fetchSupervisorState();
    else await fetchEmpleadoState();

    renderSeats();
    updateSelectionUI();
    applySeatClasses();
  };

  // Acciones
  btnClearSel.addEventListener("click", () => {
    selected.clear();
    updateSelectionUI();
    applySeatClasses();
  });

  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/index.html";
  });

  btnBack.addEventListener("click", () => {
    const f = encodeURIComponent(datePick.value);
    window.location.href = `/floors.html?mode=${encodeURIComponent(mode)}&fecha=${f}`;
  });

  datePick.addEventListener("change", () => {
    const v = String(datePick.value || "");
    if (isISO(v)) {
      localStorage.setItem("reserva.fecha", v);
      refresh().catch((e) => setMsg(e.message || "Error"));
    }
  });

  btnConfirm.addEventListener("click", async () => {
    if (selected.size === 0) return;

    btnConfirm.disabled = true;
    setMsg(mode === "supervisor" ? "Guardando pool..." : "Reservando...");

    try {
      if (mode === "supervisor") {
        const payload = {
          supervisor_id: user.id,
          piso: Number(piso),
          fecha: datePick.value,
          asiento_ids: [...selected],
        };

        const r = await fetch("/api/supervisor/pools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.ok)
          throw new Error(data?.error || "No se pudo guardar el pool");

        setMsg(`Pool guardado. Habilitados: ${data.habilitados || selected.size}`);
        await refresh();
        return;
      }

      // empleado: reservar 1 asiento
      const seatId = [...selected][0];
      const r = await fetch("/api/empleado/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: user.id,
          asiento_id: seatId,
          fecha: datePick.value,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok)
        throw new Error(data?.error || "No se pudo reservar");

      setMsg("Reserva confirmada ✅");
      selected.clear();
      await refresh();
    } catch (e) {
      setMsg(e.message || "Error");
    } finally {
      updateSelectionUI();
      applySeatClasses();
    }
  });

  refresh().catch((e) => setMsg(e.message || "Error cargando"));
});
