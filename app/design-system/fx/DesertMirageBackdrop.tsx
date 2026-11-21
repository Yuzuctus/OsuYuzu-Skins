import React, { useEffect, useRef } from 'react';
import { HARU_BANDS, HARU_FPS, HARU_FRAMES, HARU_SPECTRUM } from '../../data/haruSpectrum';
import type { FilmMode } from '../tokens';

interface DesertMirageBackdropProps {
  film: FilmMode;
  audioReactive?: boolean;
  fixed?: boolean;
}

const BG_VERT = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const BG_FRAG = `
precision mediump float;
varying vec2 vUv;

uniform float uTime;
uniform float uDark;
uniform vec2 uMouse;
uniform float uEnergy;
uniform vec2 uRes;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = rot * p * 1.9;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 m = (uMouse - 0.5) * aspect;

  float t = uTime * 0.12;

  vec2 q = vec2(fbm(p * 1.15 + vec2(t, -t * 0.6)), fbm(p * 1.15 + vec2(-t * 0.7, t * 0.8) + 4.2));
  float mist = fbm(p * 1.35 + q * 1.35 + m * 0.18);
  float centerGlow = exp(-dot(p * vec2(0.8, 1.05), p * vec2(0.8, 1.05)) * 1.15);
  float mouseWash = exp(-dot(p - m, p - m) * 1.9) * (0.18 + uEnergy * 0.12);

  vec3 dayBase = vec3(0.961, 0.933, 0.878);
  vec3 dayMint = vec3(0.76, 0.94, 0.87);
  vec3 dayYuzu = vec3(0.97, 0.90, 0.56);
  vec3 daySand = vec3(0.92, 0.84, 0.70);

  vec3 dayCol = dayBase;
  dayCol = mix(dayCol, dayMint, smoothstep(0.32, 0.82, mist) * 0.42);
  dayCol = mix(dayCol, daySand, smoothstep(0.78, 0.0, uv.y) * 0.34);
  dayCol = mix(dayCol, dayYuzu, mouseWash * 0.65);

  vec3 nightBase = vec3(0.039, 0.052, 0.048);
  vec3 nightJade = vec3(0.075, 0.215, 0.165);
  vec3 nightWarm = vec3(0.165, 0.130, 0.068);
  vec3 nightOasis = vec3(0.055, 0.155, 0.205);

  vec3 nightCol = nightBase;
  nightCol += nightJade * smoothstep(0.28, 0.82, mist) * (0.45 + centerGlow * 0.35);
  nightCol += nightOasis * smoothstep(0.45, 0.90, q.x) * 0.22;
  nightCol += nightWarm * smoothstep(0.85, 0.05, uv.y) * 0.28;
  nightCol += vec3(0.16, 0.44, 0.34) * mouseWash;

  vec3 col = mix(dayCol, nightCol, uDark);

  float vig = smoothstep(1.55, 0.38, length(p));
  col *= mix(0.84, 1.0, vig);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export const DesertMirageBackdrop: React.FC<DesertMirageBackdropProps> = ({
  film,
  audioReactive = true,
  fixed = false,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const darkTargetRef = useRef(film === 'negative' ? 1 : 0);
  darkTargetRef.current = film === 'negative' ? 1 : 0;

  const audioRef = useRef(audioReactive);
  audioRef.current = audioReactive;

  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    wakeRef.current?.();
  }, [film]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const ctxAttrs: WebGLContextAttributes = {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    };
    const gl =
      (canvas.getContext('webgl2', ctxAttrs) as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl', ctxAttrs) as WebGLRenderingContext | null);

    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, BG_VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, BG_FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uDark: gl.getUniformLocation(prog, 'uDark'),
      uMouse: gl.getUniformLocation(prog, 'uMouse'),
      uEnergy: gl.getUniformLocation(prog, 'uEnergy'),
      uRes: gl.getUniformLocation(prog, 'uRes'),
    };

    // Tampon WebGL interne fixe : évite toute réallocation/effacement du canvas lors des redimensionnements
    // (notamment la barre compacte d'Helium ou le redimensionnement de fenêtre).
    const screenW = typeof window !== 'undefined' && window.screen?.width ? window.screen.width : 1440;
    const screenH = typeof window !== 'undefined' && window.screen?.height ? window.screen.height : 900;
    const bufW = Math.min(1024, Math.max(512, Math.round(screenW * 0.55)));
    const bufH = Math.min(640, Math.max(320, Math.round(screenH * 0.55)));
    canvas.width = bufW;
    canvas.height = bufH;
    gl.viewport(0, 0, bufW, bufH);
    host.appendChild(canvas);

    const mouseTarget = { x: 0.5, y: 0.5 };
    const mouseCur = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      mouseTarget.x = e.clientX / Math.max(window.innerWidth, 1);
      mouseTarget.y = 1 - e.clientY / Math.max(window.innerHeight, 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const start = performance.now();
    let darkCur = darkTargetRef.current;
    let resW = Math.max(1, host.clientWidth);
    let resH = Math.max(1, host.clientHeight);
    let rafId = 0;
    let disposed = false;
    let lastDraw = 0;

    const drawFrame = (now: number) => {
      if (disposed) return;
      lastDraw = now;

      const t = (now - start) * 0.001;
      mouseCur.x += (mouseTarget.x - mouseCur.x) * 0.08;
      mouseCur.y += (mouseTarget.y - mouseCur.y) * 0.08;
      darkCur += (darkTargetRef.current - darkCur) * 0.28;
      if (Math.abs(darkTargetRef.current - darkCur) < 0.005) {
        darkCur = darkTargetRef.current;
      }

      let energy = 0;
      if (audioRef.current) {
        const frame = Math.floor(t * HARU_FPS) % HARU_FRAMES;
        const off = frame * HARU_BANDS;
        let sum = 0;
        for (let b = 2; b < 14; b++) sum += HARU_SPECTRUM[off + b] ?? 0;
        energy = Math.min(1, sum / (12 * 195));
      }

      gl.uniform1f(loc.uTime, t);
      gl.uniform1f(loc.uDark, darkCur);
      gl.uniform2f(loc.uMouse, mouseCur.x, mouseCur.y);
      gl.uniform1f(loc.uEnergy, energy);
      gl.uniform2f(loc.uRes, resW, resH);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    wakeRef.current = () => drawFrame(performance.now());

    const resize = () => {
      if (disposed) return;
      resW = Math.max(1, host.clientWidth);
      resH = Math.max(1, host.clientHeight);
      drawFrame(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const tick = (now: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(tick);

      if (fixed && window.scrollY > window.innerHeight * 1.15) return;

      const dt = now - lastDraw;
      if (dt < 31 && Math.abs(darkTargetRef.current - darkCur) < 0.01) return;

      drawFrame(now);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      wakeRef.current = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (canvas.parentNode === host) {
        host.removeChild(canvas);
      }
    };
  }, [fixed]);

  const isNeg = film === 'negative';
  const fallbackBg = isNeg
    ? 'radial-gradient(ellipse 75% 65% at 50% 44%, rgba(22, 68, 52, 0.42) 0%, rgba(11, 15, 14, 0.96) 72%, #0b0f0e 100%)'
    : 'radial-gradient(ellipse 75% 65% at 50% 44%, rgba(194, 240, 221, 0.45) 0%, rgba(245, 238, 224, 0.96) 72%, #f5eee0 100%)';

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: fixed ? 'var(--bg-veil, 1)' : 1,
        background: fallbackBg,
      }}
    />
  );
};
