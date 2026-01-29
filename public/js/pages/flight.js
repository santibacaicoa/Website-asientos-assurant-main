/* Niño en caja volando — Canvas Animation (versión 3D + logo Assurant) */
(() => {
  const CONFIG = {
    speed: 220,
    turnEase: 0.08,
    bobAmp: 10,
    bobFreq: 2.2,
    smokeRate: 1 / 18,
    smokeTTL: 1.4,
    smokeBaseSize: 8,
    attractRadius: 160,
    boostChance: 0.0025
  };

  const canvas = document.getElementById('flightCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // --- Logo Assurant (cargado una vez) ---
  const logoImg = new Image();
  logoImg.src = '/assets/images/assurant_logo.png'; // usa el mismo logo que el <header>
  let logoReady = false;
  logoImg.onload = () => (logoReady = true);

  let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let width = 0,
    height = 0;
  let last = 0,
    running = true;

  // puntero
  const pointer = { x: 0, y: 0, active: false };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = Math.floor(rect.width * DPR);
    height = Math.floor(rect.height * DPR);
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // --- Partículas de humo ---
  class Smoke {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx + rand(-10, 10);
      this.vy = vy + rand(-10, 10);
      this.life = 0;
      this.ttl = CONFIG.smokeTTL;
      this.base = CONFIG.smokeBaseSize + rand(-2, 3);
      this.rot = rand(0, Math.PI * 2);
      this.rotSpd = rand(-0.7, 0.7);
      this.opacity = 0.6;
    }
    update(dt) {
      this.life += dt;
      const t = clamp(this.life / this.ttl, 0, 1);
      this.x += this.vx * dt * 0.4;
      this.y += this.vy * dt * 0.4;
      this.vy -= 8 * dt;
      this.rot += this.rotSpd * dt;
      this.opacity = (1 - t) * 0.5;
    }
    draw(ctx) {
      const t = clamp(this.life / this.ttl, 0, 1);
      const size = this.base * (1 + t * 2.2);
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      const g = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
      g.addColorStop(0, 'rgba(180,180,180,0.9)');
      g.addColorStop(1, 'rgba(180,180,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    get alive() {
      return this.life < this.ttl;
    }
  }

  // --- Niño en caja (con caja 3D) ---
  class KidInBox {
    constructor() {
      this.x = 200;
      this.y = 200;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.t = 0;
      this.target = this.randTarget();
      this.smokeTimer = 0;
    }
    randTarget() {
  const pad = 80;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  return {
    x: rand(pad, w - pad),
    y: rand(pad, h - pad)
  };
}
    update(dt) {
      this.t += dt;

      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      let ux = dx / dist,
        uy = dy / dist;

      // atracción leve al puntero
      if (pointer.active) {
        const dxp = pointer.x - this.x;
        const dyp = pointer.y - this.y;
        const dp = Math.hypot(dxp, dyp);
        if (dp < CONFIG.attractRadius) {
          const w = (CONFIG.attractRadius - dp) / CONFIG.attractRadius;
          ux = lerp(ux, dxp / (dp || 1), w * 0.65);
          uy = lerp(uy, dyp / (dp || 1), w * 0.65);
        }
      }

      // velocidad
      let speed = CONFIG.speed;
      if (Math.random() < CONFIG.boostChance) speed *= 1.35;

      const tx = ux * speed;
      const ty = uy * speed;
      this.vx = lerp(this.vx, tx, 0.08);
      this.vy = lerp(this.vy, ty, 0.08);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // bobbing
      this.y += Math.sin(this.t * CONFIG.bobFreq) * CONFIG.bobAmp * dt;

      // rotación hacia la velocidad
      const desiredAngle = Math.atan2(this.vy, this.vx);
      let da = desiredAngle - this.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      this.angle += da * CONFIG.turnEase;

      // nuevo target
      if (dist < 40) this.target = this.randTarget();

      // límites suaves
const pad = 40;
if (this.x < pad) {
  this.x = pad;
  this.vx *= -0.5;
}
if (this.x > canvas.clientWidth - pad) { // antes: window.innerWidth
  this.x = canvas.clientWidth - pad;
  this.vx *= -0.5;
}
if (this.y < pad) {
  this.y = pad;
  this.vy *= -0.5;
}
if (this.y > canvas.clientHeight - pad) { // antes: window.innerHeight
  this.y = canvas.clientHeight - pad;
  this.vy *= -0.5;
}


      // humo
      this.smokeTimer += dt;
      if (this.smokeTimer > 1 / 60) {
        this.smokeTimer = 0;
        if (Math.random() < CONFIG.smokeRate) {
          const tail = this.tail();
          particles.push(new Smoke(tail.x, tail.y, -this.vx, -this.vy));
        }
      }
    }
    tail() {
      const back = 26;
      return {
        x: this.x - Math.cos(this.angle) * back,
        y: this.y - Math.sin(this.angle) * back
      };
    }

    // --- Dibujo 3D de la caja + logo ---
    drawBox3D(ctx) {
      // medidas base de la cara frontal
      const fw = 56; // ancho face front
      const fh = 36; // alto face front
      const fx = -fw / 2;
      const fy = -fh / 2 - 2; // un pelín más arriba para dejar sitio a cabeza

      // offsets para caras "3D" (paralelogramo)
      const depthX = 12; // desplazamiento hacia “derecha” para cara lateral
      const depthY = -8; // desplazamiento hacia “arriba” para cara superior

      // Colores (luces/sombras de cartón)
      const colFront = '#B97A56';
      const colTop = '#C89B77';
      const colSide = '#9C6C4E';
      const colEdge = 'rgba(0,0,0,0.15)';

      // --- Sombra en el “suelo”
      ctx.save();
      ctx.translate(0, 10);
      ctx.scale(1.3, 0.45);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- Cara superior (paralelogramo)
      ctx.fillStyle = colTop;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + depthX, fy + depthY);
      ctx.lineTo(fx + depthX + fw, fy + depthY);
      ctx.lineTo(fx + fw, fy);
      ctx.closePath();
      ctx.fill();

      // --- Cara lateral derecha (paralelogramo)
      ctx.fillStyle = colSide;
      ctx.beginPath();
      ctx.moveTo(fx + fw, fy);
      ctx.lineTo(fx + fw + depthX, fy + depthY);
      ctx.lineTo(fx + fw + depthX, fy + depthY + fh);
      ctx.lineTo(fx + fw, fy + fh);
      ctx.closePath();
      ctx.fill();

      // --- Cara frontal (rectángulo)
      ctx.fillStyle = colFront;
      roundRect(ctx, fx, fy, fw, fh, 6, true, false);

      // “cinta” central (frente)
      ctx.fillStyle = '#C9A27F';
      ctx.fillRect(fx + fw / 2 - 4, fy, 8, fh);

      // Solapas “hacia arriba” (pequeño detalle)
      ctx.fillStyle = '#A86E4E';
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + fw * 0.25, fy);
      ctx.lineTo(fx + fw * 0.20, fy - 10);
      ctx.lineTo(fx, fy - 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(fx + fw, fy);
      ctx.lineTo(fx + fw * 0.75, fy);
      ctx.lineTo(fx + fw * 0.80, fy - 10);
      ctx.lineTo(fx + fw, fy - 10);
      ctx.closePath();
      ctx.fill();

      // Borde sutil
      ctx.strokeStyle = colEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(fx, fy, fw, fh);

      // --- Logo Assurant en la cara frontal (centrado) ---
      if (logoReady) {
        const pad = 6; // margen interno
        const maxW = fw - pad * 2;
        const maxH = fh * 0.55; // que no suba demasiado
        // mantener proporción del logo
        const ratio = logoImg.width / logoImg.height || 1;
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }
        const lx = fx + fw / 2 - w / 2;
        const ly = fy + fh / 2 - h / 2 + 2; // levemente abajo del centro
        ctx.save();
        // leve sombra para que “pegue” a la caja
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.drawImage(logoImg, lx, ly, w, h);
        ctx.restore();
      }

      // highlight suave (brillo)
      const hg = ctx.createLinearGradient(fx, fy, fx, fy + fh);
      hg.addColorStop(0, 'rgba(255,255,255,0.18)');
      hg.addColorStop(0.4, 'rgba(255,255,255,0.06)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg;
      roundRect(ctx, fx, fy, fw, fh, 6, true, false);
    }

    drawKid(ctx) {
      // cabeza y detalles “cartoon”
      ctx.save();
      ctx.translate(0, -28);

      // cabeza
      ctx.fillStyle = '#F5CBA7';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // pelo con luz
      ctx.fillStyle = '#2F2F2F';
      ctx.beginPath();
      ctx.arc(0, -3, 10, Math.PI * 1.05, Math.PI * 2.05);
      ctx.fill();

      // brillo cabello
      const g = ctx.createRadialGradient(-4, -6, 1, -4, -6, 10);
      g.addColorStop(0, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(-4, -6, 5, 0, Math.PI * 2);
      ctx.fill();

      // ojos
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-3.4, -1, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.4, -1, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // sonrisa
      ctx.strokeStyle = '#7a3d00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 2.5, 3.2, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // brazos (meneo suave)
      const armW = 10 + Math.sin((performance.now?.() || Date.now()) * 0.006) * 2;
      ctx.fillStyle = '#F5CBA7';
      roundRect(ctx, -18, -8, armW, 4, 2, true, false);
      roundRect(ctx, 8, -8, armW, 4, 2, true, false);

      ctx.restore();
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // caja 3D
      this.drawBox3D(ctx);

      // niño asomando
      this.drawKid(ctx);

      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  const kid = new KidInBox();
  const particles = [];

  window.addEventListener('resize', () => {
  const pad = 40;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  // Clampear posición por si el viewport se achicó
  kid.x = Math.max(pad, Math.min(w - pad, kid.x));
  kid.y = Math.max(pad, Math.min(h - pad, kid.y));
  // Elegir un target nuevo dentro del área válida
  kid.target = kid.randTarget();
}, { passive: true });


  // inputs
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  canvas.addEventListener('pointerleave', () => (pointer.active = false));

  function loop() {
    if (!running) return;
    const now = performance.now?.() || Date.now();
    const dt = clamp((now - last) / 1000, 0, 0.033);
    last = now;

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // update
    kid.update(dt);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update(dt);
      if (!p.alive) particles.splice(i, 1);
    }

    // draw behind
    for (let i = 0; i < particles.length; i++) particles[i].draw(ctx);

    // kid + box
    kid.draw(ctx);

    requestAnimationFrame(loop);
  }

  last = performance.now?.() || Date.now();
  requestAnimationFrame(loop);
})();