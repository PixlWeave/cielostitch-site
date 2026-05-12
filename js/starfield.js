/* Animated starfield — renders on a <canvas id="starfield"> */

(function () {
  'use strict';

  const STAR_COUNT   = 320;
  const TWINKLE_PROB = 0.004; // probability a star starts a twinkle each frame
  const FPS_CAP      = 60;

  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* ---------- helpers ---------- */
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /* ---------- star factory ---------- */
  function makeStar(w, h) {
    return {
      x:        rand(0, w),
      y:        rand(0, h),
      radius:   rand(0.4, 1.8),
      baseAlpha: rand(0.35, 1.0),
      alpha:    rand(0.35, 1.0),
      // twinkle state
      twinkle:  false,
      twinkleDir: 1,
      twinkleDelta: rand(0.02, 0.05),
      // slow drift
      vx:       rand(-0.04, 0.04),
      vy:       rand(-0.02, 0.02),
    };
  }

  /* ---------- state ---------- */
  let stars = [];
  let rafId = null;
  let lastTime = 0;
  const frameDuration = 1000 / FPS_CAP;

  /* ---------- resize ---------- */
  function resize() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Repopulate stars to fill the new canvas dimensions
    stars = Array.from({ length: STAR_COUNT }, () => makeStar(w, h));
  }

  /* ---------- draw ---------- */
  function draw(w, h) {
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 248, 220, ${s.alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  /* ---------- update ---------- */
  function update(w, h) {
    for (const s of stars) {
      // drift
      s.x += s.vx;
      s.y += s.vy;

      // wrap
      if (s.x < -2)   s.x = w + 2;
      if (s.x > w + 2) s.x = -2;
      if (s.y < -2)   s.y = h + 2;
      if (s.y > h + 2) s.y = -2;

      // random twinkle trigger
      if (!s.twinkle && Math.random() < TWINKLE_PROB) {
        s.twinkle = true;
        s.twinkleDir = -1; // start by fading out
      }

      // twinkle animation
      if (s.twinkle) {
        s.alpha += s.twinkleDir * s.twinkleDelta;
        if (s.alpha <= 0.1) { s.twinkleDir =  1; }
        if (s.alpha >= s.baseAlpha) {
          s.alpha   = s.baseAlpha;
          s.twinkle = false;
        }
      }
    }
  }

  /* ---------- loop ---------- */
  function loop(timestamp) {
    rafId = requestAnimationFrame(loop);
    if (timestamp - lastTime < frameDuration) return;
    lastTime = timestamp;

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    update(w, h);
    draw(w, h);
  }

  /* ---------- init ---------- */
  function init() {
    resize();
    loop(0);
  }

  /* Debounced resize handler */
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  /* Start after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Pause animation when tab is hidden to save resources */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      lastTime = 0;
      loop(0);
    }
  });
}());
