document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const floorMap = $("floorMap");
  const seatsLayer = $("seatsLayer");

  const btnMenu = $("btnMenu");
  const drawer = $("drawer");
  const drawerBackdrop = $("drawerBackdrop");
  const btnCloseMenu = $("btnCloseMenu");

  const datePickFrom = $("datePickFrom");
  const datePickTo = $("datePickTo");
  const btnConfirm = $("btnConfirm");
  const btnClearSel = $("btnClearSel");
  const btnBack = $("btnBack");
  const btnLogout = $("btnLogout");

  const floorTitle = $("floorTitle");
  const modeBadge = $("modeBadge");
  const selCount = $("selCount");
  const sideMsg = $("sideMsg");

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const piso = String(params.get("piso") || localStorage.getItem("reserva.floor") || "").trim();
  const mode = String(params.get("mode") || localStorage.getItem("mode") || "empleado").trim();
  const fecha =
    String(params.get("fecha") || localStorage.getItem("reserva.fecha") || "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!piso) {
    window.location.href = "/floors.html";
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user?.id) {
    window.location.href = "/index.html";
    return;
  }

  // Ajustado a tus archivos reales
  const FLOOR_BG = {
    "7": "/assets/images/piso7.jpg",
    "8": "/assets/images/piso8.jpg",
    "11": "/assets/images/piso11.png",
    "12": "/assets/images/piso12.jpg",
  };

  const bgSrc = FLOOR_BG[piso];
  if (bgSrc) floorMap.style.backgroundImage = `url("${bgSrc}")`;

  floorTitle.textContent = `Piso ${piso}`;
  document.title = `Piso ${piso}`;
  datePickFrom.value = fecha;

  // Evitar fechas pasadas (rompen el constraint pool_ventana_fechas)
  const todayISO = new Date().toISOString().slice(0, 10);
  datePickFrom.min = todayISO;
  datePickTo.min = todayISO;

  // si no hay fecha, ponemos hoy
  if (!datePickFrom.value) datePickFrom.value = todayISO;
  if (datePickFrom.value && datePickFrom.value < todayISO) datePickFrom.value = todayISO;
  if (!datePickTo.value) datePickTo.value = "";

  localStorage.setItem("reserva.fecha", datePickFrom.value);
  localStorage.setItem("reserva.floor", piso);

  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());

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

  // ============================
  // Geometry: rect real de la imagen dentro del contenedor (background contain)
  // ============================
  const imgInfoCache = new Map(); // src -> { w, h }

  const loadImageInfo = (src) =>
    new Promise((resolve, reject) => {
      if (!src) return reject(new Error("Sin imagen"));
      if (imgInfoCache.has(src)) return resolve(imgInfoCache.get(src));

      const im = new Image();
      im.onload = () => {
        const info = { w: im.naturalWidth, h: im.naturalHeight };
        imgInfoCache.set(src, info);
        resolve(info);
      };
      im.onerror = () => reject(new Error("No se pudo cargar la imagen del piso"));
      im.src = src;
    });

  const getImageRectInContainer = (containerW, containerH, imgW, imgH) => {
    // background-size: contain + position center
    const imgRatio = imgW / imgH;
    const contRatio = containerW / containerH;

    let drawW;
    let drawH;

    if (contRatio > imgRatio) {
      // cont más ancho -> la imagen limita por altura
      drawH = containerH;
      drawW = drawH * imgRatio;
    } else {
      // cont más alto -> limita por ancho
      drawW = containerW;
      drawH = drawW / imgRatio;
    }

    const x = (containerW - drawW) / 2;
    const y = (containerH - drawH) / 2;

    return { x, y, w: drawW, h: drawH };
  };

  let imgInfo = null; // {w,h}
  let imgRect = null; // {x,y,w,h} dentro del contenedor

  const refreshImageRect = () => {
    const r = floorMap.getBoundingClientRect();
    imgRect = getImageRectInContainer(r.width, r.height, imgInfo.w, imgInfo.h);
  };

  // ============================
  // UI state
  // ============================
  const selected = new Set(); // ids de asientos (para supervisor: pool; para empleado: seat seleccionado)
  let enabledPool = new Set(); // ids habilitados para empleado (pool)
  let occupied = new Set(); // ids ocupados para empleado

  const allSeats = new Map(); // id -> {id,codigo,x,y,...}
  const seatEls = new Map(); // id -> button

  const editMode = params.get("edit") === "1"; // no tocamos tu modo edición
  modeBadge.textContent = editMode ? "EDICIÓN" : mode.toUpperCase();

  const updateSelectionUI = () => {
    selCount.textContent = String(selected.size);

    // Botón confirmar: supervisor permite multi; empleado solo 1
    if (mode === "supervisor") {
      btnConfirm.disabled = selected.size === 0;
      btnClearSel.disabled = selected.size === 0;
    } else {
      btnConfirm.disabled = selected.size !== 1;
      btnClearSel.disabled = selected.size === 0;
    }
  };

  const applySeatClasses = () => {
    for (const [id, btn] of seatEls.entries()) {
      btn.classList.remove("is-out", "is-pool", "is-busy", "is-selected");

      // Supervisor: todo clickeable, solo marca seleccionado
      if (mode === "supervisor") {
        btn.classList.add(selected.has(id) ? "is-selected" : "is-out");
        if (selected.has(id)) btn.classList.add("is-pool");
        continue;
      }

      // Empleado: solo dentro del pool es verde, ocupado gris
      if (!enabledPool.has(id)) {
        btn.classList.add("is-out");
      } else if (occupied.has(id)) {
        btn.classList.add("is-busy");
      } else {
        btn.classList.add("is-pool");
      }

      if (selected.has(id)) btn.classList.add("is-selected");
    }
  };

  const onSeatClick = (id) => {
    if (editMode) return;

    // Supervisor: toggle multi
    if (mode === "supervisor") {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);

      updateSelectionUI();
      applySeatClasses();
      return;
    }

    // Empleado: solo 1 (y debe estar habilitado y no ocupado)
    if (!enabledPool.has(id) || occupied.has(id)) return;

    selected.clear();
    selected.add(id);
    updateSelectionUI();
    applySeatClasses();
  };

  const repositionAll = () => {
    // reubica asientos en resize (porque cambia imgRect)
    seatEls.forEach((btn, id) => {
      const s = allSeats.get(id);
      if (!s) return;
      positionSeatElement(btn, s.x, s.y);
    });

    // reubica markers de edición
    editMarkers.forEach((m) => {
      positionSeatElement(m.el, m.x, m.y);
    });
  };

  // ============================
  // API
  // ============================
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
      )}&fecha=${encodeURIComponent(datePickFrom.value)}`
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
      )}&fecha=${encodeURIComponent(datePickFrom.value)}`
    );
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Error cargando pool");

    const ids = Array.isArray(data.asientos) ? data.asientos : [];
    enabledPool = new Set(ids.map((x) => String(x)));
    selected.clear();
    ids.forEach((x) => selected.add(String(x)));
    setMsg("");
  };

  // ============================
  // MODO EDICIÓN (SHIFT + click)
  // ============================
  const editMarkers = []; // { x, y, el }

  const ensureEditUI = () => {
    // Agrega una caja al drawer para copiar coordenadas (sin tocar HTML)
    if (!editMode) return;

    // evita duplicar
    if (document.getElementById("editBox")) return;

    const box = document.createElement("div");
    box.id = "editBox";
    box.style.marginTop = "10px";
    box.style.paddingTop = "10px";
    box.style.borderTop = "1px solid rgba(255,255,255,0.12)";

    box.innerHTML = `
      <div style="font-weight:800; margin-bottom:6px;">Modo edición</div>
      <div style="font-size:12px; opacity:.9; line-height:1.35;">
        SHIFT + click en el plano para guardar coordenadas (x%, y%) dentro de la imagen.
        <br/>Se copian con <b>;</b> al final de cada línea.
      </div>
      <button id="btnCopyCoords" class="drawer-btn" type="button" style="margin-top:10px;">
        Copiar coordenadas
      </button>
      <button id="btnClearCoords" class="drawer-btn" type="button">
        Limpiar coordenadas
      </button>
      <pre id="coordsOut" style="
        margin:10px 0 0;
        padding:10px;
        border-radius:12px;
        background: rgba(0,0,0,0.28);
        border: 1px solid rgba(255,255,255,0.12);
        overflow:auto;
        max-height: 180px;
        font-size: 12px;
      "></pre>
    `;

    drawer.querySelector(".drawer-body")?.appendChild(box);

    document.getElementById("btnCopyCoords").addEventListener("click", async () => {
      const text = buildCoordsText();
      try {
        await navigator.clipboard.writeText(text);
        setMsg("Coordenadas copiadas ✅");
        openDrawer();
      } catch {
        setMsg("No pude copiar automático. Copialas del cuadro.");
        openDrawer();
      }
      renderCoordsText();
    });

    document.getElementById("btnClearCoords").addEventListener("click", () => {
      editMarkers.splice(0, editMarkers.length);
      renderCoordsText();
      setMsg("Coordenadas limpiadas.");
      openDrawer();
    });

    renderCoordsText();
  };

  const renderCoordsText = () => {
    const out = document.getElementById("coordsOut");
    if (!out) return;
    out.textContent = buildCoordsText();
  };

  const buildCoordsText = () => {
    if (!editMarkers.length) return "";
    return editMarkers.map((m) => `${m.x.toFixed(2)}, ${m.y.toFixed(2)};`).join("\n");
  };

  const addEditMarker = (xPct, yPct) => {
    const m = document.createElement("div");
    m.style.position = "absolute";
    m.style.width = "10px";
    m.style.height = "10px";
    m.style.borderRadius = "999px";
    m.style.background = "rgba(255,255,255,0.9)";
    m.style.boxShadow = "0 10px 22px rgba(0,0,0,0.35)";
    seatsLayer.appendChild(m);

    const rec = { x: xPct, y: yPct, el: m };
    editMarkers.push(rec);
    positionSeatElement(m, xPct, yPct);
    renderCoordsText();
  };

  const handleEditClick = (ev) => {
    if (!editMode) return;
    if (!ev.shiftKey) return; // solo SHIFT
    if (!imgRect || !imgInfo) return;

    const rect = floorMap.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;

    // Convertir click -> porcentaje dentro del área real de la imagen (no del contenedor total)
    const relX = (cx - imgRect.x) / imgRect.w;
    const relY = (cy - imgRect.y) / imgRect.h;

    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
      setMsg("Click fuera del área de la imagen (en el borde negro).");
      openDrawer();
      return;
    }

    const xPct = relX * 100;
    const yPct = relY * 100;

    addEditMarker(xPct, yPct);

    // UX: abrimos el drawer para que veas el listado
    openDrawer();
  };

  // Click en el mapa para edición
  floorMap.addEventListener("click", handleEditClick);

  // ============================
  // Render
  // ============================
  const toNum = (v) => {
    if (typeof v === "number") return v;
    const s = String(v ?? "").trim().replace(",", ".");
    const n = Number(s);
    return n;
  };

  const positionSeatElement = (el, xPct, yPct) => {
    if (!imgRect) return;

    let xN = toNum(xPct);
    let yN = toNum(yPct);

    // Si vinieron mal (NaN), evitamos que queden todos sin left/top válidos
    if (!Number.isFinite(xN) || !Number.isFinite(yN)) {
      el.style.left = "0px";
      el.style.top = "0px";
      return;
    }

    // Por si alguna vez guardaste coords en 0..1 (ratio), lo convertimos a %
    if (xN >= 0 && xN <= 1 && yN >= 0 && yN <= 1) {
      xN *= 100;
      yN *= 100;
    }

    const x = imgRect.x + imgRect.w * (xN / 100);
    const y = imgRect.y + imgRect.h * (yN / 100);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };

  const renderSeats = () => {
    seatsLayer.innerHTML = "";
    seatEls.clear();

    for (const [id, s] of allSeats.entries()) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seat is-out";
      b.setAttribute("aria-label", `Asiento ${s.codigo || id}`);
      b.addEventListener("click", () => onSeatClick(id));

      seatsLayer.appendChild(b);
      seatEls.set(id, b);

      positionSeatElement(b, s.x, s.y);
    }
  };

  // ============================
  // Actions normales
  // ============================
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
    const f = encodeURIComponent(datePickFrom.value);
    window.location.href = `/floors.html?mode=${encodeURIComponent(mode)}&fecha=${f}`;
  });

  datePickFrom.addEventListener("change", () => {
    const v = String(datePickFrom.value || "");
    if (isISO(v)) {
      localStorage.setItem("reserva.fecha", v);
      // si hasta quedó antes que desde, lo ajustamos
      const t = String(datePickTo.value || "");
      if (t && t < v) datePickTo.value = v;
      refresh().catch((e) => setMsg(e.message || "Error"));
    }
  });

  datePickTo.addEventListener("change", () => {
    const f = String(datePickFrom.value || "");
    const t = String(datePickTo.value || "");
    if (f && t && t < f) datePickTo.value = f;
  });

  btnConfirm.addEventListener("click", async () => {
    if (editMode) {
      setMsg("Estás en modo edición. Usá SHIFT+click para capturar coordenadas.");
      openDrawer();
      return;
    }

    if (selected.size === 0) return;

    btnConfirm.disabled = true;
    setMsg(mode === "supervisor" ? "Guardando pool..." : "Reservando...");

    try {
      if (mode === "supervisor") {
        const payload = {
          supervisor_id: user.id,
          piso: Number(piso),
          fecha_desde: datePickFrom.value,
          fecha_hasta: datePickTo.value || datePickFrom.value,
          asiento_ids: [...selected],
        };

        const r = await fetch("/api/supervisor/pools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.ok) throw new Error(data?.error || "No se pudo guardar el pool");

        setMsg(`Pool guardado. Fechas: ${data.fechas || 1}. Habilitados: ${data.habilitados || selected.size}`);
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
          fecha: datePickFrom.value,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || "No se pudo reservar");

      setMsg("Reserva confirmada ✅");
      selected.clear();
      await refresh();
      openDrawer();
    } catch (e) {
      setMsg(e.message || "Error");
      openDrawer();
    } finally {
      updateSelectionUI();
      applySeatClasses();
    }
  });

  // ============================
  // Init
  // ============================
  const refresh = async () => {
    setMsg("Cargando...");
    btnConfirm.disabled = true;
    btnClearSel.disabled = true;

    // cargar info real de imagen para imgRect
    imgInfo = await loadImageInfo(bgSrc);
    refreshImageRect();

    await fetchAllSeats();
    if (mode === "supervisor") await fetchSupervisorState();
    else await fetchEmpleadoState();

    ensureEditUI();
    renderSeats();
    updateSelectionUI();
    applySeatClasses();
  };

  // Recalcular en resize para mantener alineación 100%
  window.addEventListener("resize", () => {
    if (!imgInfo) return;
    refreshImageRect();
    repositionAll();
  });

  refresh().catch((e) => {
    setMsg(e.message || "Error");
    openDrawer();
  });
});
