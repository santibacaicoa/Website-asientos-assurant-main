// ============================================================================
// SCRIPT PRINCIPAL DE LOGIN Y ANIMACIÓN DE ZOOM
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------- REFERENCIAS DE ELEMENTOS -------------------------
  const inputClave = document.getElementById('clave');
  const btnAcceder = document.getElementById('btnAcceder');
  const toggleBtn = document.getElementById('togglePwd');

  // Si no existen estos elementos, salir
  if (!inputClave || !btnAcceder || !toggleBtn) return;

  const iconEye = toggleBtn.querySelector('.icon-eye');
  const iconEyeOff = toggleBtn.querySelector('.icon-eye-off');
  const error = document.getElementById('errorMsg');

  // ------------------------- VALIDACIÓN DE ACCESO -------------------------
  btnAcceder.addEventListener('click', () => {
    const clave = inputClave.value;

    if (clave === 'Assurant1') {
      if (error) error.classList.remove('show'); // oculta mensaje

      // Efecto de zoom sobre el canvas antes de redirigir
      const canvas = document.getElementById('flightCanvas');
      if (canvas) {
        canvas.classList.add('zoom-bg');
        setTimeout(() => {
          window.location.href = 'home.html';
        }, 400); // duración igual a la animación CSS
      } else {
        window.location.href = 'home.html';
      }
    } else {
      if (error) error.classList.add('show'); // muestra mensaje de error
    }
  });

  // ------------------------- ESCUCHA DE CAMBIOS EN INPUT -------------------------
  inputClave.addEventListener('input', () => {
    if (error) error.classList.remove('show');
  });

  // Permite acceder presionando Enter
  inputClave.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAcceder.click();
  });

  // ------------------------- MOSTRAR / OCULTAR CONTRASEÑA -------------------------
  toggleBtn.addEventListener('click', () => {
    const isPwd = inputClave.type === 'password';
    inputClave.type = isPwd ? 'text' : 'password';

    // Estado accesible y tooltip
    toggleBtn.setAttribute('aria-pressed', String(isPwd));
    toggleBtn.setAttribute(
      'aria-label',
      isPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'
    );
    toggleBtn.setAttribute(
      'title',
      isPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'
    );

    // Alterna iconos
    if (isPwd) {
      if (iconEye) iconEye.style.display = 'none';
      if (iconEyeOff) iconEyeOff.style.display = 'block';
    } else {
      if (iconEye) iconEye.style.display = 'block';
      if (iconEyeOff) iconEyeOff.style.display = 'none';
    }

    inputClave.focus();
  });
});
