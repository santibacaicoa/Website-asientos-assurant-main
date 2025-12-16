// ============================================================================
// HOME.JS — Lógica de la pantalla Home (nombre + tipo de reserva + Continuar)
// - Guarda/restaura estado en localStorage
// - Habilita "Continuar" solo si nombre + tipo están completos
// - Crea una "pre-reserva" en PostgreSQL vía Node/Express
// ============================================================================

(function () {
  // ----------------------------- Constantes ---------------------------------
  const K = {
    nombre: 'home.nombre',
    tipo: 'home.tipo', // 'grupal' | 'individual'
    reservaId: 'reserva.id', // ID devuelto por la DB
  };

  // -------------------------- Utils: Storage --------------------------------
  const store = {
    get(key, fallback = '') {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { /* noop */ }
    },
    del(key) {
      try { localStorage.removeItem(key); }
      catch { /* noop */ }
    },
  };

  // -------------------------- Utils: Helpers --------------------------------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function getSelectedTipo() {
    const el = $('input[name="tipo-reserva"]:checked');
    return el ? el.value : '';
  }

  function setSelectedTipo(value) {
    const target = value ? $(`input[name="tipo-reserva"][value="${value}"]`) : null;
    if (target) {
      target.checked = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // --------------------------- Inicialización -------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const inputNombre  = $('#nombre');
    const radios       = $$('input[name="tipo-reserva"]');
    const btnContinuar = $('#btnContinuar');

    if (!inputNombre || !radios.length || !btnContinuar) return;

    // 1) Restaurar estado desde localStorage
    const savedNombre = store.get(K.nombre, '');
    const savedTipo   = store.get(K.tipo, '');

    if (savedNombre) inputNombre.value = savedNombre;
    if (savedTipo)   setSelectedTipo(savedTipo);

    // 2) Validación y habilitado del botón
    function isValid() {
      const nombreOk = (inputNombre.value || '').trim().length > 0;
      const tipoOk   = !!getSelectedTipo();
      return nombreOk && tipoOk;
    }

    function updateContinuar() {
      const ok = isValid();
      btnContinuar.disabled = !ok;
      btnContinuar.setAttribute('aria-disabled', String(!ok));
    }

    updateContinuar();

    // 3) Listeners: guardar cambios y actualizar botón
    inputNombre.addEventListener('input', debounce(() => {
      store.set(K.nombre, inputNombre.value.trim());
      updateContinuar();
    }, 250));

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        store.set(K.tipo, getSelectedTipo());
        updateContinuar();
      });
    });

    // 4) Acción de Continuar
    btnContinuar.addEventListener('click', async () => {
      if (!isValid()) return;

      const payload = {
        nombre: (inputNombre.value || '').trim(),
        tipo: getSelectedTipo(),
        // más adelante: cantidad_asientos real si agregás la pregunta
        cantidad_asientos: 1,
      };

      store.set(K.nombre, payload.nombre);
      store.set(K.tipo, payload.tipo);

      try {
        const res = await fetch('/api/pre-reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data?.ok && data?.reserva?.id) {
          store.set(K.reservaId, data.reserva.id);
          console.log('Pre-reserva guardada en backend:', data.reserva);
        } else {
          console.warn('Respuesta inesperada del backend:', data);
        }
      } catch (err) {
        console.error('No se pudo guardar pre-reserva en backend:', err);
        // No rompemos el flujo: seguimos igual
      }

      window.location.href = 'floors.html';
    });

    // 5) Guardado final al salir
    window.addEventListener('beforeunload', () => {
      store.set(K.nombre, (inputNombre.value || '').trim());
      store.set(K.tipo, getSelectedTipo());
    });

    // 6) Helpers de depuración
    window.reserva = {
      get() {
        return {
          nombre: store.get(K.nombre, ''),
          tipo: store.get(K.tipo, ''),
          reservaId: store.get(K.reservaId, null),
          valido: isValid()
        };
      },
      clear() {
        store.del(K.nombre);
        store.del(K.tipo);
        store.del(K.reservaId);
      }
    };
  });
})();
