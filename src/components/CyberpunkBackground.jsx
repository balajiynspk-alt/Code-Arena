import React, { useEffect, useRef } from 'react';

const CyberpunkBackground = () => {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let animationFrameId;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();

    const handleResize = () => {
      resize();
      build();
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px';
        glowRef.current.style.top = e.clientY + 'px';
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    function mkP() {
      const colors = [
        [0, 255, 136],   // #00ff88
        [0, 204, 255],   // #00ccff
        [255, 255, 255]  // #ffffff
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 1, // min 1, max 2
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        alpha: 0.7, // opacity 0.7
      };
    }

    function build() {
      const count = 500; // exactly 500 particles
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(mkP());
      }
    }
    build();

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const n = particles.length;

      /* particles */
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const [r, g, b] = p.color;

        /* core dot */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();

        /* move */
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        /* mouse repel (distance 100) */
        if (mouse.x > 0) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100 && d > 0) {
            const force = (100 - d) / 100;
            p.x += (dx / d) * force * 3.5;
            p.y += (dy / d) * force * 3.5;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        id="bg-canvas"
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div
        id="cursor-glow"
        ref={glowRef}
        style={{
          position: 'fixed',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 204, 255, 0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.08s, top 0.08s',
          left: '-9999px',
          top: '-9999px'
        }}
      />
    </>
  );
};

export default CyberpunkBackground;
