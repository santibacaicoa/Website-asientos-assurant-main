document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const floorMap = $("floorMap");
  const seatsLayer = $("seatsLayer");

  const btnMenu = $("btnMenu");
  const drawer = $("drawer");
  const drawerBackdrop = $("drawerBackdrop");
  const btnCloseMenu = $("btnCloseMenu");

  const datePick = $("datePick");
  const btnConfirm = $("btnConfirm");
  const btnClearSel = $("btnClearSel");
  const selCount = $("selCount");
  const btnBack = $("btnBack");
  const btnLogout = $("btnLogout");
  const sideMsg = $("sideMsg");
  const floorTitle = $("floorTitle");
  const modeBadge = $("modeBadge");

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
  const mode = modeParam === "supervisor" && isSupervisorRole ? "supervisor" : "empleado";

  const fecha = isISO(fechaParam)
    ? fechaParam
    : (localStorage.getItem("reserva.fecha") && isISO(localStorage.getItem("reserva.fecha")))
    ? localStorage.getItem("reserva.fecha")
    : todayISO();

  if (!/^(7|8|11|12)$/.test(piso)) {
    sideMsg.textContent = "Piso inválido.";
    return;
  }

  // ⚠️ Ajustá si tus nombres reales son distintos
  const FLOOR_BG = {
    "7": "/assets/images/piso7.png",
    "8": "/assets/images/piso8.jpg",
    "11": "/assets/images/piso11.png",
    "12": "/assets/images/piso12.png",
  };

  // Background del mapa (letterbox negro por CSS)
  const bg = FLOOR_BG[piso];
  if (bg) floorMap.style.backgroundImage = `url("${bg}")`;

  floorTitle.textContent = `Piso ${piso}`;
  document.title = `Piso ${piso}`;
  datePick.value = fecha;

  localStorage.setItem("reserva.fecha", fecha);
  localStorage.setItem("reserva.floor", piso);

  modeBadge.textContent =
    mode === "supervisor"
      ? "🛡️ Supervisor: habilitás asientos (pool)"
      : "👤 Empleado: solo elegís asientos del pool (verdes)";
  btnConfirm.textContent = mode === "supervisor" ? "Guardar pool" : "Confirmar reserva";

  const setMsg = (t) => (sideMsg.textContent = t || "");

  // Drawer helpers
  const openDrawer = () => {
    drawer.classList.add("is-open");
    drawerBackdrop.hidden = false;
  };
  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawerBackdrop.hidden = true;
  };

  btnMenu.addEventListener("click", openDrawer);
  btnCloseMenu.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  // Estado
  const seatEls = new Map(); // id -> button
  const allSeats = new Map(); // id -> seat
  let occupied = new Set(); // ids ocupados dentro del pool
  let enabledPool = new Set(); // ids habilitados por pool
  let selected = new Set(); // selección actual

  const setSelected = (id, on) => {
    if (on) {
      if (mode === "empleado") selected.clear(); // empleado solo 1
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
      const inPool = enabledPool.has(id);
      const isOcc = occupied.has(id);
      const isSel = selected.has(id);

      btn.classList.toggle("is-out", !inPool);
      btn.classList.toggle("is-pool", inPool);
      btn.classList.toggle("is-busy", inPool && isOcc);
      btn.classList.toggle("is-selected", isSel);

      if (mode === "empleado") {
        btn.disabled = !inPool || isOcc;
      } else {
        btn.disabled = false;
      }
    });
  };

  const renderSeats = () => {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    for (const [id, s] of allSeats.entries()) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-out";
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

  // API
  const fetchAllSeats = async () => {
    const r = await fetch(`/api/asientos?piso=${encodeURIComponent(piso)}`);
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando asientos");
    allSeats.clear();
    (data.asientos || []).forEach((s) => allSeats.set(String(s.id), s));
  };

  const fetchEmpleadoState = async () => {
    const r = await fetch(
      `/api/empleado/pool-status?empleado_id=${encodeURIComponent(user.id)}&piso=${encodeURIComponent(
        piso
      )}&fecha=${encodeURIComponent(datePick.value)}`
    );
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando pool");

    const seats = Array.isArray(data.asientos) ? data.asientos : [];
    enabledPool = new Set(seats.map((s) => String(s.id)));
    occupied = new Set(seats.filter((s) => !!s.ocupado).map((s) => String(s.id)));

    if (enabledPool.size === 0) setMsg("No hay asientos habilitados para esta fecha (pool no configurado).");
    else setMsg("");
  };

  const fetchSupervisorState = async () => {
    const r = await fetch(
      `/api/supervisor/pool?supervisor_id=${encodeURIComponent(user.id)}&piso=${encodeURIComponent(
        piso
      )}&fecha=${encodeURIComponent(datePick.value)}`
    );
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando pool");

    const ids = Array.isArray(data.asientos) ? data.asientos : [];
    enabledPool = new Set(ids.map((x) => String(x)));
    selected = new Set([...enabledPool]);
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

  // Actions
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
        if (!r.ok || !data?.ok) throw new Error(data?.error || "No se pudo guardar el pool");

        setMsg(`Pool guardado. Habilitados: ${data.habilitados || selected.size}`);
        await refresh();
        return;
      }

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
      if (!r.ok || !data?.ok) throw new Error(data?.error || "No se pudo reservar");

      setMsg("Reserva confirmada ✅");
      selected.clear();
      await refresh();

      // UX: abrir menú para ver confirmación en mobile
      openDrawer();
    } catch (e) {
      setMsg(e.message || "Error");
      openDrawer();
    } finally {
      updateSelectionUI();
      applySeatClasses();
    }
  });

  refresh().catch((e) => setMsg(e.message || "Error cargando"));
});
