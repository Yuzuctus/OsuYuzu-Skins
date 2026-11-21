import React, { useEffect, useRef, useState } from 'react';
import { HARU_BANDS, HARU_FPS, HARU_FRAMES, HARU_SPECTRUM } from '../../data/haruSpectrum';
import type { FilmMode } from '../tokens';

export interface SolarizedShaderParams {
  apertureMode: 'loupe' | 'prism';
  loupeRadius: number;     // 0.08 .. 0.30 (rayon de la loupe circulaire)
  bandWidth: number;       // 0.08 .. 0.38 (largeur du prisme oblique)
  solarizeCurve: number;   // 0.0 .. 1.0
  mirageWave: number;      // 0.0 .. 1.0 (ondulation mirage thermique du désert)
  dispersion: number;      // 0.0 .. 1.0 (prisme chromatique RGB)
  grain: number;           // 0.0 .. 0.18
  edgeClean: number;       // 0.0 .. 1.0
  audioReactive: boolean;
}

export const DEFAULT_SOLARIZED_PARAMS: SolarizedShaderParams = {
  apertureMode: 'loupe',
  loupeRadius: 0.155,
  bandWidth: 0.17,
  solarizeCurve: 0.50,
  mirageWave: 0.42,
  dispersion: 0.62,
  grain: 0.048,
  edgeClean: 0,
  audioReactive: true,
};

interface SolarizedStageProps {
  src: string;
  alt: string;
  film: FilmMode;
  params?: Partial<SolarizedShaderParams>;
  fit?: 'contain' | 'cover';
  className?: string;
  interactive?: boolean;
  trackWindow?: boolean;
  tilt3d?: boolean;
  invertBaseInDark?: boolean;
}

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_imgRes;
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_time;
uniform float u_invertBase;
uniform float u_apertureMode;
uniform float u_loupeRadius;
uniform float u_bandWidth;
uniform float u_solarize;
uniform float u_mirage;
uniform float u_dispersion;
uniform float u_grain;
uniform float u_edgeClean;
uniform float u_energy;
uniform float u_cover;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 fitUv(vec2 uv, vec2 res, vec2 imgRes, float isCover) {
  float canvasAspect = res.x / max(res.y, 1.0);
  float imgAspect = imgRes.x / max(imgRes.y, 1.0);
  vec2 scale = vec2(1.0);
  if (isCover > 0.5) {
    if (canvasAspect > imgAspect) scale.y = imgAspect / canvasAspect;
    else scale.x = canvasAspect / imgAspect;
  } else {
    if (canvasAspect > imgAspect) scale.x = canvasAspect / imgAspect;
    else scale.y = imgAspect / canvasAspect;
  }
  vec2 centered = (uv - 0.5) * scale + 0.5;
  return vec2(centered.x, 1.0 - centered.y);
}

vec4 samplePremult(vec2 uv) {
  vec4 t = texture2D(u_tex, uv);
  if (t.a <= 0.0005) return vec4(0.0);
  return vec4(clamp(t.rgb / t.a, 0.0, 1.0), t.a);
}

vec4 sampleCleanCutout(vec2 uv, float cleanStrength) {
  vec4 center = samplePremult(uv);
  if (cleanStrength < 0.01) return center;

  vec2 tx = 1.0 / max(u_imgRes, vec2(1.0));
  float r = mix(1.0, 2.0, cleanStrength);
  vec4 n0 = samplePremult(clamp(uv + vec2( r,  0.0) * tx, 0.0, 1.0));
  vec4 n1 = samplePremult(clamp(uv + vec2(-r,  0.0) * tx, 0.0, 1.0));
  vec4 n2 = samplePremult(clamp(uv + vec2( 0.0,  r) * tx, 0.0, 1.0));
  vec4 n3 = samplePremult(clamp(uv + vec2( 0.0, -r) * tx, 0.0, 1.0));

  float minA = min(min(n0.a, n1.a), min(n2.a, n3.a));
  float avgA = (n0.a + n1.a + n2.a + n3.a) * 0.25;

  float eroded = min(center.a, mix(center.a, minA * 0.5 + avgA * 0.5, cleanStrength));
  float finalA = smoothstep(0.20 + cleanStrength * 0.30, 0.90, eroded);

  float lum = dot(center.rgb, vec3(0.299, 0.587, 0.114));
  float maxC = max(center.r, max(center.g, center.b));
  float minC = min(center.r, min(center.g, center.b));
  float sat = (maxC - minC) / max(maxC, 0.001);
  float isOuterEdge = 1.0 - smoothstep(0.78, 0.98, minA);
  float isWhiteMatte = smoothstep(0.72, 0.95, lum) * (1.0 - smoothstep(0.08, 0.28, sat));

  finalA *= 1.0 - (isOuterEdge * isWhiteMatte * cleanStrength * 0.95);
  return vec4(center.rgb, finalA);
}

// Solarisation chromatique minérale (zéro violet générique : émeraude inversé, corail, sable-or)
vec3 solarizeDesert(vec3 rgb, float curve) {
  vec3 inv = smoothstep(0.03, 0.97, 1.0 - rgb);
  // Harmonisation vers l'encre chaude / corail / menthe-cyan
  vec3 sab = pow(abs(rgb * 2.0 - 1.0), vec3(0.88));
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  vec3 desertTint = mix(vec3(0.36, 0.95, 0.74), vec3(0.99, 0.44, 0.54), smoothstep(0.2, 0.85, lum));
  vec3 outCol = mix(inv, inv * 0.72 + (1.0 - sab) * desertTint * 0.52, curve);
  return clamp(outCol, 0.0, 1.0);
}

void main() {
  float insideMask = 0.0;
  float edgeGlow = 0.0;
  vec2 dispDir = vec2(0.92, 0.39);

  if (u_apertureMode < 0.5) {
    vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
    vec2 radial = (v_uv - u_mouse) * aspect;
    float rDist = length(radial);
    float halfR = u_loupeRadius * (1.0 + u_energy * 0.14);
    float softness = 0.018;
    insideMask = (1.0 - smoothstep(halfR - softness, halfR + softness, rDist)) * u_mouseActive;
    edgeGlow = smoothstep(halfR - 0.013, halfR, rDist)
             * (1.0 - smoothstep(halfR, halfR + 0.011, rDist))
             * u_mouseActive;
    dispDir = normalize(radial + vec2(0.0001, 0.0));
  } else {
    vec2 delta = v_uv - u_mouse;
    float proj = delta.x * 0.92 + delta.y * 0.39;
    float bandDist = abs(proj);
    float halfW = u_bandWidth * (1.0 + u_energy * 0.18);
    float softness = 0.028;
    insideMask = (1.0 - smoothstep(halfW - softness, halfW + softness, bandDist)) * u_mouseActive;
    edgeGlow = smoothstep(halfW - 0.016, halfW, bandDist)
             * (1.0 - smoothstep(halfW, halfW + 0.014, bandDist))
             * u_mouseActive;
    dispDir = vec2(0.92, 0.39);
  }

  float heatRipple = sin(v_uv.y * 28.0 - u_time * 4.5 + v_uv.x * 9.0)
                   * 0.0065 * u_mirage * insideMask;
  vec2 warpedUv = v_uv + vec2(heatRipple, heatRipple * 0.35);

  float shift = (edgeGlow * 0.014 + insideMask * 0.0042) * u_dispersion;
  vec2 rUv = fitUv(warpedUv + dispDir * shift, u_res, u_imgRes, u_cover);
  vec2 gUv = fitUv(warpedUv, u_res, u_imgRes, u_cover);
  vec2 bUv = fitUv(warpedUv - dispDir * shift, u_res, u_imgRes, u_cover);

  if (gUv.x < 0.0 || gUv.x > 1.0 || gUv.y < 0.0 || gUv.y > 1.0) {
    discard;
  }

  vec4 clean = sampleCleanCutout(gUv, u_edgeClean);
  float alpha = clean.a;

  if (u_cover < 0.5) {
    alpha *= smoothstep(0.0, 0.075, 1.0 - gUv.y) * smoothstep(0.0, 0.025, gUv.y);
  }
  if (alpha < 0.004) {
    discard;
  }

  vec3 baseRgb = clean.rgb;
  if (shift > 0.0005) {
    vec4 rS = samplePremult(clamp(rUv, 0.0, 1.0));
    vec4 bS = samplePremult(clamp(bUv, 0.0, 1.0));
    float rCh = mix(clean.r, rS.r, rS.a);
    float bCh = mix(clean.b, bS.b, bS.a);
    baseRgb = mix(baseRgb, vec3(rCh, clean.g, bCh), 0.78 * alpha);
  }

  vec3 solRgb = solarizeDesert(baseRgb, u_solarize);
  float solMix = abs(u_invertBase - insideMask);
  vec3 color = mix(baseRgb, solRgb, solMix);

  vec3 rimTint = mix(vec3(0.97, 0.87, 0.29), vec3(0.36, 0.95, 0.74), u_invertBase);
  color = mix(color, rimTint, edgeGlow * 0.58);

  float gFrame = floor(u_time * 18.0);
  float gNoise = hash12(gl_FragCoord.xy + vec2(gFrame * 13.7, gFrame * 7.3)) - 0.5;
  color += gNoise * u_grain * (0.65 + solMix * 0.55);

  vec3 finalRgb = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(finalRgb * alpha, alpha);
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

export const SolarizedStage: React.FC<SolarizedStageProps> = ({
  src,
  alt,
  film,
  params,
  fit = 'contain',
  className = '',
  interactive = true,
  trackWindow = false,
  invertBaseInDark = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);

  const mergedRef = useRef<SolarizedShaderParams>({ ...DEFAULT_SOLARIZED_PARAMS, ...params });
  mergedRef.current = { ...DEFAULT_SOLARIZED_PARAMS, ...params };

  const invertTargetRef = useRef(invertBaseInDark && film === 'negative' ? 1 : 0);
  invertTargetRef.current = invertBaseInDark && film === 'negative' ? 1 : 0;

  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    wakeRef.current?.();
  }, [film, invertBaseInDark, params]);

  useEffect(() => {
    setFallback(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctxAttrs: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    };
    const gl =
      (canvas.getContext('webgl2', ctxAttrs) as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl', ctxAttrs) as WebGLRenderingContext | null);

    if (!gl) {
      setFallback(true);
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }

    const prog = gl.createProgram();
    if (!prog) {
      setFallback(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      res: gl.getUniformLocation(prog, 'u_res'),
      imgRes: gl.getUniformLocation(prog, 'u_imgRes'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      mouseActive: gl.getUniformLocation(prog, 'u_mouseActive'),
      time: gl.getUniformLocation(prog, 'u_time'),
      invertBase: gl.getUniformLocation(prog, 'u_invertBase'),
      apertureMode: gl.getUniformLocation(prog, 'u_apertureMode'),
      loupeRadius: gl.getUniformLocation(prog, 'u_loupeRadius'),
      bandWidth: gl.getUniformLocation(prog, 'u_bandWidth'),
      solarize: gl.getUniformLocation(prog, 'u_solarize'),
      mirage: gl.getUniformLocation(prog, 'u_mirage'),
      dispersion: gl.getUniformLocation(prog, 'u_dispersion'),
      grain: gl.getUniformLocation(prog, 'u_grain'),
      edgeClean: gl.getUniformLocation(prog, 'u_edgeClean'),
      energy: gl.getUniformLocation(prog, 'u_energy'),
      cover: gl.getUniformLocation(prog, 'u_cover'),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let imgW = 1;
    let imgH = 1;
    let cssW = 1;
    let cssH = 1;
    let bufInitialized = false;
    let resizeTimer = 0;
    let texReady = false;
    let disposed = false;
    let rafId = 0;

    const ptr = {
      tx: 0.5,
      ty: 0.5,
      x: 0.5,
      y: 0.5,
      activeTarget: 0,
      active: 0,
    };

    let isVisible = true;
    let invCur = invertTargetRef.current;
    const start = performance.now();

    function drawNow(now: number) {
      if (disposed || !texReady || !gl || !canvas) return;

      const t = (now - start) * 0.001;
      const p = mergedRef.current;

      ptr.x += (ptr.tx - ptr.x) * 0.16;
      ptr.y += (ptr.ty - ptr.y) * 0.16;
      ptr.active += (ptr.activeTarget - ptr.active) * 0.14;
      invCur += (invertTargetRef.current - invCur) * 0.15;

      let energy = 0;
      if (p.audioReactive && ptr.active > 0.02) {
        const frame = Math.floor(t * HARU_FPS) % HARU_FRAMES;
        const off = frame * HARU_BANDS;
        let sum = 0;
        for (let b = 2; b < 14; b++) sum += HARU_SPECTRUM[off + b] ?? 0;
        energy = Math.min(1, sum / (12 * 190));
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(loc.res, cssW, cssH);
      gl.uniform2f(loc.imgRes, imgW, imgH);
      gl.uniform2f(loc.mouse, ptr.x, ptr.y);
      gl.uniform1f(loc.mouseActive, ptr.active);
      gl.uniform1f(loc.time, t);
      gl.uniform1f(loc.invertBase, invCur);
      gl.uniform1f(loc.apertureMode, p.apertureMode === 'prism' ? 1 : 0);
      gl.uniform1f(loc.loupeRadius, p.loupeRadius);
      gl.uniform1f(loc.bandWidth, p.bandWidth);
      gl.uniform1f(loc.solarize, p.solarizeCurve);
      gl.uniform1f(loc.mirage, p.mirageWave);
      gl.uniform1f(loc.dispersion, p.dispersion);
      gl.uniform1f(loc.grain, p.grain);
      gl.uniform1f(loc.edgeClean, p.edgeClean);
      gl.uniform1f(loc.energy, energy);
      gl.uniform1f(loc.cover, fit === 'cover' ? 1 : 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    const scheduleRender = () => {
      if (!disposed && !rafId && isVisible && texReady) {
        rafId = requestAnimationFrame(render);
      }
    };
    wakeRef.current = scheduleRender;

    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (disposed) return;
      imgW = img.naturalWidth || 1;
      imgH = img.naturalHeight || 1;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texReady = true;
      drawNow(performance.now());
      scheduleRender();
    };
    img.onerror = () => {
      if (!disposed) setFallback(true);
    };
    img.src = src;

    const onMove = (e: MouseEvent | PointerEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;
      ptr.tx = nx;
      ptr.ty = ny;
      ptr.activeTarget = nx >= -0.15 && nx <= 1.15 && ny >= -0.1 && ny <= 1.1 ? 1 : 0;
      scheduleRender();
    };

    const onLeave = () => {
      ptr.activeTarget = 0;
      scheduleRender();
    };

    if (trackWindow) {
      window.addEventListener('pointermove', onMove as EventListener, { passive: true });
      window.addEventListener('mousemove', onMove as EventListener, { passive: true });
      document.addEventListener('mouseleave', onLeave);
    } else {
      canvas.addEventListener('pointermove', onMove as EventListener, { passive: true });
      canvas.addEventListener('mousemove', onMove as EventListener, { passive: true });
      canvas.addEventListener('mouseleave', onLeave);
    }

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) scheduleRender();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const resize = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const targetW = Math.max(1, Math.round(cssW * dpr));
      const targetH = Math.max(1, Math.round(cssH * dpr));

      if (!bufInitialized) {
        bufInitialized = true;
        canvas.width = targetW;
        canvas.height = targetH;
        gl.viewport(0, 0, targetW, targetH);
        drawNow(performance.now());
        return;
      }

      // Redessine immédiatement avec le nouveau ratio CSS (u_res) sans vider le buffer WebGL.
      // Cela empêche tout clignotement pendant l'ouverture de la barre compacte d'Helium ou le redimensionnement.
      drawNow(performance.now());

      if (Math.abs(canvas.width - targetW) > 140 || Math.abs(canvas.height - targetH) > 140) {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (disposed) return;
          canvas.width = targetW;
          canvas.height = targetH;
          gl.viewport(0, 0, targetW, targetH);
          drawNow(performance.now());
        }, 220);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function render(now: number) {
      rafId = 0;
      if (disposed || !isVisible || !texReady || !gl) return;

      drawNow(now);

      const stillMoving =
        Math.abs(ptr.tx - ptr.x) > 0.0005 ||
        Math.abs(ptr.ty - ptr.y) > 0.0005 ||
        Math.abs(ptr.activeTarget - ptr.active) > 0.004 ||
        Math.abs(invertTargetRef.current - invCur) > 0.004 ||
        ptr.active > 0.02;

      if (stillMoving) {
        rafId = requestAnimationFrame(render);
      }
    }

    return () => {
      disposed = true;
      wakeRef.current = null;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (rafId) cancelAnimationFrame(rafId);
      if (trackWindow) {
        window.removeEventListener('pointermove', onMove as EventListener);
        window.removeEventListener('mousemove', onMove as EventListener);
        document.removeEventListener('mouseleave', onLeave);
      } else {
        canvas.removeEventListener('pointermove', onMove as EventListener);
        canvas.removeEventListener('mousemove', onMove as EventListener);
        canvas.removeEventListener('mouseleave', onLeave);
      }
      io.disconnect();
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [src, fit, interactive, trackWindow]);

  if (fallback) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: '100%', height: '100%', objectFit: fit }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: interactive ? 'crosshair' : 'default',
      }}
    />
  );
};
