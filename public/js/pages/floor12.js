// floor12.js (cine-style reservar y confirmar + modo cancelar)
(() => {
  const seatsLayer = document.getElementById("seatsLayer");
  const floorMap = document.getElementById("floorMap");
  const datePick = document.getElementById("datePick");
  const btnBackHome = document.getElementById("btnBackHome");
  const sideMsg = document.getElementById("sideMsg");

  const btnConfirm = document.getElementById("btnConfirm");
  const btnClearSel = document.getElementById("btnClearSel");
  const selCount = document.getElementById("selCount");

  const btnToggleCancel = document.getElementById("btnToggleCancel");
  const btnConfirmCancel = document.getElementById("btnConfirmCancel");
  const btnClearCancel = document.getElementById("btnClearCancel");

  const editHint = document.getElementById("editHint");
  const editCursor = document.getElementById("editCursor");

  if (!seatsLayer || !floorMap || !datePick || !btnBackHome || !sideMsg) {
    console.warn("[floor12] faltan elementos en HTML");
    return;
  }

  // ==========================
  // Asientos Piso 12 (82)
  // ==========================
  const SEATS_12 = [
    { id: "12-01", x: 1.8, y: 25.3 },
    { id: "12-02", x: 5.6, y: 25.3 },
    { id: "12-03", x: 10.2, y: 25.2 },
    { id: "12-04", x: 14.9, y: 25.2 },
    { id: "12-05", x: 19.0, y: 25.2 },
    { id: "12-06", x: 1.7, y: 30.3 },
    { id: "12-07", x: 5.6, y: 30.5 },
    { id: "12-08", x: 10.2, y: 30.5 },
    { id: "12-09", x: 14.9, y: 30.5 },
    { id: "12-10", x: 19.1, y: 30.5 },
    { id: "12-11", x: 1.6, y: 42.4 },
    { id: "12-12", x: 5.6, y: 42.4 },
    { id: "12-13", x: 10.3, y: 42.1 },
    { id: "12-14", x: 14.8, y: 42.0 },
    { id: "12-15", x: 19.1, y: 42.4 },
    { id: "12-16", x: 1.7, y: 47.8 },
    { id: "12-17", x: 5.6, y: 47.8 },
    { id: "12-18", x: 10.3, y: 47.6 },
    { id: "12-19", x: 14.8, y: 47.4 },
    { id: "12-20", x: 19.0, y: 47.4 },
    { id: "12-21", x: 26.9, y: 64.2 },
    { id: "12-22", x: 31.1, y: 64.0 },
    { id: "12-23", x: 35.6, y: 64.2 },
    { id: "12-24", x: 40.3, y: 64.4 },
    { id: "12-25", x: 44.5, y: 64.0 },
    { id: "12-26", x: 27.0, y: 69.0 },
    { id: "12-27", x: 31.0, y: 69.3 },
    { id: "12-28", x: 35.4, y: 69.3 },
    { id: "12-29", x: 40.4, y: 69.4 },
    { id: "12-30", x: 44.5, y: 69.4 },
    { id: "12-31", x: 26.7, y: 81.1 },
    { id: "12-32", x: 31.0, y: 80.9 },
    { id: "12-33", x: 35.6, y: 81.1 },
    { id: "12-34", x: 40.2, y: 81.1 },
    { id: "12-35", x: 44.6, y: 80.9 },
    { id: "12-36", x: 27.0, y: 86.4 },
    { id: "12-37", x: 31.1, y: 86.4 },
    { id: "12-38", x: 35.6, y: 86.5 },
    { id: "12-39", x: 40.3, y: 86.4 },
    { id: "12-40", x: 44.6, y: 86.4 },
    { id: "12-41", x: 55.0, y: 64.5 },
    { id: "12-42", x: 59.6, y: 64.4 },
    { id: "12-43", x: 64.5, y: 64.2 },
    { id: "12-44", x: 68.8, y: 64.2 },
    { id: "12-45", x: 73.0, y: 64.4 },
    { id: "12-46", x: 55.0, y: 69.4 },
    { id: "12-47", x: 59.4, y: 69.7 },
    { id: "12-48", x: 64.3, y: 69.7 },
    { id: "12-49", x: 68.9, y: 69.3 },
    { id: "12-50", x: 72.9, y: 69.4 },
    { id: "12-51", x: 55.2, y: 80.9 },
    { id: "12-52", x: 59.6, y: 80.8 },
    { id: "12-53", x: 64.5, y: 80.7 },
    { id: "12-54", x: 68.9, y: 80.8 },
    { id: "12-55", x: 72.9, y: 80.9 },
    { id: "12-56", x: 55.0, y: 86.2 },
    { id: "12-57", x: 59.6, y: 86.0 },
    { id: "12-58", x: 64.6, y: 86.0 },
    { id: "12-59", x: 68.9, y: 86.2 },
    { id: "12-60", x: 72.8, y: 86.0 },
    { id: "12-61", x: 80.0, y: 47.8 },
    { id: "12-62", x: 84.5, y: 47.8 },
    { id: "12-63", x: 89.2, y: 47.8 },
    { id: "12-64", x: 93.8, y: 47.3 },
    { id: "12-65", x: 80.0, y: 52.5 },
    { id: "12-66", x: 84.5, y: 52.6 },
    { id: "12-67", x: 89.4, y: 52.3 },
    { id: "12-68", x: 93.7, y: 52.3 },
    { id: "12-69", x: 79.7, y: 30.5 },
    { id: "12-70", x: 84.4, y: 30.6 },
    { id: "12-71", x: 89.0, y: 30.7 },
    { id: "12-72", x: 93.7, y: 30.7 },
    { id: "12-73", x: 79.5, y: 35.8 },
    { id: "12-74", x: 84.8, y: 35.8 },
    { id: "12-75", x: 89.3, y: 36.0 },
    { id: "12-76", x: 93.7, y: 35.5 },
    { id: "12-77", x: 86.0, y: 8.6 },
    { id: "12-78", x: 89.2, y: 8.6 },
    { id: "12-79", x: 86.0, y: 14.3 },
    { id: "12-80", x: 89.4, y: 14.3 },
    { id: "12-81", x: 86.0, y: 19.0 },
    { id: "12-82", x: 89.4, y: 19.0 },
  ];

  // Helpers UI
  const setMsg = (t) => (sideMsg.textContent = t || "");
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function getReservaTipo() {
    const raw = localStorage.getItem("reserva.tipo");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return raw;
    }
  }

  function getSessionUser() {
    try {
      return JSON.parse(localStorage.getItem("session.user") || "null");
    } catch {
      return null;
    }
  }

  function isCancelMode() {
    const v1 = localStorage.getItem("modo.quitar");
    const v2 = localStorage.getItem("admin.modo");
    const v3 = localStorage.getItem("asientos.modo");
    return v1 === "1" || v1 === "true" || v2 === "quitar" || v3 === "cancelar";
  }

  function setCancelMode(on) {
    if (on) localStorage.setItem("modo.quitar", "1");
    else localStorage.removeItem("modo.quitar");
  }

  // Estado
  const seatEls = new Map();
  let occupied = new Set();
  let selected = new Set();
  let editMode = false;

  function updateSelectionUI() {
    selCount.textContent = String(selected.size);
    const has = selected.size > 0;
    btnConfirm.disabled = !has;
    btnClearSel.disabled = !has;

    if (isCancelMode()) {
      btnConfirm.textContent = "Confirmar cancelación";
      btnConfirm.classList.add("is-danger");
      btnConfirm.classList.remove("side-btn-primary");
      btnConfirm.classList.add("side-btn-danger");
    } else {
      btnConfirm.textContent = "Confirmar reserva";
      btnConfirm.classList.remove("is-danger");
      btnConfirm.classList.remove("side-btn-danger");
      btnConfirm.classList.add("side-btn-primary");
    }
  }

  // Tooltip
  const occupiedByName = new Map();
  let tooltipEl = null;

  function ensureTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "seat-tooltip is-hidden";
    document.body.appendChild(tooltipEl);
  }
  function showTooltip(text, ev) {
    ensureTooltip();
    tooltipEl.textContent = text;
    tooltipEl.classList.remove("is-hidden");
    moveTooltip(ev);
  }
  function moveTooltip(ev) {
    if (!tooltipEl || tooltipEl.classList.contains("is-hidden")) return;
    const pad = 14;
    tooltipEl.style.left = `${ev.clientX + pad}px`;
    tooltipEl.style.top = `${ev.clientY + pad}px`;
  }
  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.add("is-hidden");
  }

  function applySeatClasses() {
    const cancelMode = isCancelMode();

    seatEls.forEach((btn, id) => {
      const isOcc = occupied.has(id);
      const isSel = selected.has(id);

      btn.classList.toggle("is-busy", isOcc);
      btn.classList.toggle("is-free", !isOcc);

      // ✅ selección distinta según modo
      btn.classList.toggle("is-selected", !cancelMode && isSel);
      btn.classList.toggle("is-cancel-selected", cancelMode && isSel);

      if (isOcc) {
        const who = occupiedByName.get(id);
        btn.title = who ? `${id} • ${who}` : id;
      } else {
        btn.title = id;
      }

      // ✅ CLAVE:
      btn.disabled = cancelMode ? !isOcc : isOcc;
      btn.classList.toggle("is-disabled", btn.disabled);
    });
  }

  function renderSeats() {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    for (const s of SEATS_12) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-free";
      b.style.left = `${s.x}%`;
      b.style.top = `${s.y}%`;
      b.dataset.seatId = s.id;
      b.title = s.id;

      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (editMode) return;

        const cancelMode = isCancelMode();
        const isOcc = occupied.has(s.id);

        if (cancelMode) {
          if (!isOcc) return;
          if (selected.has(s.id)) selected.delete(s.id);
          else selected.add(s.id);

          updateSelectionUI();
          applySeatClasses();
          return;
        }

        if (isOcc) return;

        const tipo = getReservaTipo();
        if (tipo === "individual") {
          if (selected.has(s.id)) selected.clear();
          else {
            selected.clear();
            selected.add(s.id);
          }
        } else {
          if (selected.has(s.id)) selected.delete(s.id);
          else selected.add(s.id);
        }

        updateSelectionUI();
        applySeatClasses();
      });

      b.addEventListener("mouseenter", (ev) => {
        if (editMode) return;
        if (!occupied.has(s.id)) return;
        const who = occupiedByName.get(s.id);
        if (!who) return;
        showTooltip(who, ev);
      });
      b.addEventListener("mousemove", (ev) => {
        if (editMode) return;
        moveTooltip(ev);
      });
      b.addEventListener("mouseleave", () => hideTooltip());

      seatEls.set(s.id, b);
      seatsLayer.appendChild(b);
    }

    applySeatClasses();
  }

  async function loadOccupied() {
    const fecha = datePick.value;
    if (!fecha) return;

    try {
      setMsg("Cargando disponibilidad…");
      const r = await fetch(`/api/asientos/ocupados-info?piso=12&fecha=${encodeURIComponent(fecha)}`);
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo cargar disponibilidad");
        return;
      }

      occupiedByName.clear();
      const rows = Array.isArray(j.ocupados) ? j.ocupados : [];
      occupied = new Set(rows.map((row) => row.asiento_id));

      for (const row of rows) {
        if (row?.asiento_id) occupiedByName.set(row.asiento_id, row?.nombre || "");
      }

      const cancelMode = isCancelMode();
      selected.forEach((id) => {
        if (cancelMode) {
          if (!occupied.has(id)) selected.delete(id);
        } else {
          if (occupied.has(id)) selected.delete(id);
        }
      });

      updateSelectionUI();
      applySeatClasses();
      setMsg("");
    } catch (e) {
      console.error(e);
      setMsg("Error consultando disponibilidad");
    }
  }

  async function confirmAction() {
    const fecha = datePick.value;
    if (!fecha) return setMsg("Elegí una fecha.");
    if (selected.size === 0) return setMsg("Seleccioná al menos 1 asiento.");

    const cancelMode = isCancelMode();

    if (cancelMode) {
      const session = getSessionUser();
      if (!session?.id) return setMsg("No hay usuario en sesión (volvé al home y logueate).");

      try {
        btnConfirm.disabled = true;
        setMsg("Cancelando…");

        const asientos = Array.from(selected);
        const r = await fetch("/api/asientos/cancelar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ piso: 12, fecha, asientos, usuario_id: session.id }),
        });

        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok) {
          setMsg(j?.error || "No se pudo cancelar");
          await loadOccupied();
          updateSelectionUI();
          return;
        }

        selected.clear();
        updateSelectionUI();
        await loadOccupied();

        if (j?.denied?.length) {
          setMsg(`✅ Canceladas: ${j.deleted?.length || 0}. Sin permiso: ${j.denied.join(", ")}`);
        } else {
          setMsg("✅ Reservas canceladas");
        }
      } catch (e) {
        console.error(e);
        setMsg("Error cancelando");
      } finally {
        btnConfirm.disabled = selected.size === 0;
      }
      return;
    }

    const reservaId = JSON.parse(localStorage.getItem("reserva.id") || "null");
    if (!reservaId) return setMsg("No encontré reserva.id (volvé al inicio y hacé el flujo completo).");

    const tipo = getReservaTipo();
    if (tipo === "individual" && selected.size > 1) {
      setMsg("Reserva individual: elegí 1 solo asiento.");
      return;
    }

    try {
      btnConfirm.disabled = true;
      setMsg("Confirmando…");

      const asientos = Array.from(selected);
      const r = await fetch("/api/asientos/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reserva_id: reservaId,
          piso: 12,
          fecha,
          asientos,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "No se pudo confirmar");
        if (r.status === 409) await loadOccupied();
        updateSelectionUI();
        return;
      }

      selected.clear();
      updateSelectionUI();
      await loadOccupied();
      setMsg("✅ Reserva confirmada");
    } catch (e) {
      console.error(e);
      setMsg("Error confirmando");
    } finally {
      btnConfirm.disabled = selected.size === 0;
    }
  }

  btnConfirm.addEventListener("click", confirmAction);

  btnClearSel.addEventListener("click", () => {
    selected.clear();
    updateSelectionUI();
    applySeatClasses();
    setMsg("");
  });

  btnBackHome.addEventListener("click", () => {
    window.location.href = "home.html";
  });

  datePick.addEventListener("change", async () => {
    selected.clear();
    updateSelectionUI();
    await loadOccupied();
  });

  // ✅ Botón "Quitar reservas" (ACTIVA/DESACTIVA modo)
  if (btnConfirmCancel) btnConfirmCancel.classList.add("is-hidden");
  if (btnClearCancel) btnClearCancel.classList.add("is-hidden");

  if (btnToggleCancel) {
    btnToggleCancel.textContent = isCancelMode()
      ? "Salir de quitar reservas"
      : "Quitar reservas";

    btnToggleCancel.addEventListener("click", async () => {
      const nowOn = !isCancelMode();
      setCancelMode(nowOn);

      selected.clear();
      updateSelectionUI();

      await loadOccupied();
      applySeatClasses();

      setMsg(nowOn ? "🟠 Modo quitar reservas ACTIVO (tocá asientos rojos)" : "✅ Modo reserva normal");
      btnToggleCancel.textContent = nowOn ? "Salir de quitar reservas" : "Quitar reservas";
    });
  }

  // MODO EDICIÓN (E) (como lo tenías)
  function fmt(n) { return Math.round(n * 10) / 10; }
  function getPercentCoords(ev) {
    const rect = floorMap.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    return { x: fmt(x), y: fmt(y) };
  }

  window.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() !== "e") return;
    editMode = !editMode;
    editHint?.classList.toggle("is-hidden", !editMode);
    if (!editMode) hideTooltip();
    setMsg(editMode ? "🛠️ Modo edición ON (no reserva)" : "");
  });

  floorMap.addEventListener("mousemove", (ev) => {
    if (!editMode || !editCursor) return;
    const { x, y } = getPercentCoords(ev);
    editCursor.classList.remove("is-hidden");
    editCursor.style.left = `${x}%`;
    editCursor.style.top = `${y}%`;
  });

  // INIT
  datePick.value = todayISO();
  renderSeats();
  updateSelectionUI();
  loadOccupied();
})();
