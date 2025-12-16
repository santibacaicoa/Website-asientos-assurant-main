// =============================================================================
// home.js - HOME con pasos internos
// - stepAuthMain: login + registro
// - stepForgot: recuperar username por nombre+apellido (duplicados OK)
// - stepAdmin: login admin (username + password)
// - stepReserva: elegir tipo de reserva y crear pre-reserva en DB
// =============================================================================

(function () {
  const K = {
    session: 'session.user',       // {id, username, nombre, apellido, rol}
    reservaId: 'reserva.id',
    reservaTipo: 'reserva.tipo',
    reservaFloor: 'reserva.floor',
  };

  const store = {
    get(key, fallback = null) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch {}
    },
    del(key) {
      try { localStorage.removeItem(key); }
      catch {}
    }
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function show(el) { el.classList.remove('is-hidden'); }
  function hide(el) { el.classList.add('is-hidden'); }

  function setMsg(el, text) {
    if (!el) return;
    el.textContent = text || '';
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  function getSelectedTipo() {
    const el = $('input[name="tipo-reserva"]:checked');
    return el ? el.value : '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Steps
    const stepAuthMain = $('#stepAuthMain');
    const stepForgot = $('#stepForgot');
    const stepAdmin = $('#stepAdmin');
    const stepReserva = $('#stepReserva');

    // AuthMain
    const loginUsername = $('#login-username');
    const btnLoginUser = $('#btnLoginUser');
    const btnGoForgot = $('#btnGoForgot');
    const btnGoAdmin = $('#btnGoAdmin');

    const regUsername = $('#reg-username');
    const regNombre = $('#reg-nombre');
    const regApellido = $('#reg-apellido');
    const btnRegisterUser = $('#btnRegisterUser');

    const authMsg = $('#authMsg');

    // Forgot
    const forgotNombre = $('#forgot-nombre');
    const forgotApellido = $('#forgot-apellido');
    const btnFindUser = $('#btnFindUser');
    const matchesBox = $('#matchesBox');
    const matchesList = $('#matchesList');
    const btnBackFromForgot = $('#btnBackFromForgot');
    const forgotMsg = $('#forgotMsg');

    // Admin
    const adminUsername = $('#admin-username');
    const adminPassword = $('#admin-password');
    const btnLoginAdmin = $('#btnLoginAdmin');
    const btnBackFromAdmin = $('#btnBackFromAdmin');
    const adminMsg = $('#adminMsg');

    // Reserva
    const welcomeUser = $('#welcomeUser');
    const btnContinuar = $('#btnContinuar');
    const btnLogout = $('#btnLogout');
    const reservaMsg = $('#reservaMsg');

    function go(step) {
      // Ocultar todo
      hide(stepAuthMain);
      hide(stepForgot);
      hide(stepAdmin);
      hide(stepReserva);

      // Limpiar mensajes visibles del step anterior (sin borrar inputs)
      setMsg(authMsg, '');
      setMsg(forgotMsg, '');
      setMsg(adminMsg, '');
      setMsg(reservaMsg, '');

      if (step === 'forgot') show(stepForgot);
      else if (step === 'admin') show(stepAdmin);
      else if (step === 'reserva') show(stepReserva);
      else show(stepAuthMain);
    }

    function updateContinuar() {
      const ok = !!getSelectedTipo();
      btnContinuar.disabled = !ok;
      btnContinuar.setAttribute('aria-disabled', String(!ok));
    }

    function renderFromSession() {
      const session = store.get(K.session, null);
      if (session) {
        welcomeUser.textContent = `Hola, ${session.nombre} ${session.apellido} (${session.username})`;
        go('reserva');
      } else {
        go('auth');
      }
      updateContinuar();
    }

    // -------------------------
    // Navegación por steps
    // -------------------------
    btnGoForgot.addEventListener('click', () => {
      matchesList.innerHTML = '';
      hide(matchesBox);
      setMsg(forgotMsg, '');
      go('forgot');
    });

    btnBackFromForgot.addEventListener('click', () => {
      go('auth');
    });

    btnGoAdmin.addEventListener('click', () => {
      setMsg(adminMsg, '');
      go('admin');
    });

    btnBackFromAdmin.addEventListener('click', () => {
      go('auth');
    });

    // -------------------------
    // Login usuario común
    // -------------------------
    btnLoginUser.addEventListener('click', async () => {
      const username = (loginUsername.value || '').trim();
      if (!username) {
        setMsg(authMsg, 'Escribí tu usuario.');
        return;
      }

      setMsg(authMsg, 'Ingresando...');

      try {
        const { res, data } = await postJSON('/api/auth/login-user', { username });
        if (!res.ok || !data.ok) {
          setMsg(authMsg, data.error || 'No se pudo ingresar.');
          return;
        }

        store.set(K.session, data.user);
        renderFromSession();
      } catch (err) {
        console.error(err);
        setMsg(authMsg, 'Error de conexión con el servidor.');
      }
    });

    // -------------------------
    // Registro usuario común
    // -------------------------
    btnRegisterUser.addEventListener('click', async () => {
      const username = (regUsername.value || '').trim();
      const nombre = (regNombre.value || '').trim();
      const apellido = (regApellido.value || '').trim();

      if (!username || !nombre || !apellido) {
        setMsg(authMsg, 'Completá usuario, nombre y apellido.');
        return;
      }

      setMsg(authMsg, 'Registrando...');

      try {
        const { res, data } = await postJSON('/api/auth/register-user', { username, nombre, apellido });
        if (!res.ok || !data.ok) {
          setMsg(authMsg, data.error || 'No se pudo registrar.');
          return;
        }

        store.set(K.session, data.user);
        renderFromSession();
      } catch (err) {
        console.error(err);
        setMsg(authMsg, 'Error de conexión con el servidor.');
      }
    });

    // -------------------------
    // Buscar usuario por nombre+apellido (duplicados OK)
    // -------------------------
    btnFindUser.addEventListener('click', async () => {
      const nombre = (forgotNombre.value || '').trim();
      const apellido = (forgotApellido.value || '').trim();

      if (!nombre || !apellido) {
        setMsg(forgotMsg, 'Completá nombre y apellido para buscar.');
        return;
      }

      setMsg(forgotMsg, 'Buscando...');

      try {
        const { res, data } = await postJSON('/api/auth/find-users', { nombre, apellido });
        if (!res.ok || !data.ok) {
          setMsg(forgotMsg, data.error || 'No se pudo buscar.');
          return;
        }

        const matches = data.matches || [];
        matchesList.innerHTML = '';
        hide(matchesBox);

        if (matches.length === 0) {
          setMsg(forgotMsg, 'No encontramos un usuario con ese nombre y apellido.');
          return;
        }

        show(matchesBox);
        setMsg(forgotMsg, 'Seleccioná tu usuario de la lista:');

        matches.forEach(u => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = `${u.username} — ${u.nombre} ${u.apellido}`;
          btn.addEventListener('click', async () => {
            const { res: r2, data: d2 } = await postJSON('/api/auth/login-user', { username: u.username });
            if (!r2.ok || !d2.ok) {
              setMsg(forgotMsg, d2.error || 'No se pudo ingresar con ese usuario.');
              return;
            }
            store.set(K.session, d2.user);
            renderFromSession();
          });
          matchesList.appendChild(btn);
        });
      } catch (err) {
        console.error(err);
        setMsg(forgotMsg, 'Error de conexión con el servidor.');
      }
    });

    // -------------------------
    // Login admin
    // -------------------------
    btnLoginAdmin.addEventListener('click', async () => {
      const username = (adminUsername.value || '').trim();
      const password = adminPassword.value || '';

      if (!username || !password) {
        setMsg(adminMsg, 'Completá usuario y password de admin.');
        return;
      }

      setMsg(adminMsg, 'Ingresando...');

      try {
        const { res, data } = await postJSON('/api/auth/login-admin', { username, password });
        if (!res.ok || !data.ok) {
          setMsg(adminMsg, data.error || 'No se pudo ingresar como admin.');
          return;
        }

        store.set(K.session, data.user);
        renderFromSession();
      } catch (err) {
        console.error(err);
        setMsg(adminMsg, 'Error de conexión con el servidor.');
      }
    });

    // -------------------------
    // Paso reserva: tipo + crear pre-reserva DB
    // -------------------------
    $$('input[name="tipo-reserva"]').forEach(r => {
      r.addEventListener('change', () => {
        store.set(K.reservaTipo, getSelectedTipo());
        updateContinuar();
      });
    });

    btnContinuar.addEventListener('click', async () => {
      const session = store.get(K.session, null);
      const tipo = getSelectedTipo();

      if (!session) {
        setMsg(reservaMsg, 'Primero tenés que ingresar.');
        return;
      }
      if (!tipo) return;

      setMsg(reservaMsg, 'Guardando reserva...');

      try {
        const res = await fetch('/api/pre-reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: session.id,
            tipo,
            cantidad_asientos: 1
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setMsg(reservaMsg, data.error || 'No se pudo crear la reserva.');
          return;
        }

        store.set(K.reservaId, data.reserva.id);
        store.set(K.reservaTipo, tipo);
        setMsg(reservaMsg, '');

        window.location.href = 'floors.html';
      } catch (err) {
        console.error(err);
        setMsg(reservaMsg, 'Error conectando al servidor.');
      }
    });

    btnLogout.addEventListener('click', () => {
      store.del(K.session);
      store.del(K.reservaId);
      store.del(K.reservaTipo);
      store.del(K.reservaFloor);

      // Reset radio
      $$('input[name="tipo-reserva"]').forEach(r => (r.checked = false));

      renderFromSession();
    });

    // Inicial
    renderFromSession();
  });
})();
