/* GridScan: vanilla Three.js (r128) port of the React Bits <GridScan> background, for the About section.
   Same fragment shader (perspective grid tunnel, ping-pong scan band, jitter, noise, glow halo,
   mouse-driven skew). Webcam/face tracking is off in our settings, so face-api.js is not loaded; the
   postprocessing bloom/chromatic passes are replaced by the shader's own glow halo. Renders only while
   on screen; reduced motion draws a single still frame. Usage: GridScan(container, { ...props }) */
(() => {
  "use strict";
  if (!window.THREE) return;
  const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const frag = `
precision highp float;
uniform vec3 iResolution; uniform float iTime; uniform vec2 uSkew; uniform float uTilt; uniform float uYaw;
uniform float uLineThickness; uniform vec3 uLinesColor; uniform vec3 uScanColor; uniform float uGridScale;
uniform float uLineJitter; uniform float uScanOpacity; uniform float uScanDirection; uniform float uNoise;
uniform float uBloomOpacity; uniform float uScanGlow; uniform float uScanSoftness; uniform float uPhaseTaper;
uniform float uScanDuration; uniform float uScanDelay;
varying vec2 vUv;
float smoother01(float a, float b, float x){ float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0); return t*t*t*(t*(t*6.0-15.0)+10.0); }
float gridLines(vec2 uv, float halfPx){
  float fx = fract(uv.x), fy = fract(uv.y);
  float ax = min(fx, 1.0 - fx), ay = min(fy, 1.0 - fy);
  float wx = fwidth(uv.x), wy = fwidth(uv.y);
  float lx = 1.0 - smoothstep(halfPx * wx, halfPx * wx + wx, ax);
  float ly = 1.0 - smoothstep(halfPx * wy, halfPx * wy + wy, ay);
  return max(lx, ly);
}
void main(){
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  vec3 ro = vec3(0.0); vec3 rd = normalize(vec3(p, 2.0));
  float cR = cos(uTilt), sR = sin(uTilt); rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;
  float cY = cos(uYaw), sY = sin(uYaw); rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;
  vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7)); rd.xy += skew * rd.z;
  float minT = 1e20; float gridScale = max(1e-5, uGridScale); vec2 gridUV = vec2(0.0); float hitIsY = 1.0;
  for (int i = 0; i < 4; i++) {
    float isY = float(i < 2);
    float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
    float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
    float den = isY * rd.y + (1.0 - isY) * rd.x;
    float t = num / den; vec3 h = ro + rd * t;
    float depthBoost = smoothstep(0.0, 3.0, h.z); h.xy += skew * 0.15 * depthBoost;
    bool use = t > 0.0 && t < minT;
    gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
    minT = use ? t : minT; hitIsY = use ? isY : hitIsY;
  }
  vec3 hit = ro + rd * minT; float dist = length(hit - ro);
  float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
  gridUV += vec2(sin(gridUV.y * 2.7 + iTime * 1.8), cos(gridUV.x * 2.3 - iTime * 1.6)) * (0.15 * jitterAmt);
  float halfPx = max(0.0, uLineThickness) * 0.5;
  float primaryMask = gridLines(gridUV, halfPx);
  vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
  gridUV2 += vec2(cos(gridUV2.y * 2.1 - iTime * 1.4), sin(gridUV2.x * 2.5 + iTime * 1.7)) * (0.15 * jitterAmt);
  float altMask = gridLines(gridUV2, halfPx);
  float edgeDistX = min(abs(hit.x + 0.5), abs(hit.x - 0.5));
  float edgeDistY = min(abs(hit.y + 0.2), abs(hit.y - 0.2));
  float edgeDist = mix(edgeDistY, edgeDistX, hitIsY);
  altMask *= 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDist);
  float lineMask = max(primaryMask, altMask);
  float fade = exp(-dist * 2.0);
  float dur = max(0.05, uScanDuration), del = max(0.0, uScanDelay);
  float sigma = max(0.001, 0.18 * max(0.1, uScanGlow) * uScanSoftness), sigmaA = sigma * 2.0;
  float phase = clamp((mod(iTime, dur + del) - del) / dur, 0.0, 1.0);
  if (uScanDirection > 0.5 && uScanDirection < 1.5) { phase = 1.0 - phase; }
  else if (uScanDirection > 1.5) { float t2 = mod(max(0.0, iTime - del), 2.0 * dur); phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur); }
  float dz = abs(hit.z - phase * 2.0);
  float taper = clamp(uPhaseTaper, 0.0, 0.49);
  float phaseWindow = smoother01(0.0, taper, phase) * (1.0 - smoother01(1.0 - taper, 1.0, phase));
  float op = clamp(uScanOpacity, 0.0, 1.0);
  float pulse = exp(-0.5 * dz * dz / (sigma * sigma)) * phaseWindow * op;
  float aura = exp(-0.5 * dz * dz / (sigmaA * sigmaA)) * 0.25 * phaseWindow * op;
  vec3 color = uLinesColor * lineMask * fade + uScanColor * (pulse + aura);
  float n = fract(sin(dot(gl_FragCoord.xy + vec2(iTime * 123.4), vec2(12.9898, 78.233))) * 43758.5453123);
  color = clamp(color + (n - 0.5) * uNoise, 0.0, 1.0);
  float alpha = clamp(max(lineMask, pulse), 0.0, 1.0);
  float fx = fract(gridUV.x), fy = fract(gridUV.y);
  float ax = min(fx, 1.0 - fx), ay = min(fy, 1.0 - fy);
  float wx = fwidth(gridUV.x), wy = fwidth(gridUV.y);
  float gx = 1.0 - smoothstep(halfPx * wx * 2.0, halfPx * wx * 2.0 + wx * 2.0, ax);
  float gy = 1.0 - smoothstep(halfPx * wy * 2.0, halfPx * wy * 2.0 + wy * 2.0, ay);
  alpha = max(alpha, max(gx, gy) * fade * clamp(uBloomOpacity, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}`;

  window.GridScan = function (container, o) {
    const opt = Object.assign({ sensitivity: 0.55, lineThickness: 1, linesColor: "#2F293A", gridScale: 0.1, scanColor: "#FF9FFC",
      scanOpacity: 0.4, bloomIntensity: 0.6, noiseIntensity: 0.01, lineJitter: 0.1, scanGlow: 0.5, scanSoftness: 2,
      scanPhaseTaper: 0.9, scanDuration: 2, scanDelay: 2, scanDirection: "pingpong" }, o);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement; canvas.className = "gridscan-canvas"; container.appendChild(canvas);
    const col = hex => new THREE.Color(hex).convertSRGBToLinear();
    const u = {
      iResolution: { value: new THREE.Vector3() }, iTime: { value: 0 }, uSkew: { value: new THREE.Vector2() }, uTilt: { value: 0 }, uYaw: { value: 0 },
      uLineThickness: { value: opt.lineThickness }, uLinesColor: { value: col(opt.linesColor) }, uScanColor: { value: col(opt.scanColor) },
      uGridScale: { value: opt.gridScale }, uLineJitter: { value: opt.lineJitter }, uScanOpacity: { value: opt.scanOpacity },
      uScanDirection: { value: opt.scanDirection === "backward" ? 1 : opt.scanDirection === "pingpong" ? 2 : 0 },
      uNoise: { value: opt.noiseIntensity }, uBloomOpacity: { value: opt.bloomIntensity }, uScanGlow: { value: opt.scanGlow },
      uScanSoftness: { value: opt.scanSoftness }, uPhaseTaper: { value: opt.scanPhaseTaper }, uScanDuration: { value: opt.scanDuration }, uScanDelay: { value: opt.scanDelay }
    };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, depthTest: false });
    mat.extensions = { derivatives: true };
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      u.iResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio(), renderer.getPixelRatio());
    };
    new ResizeObserver(resize).observe(container); resize();

    // pointer-driven skew, eased (the original's smoothDamp, simplified)
    const s = Math.min(Math.max(opt.sensitivity, 0), 1), lerp = (a, b, t) => a + (b - a) * t;
    const skewScale = lerp(0.06, 0.2, s), yBoost = lerp(1.2, 1.6, s), ease = lerp(0.04, 0.16, s);
    let tx = 0, ty = 0, cx = 0, cy = 0, visible = true;
    const host = container.closest("section") || container;
    host.addEventListener("pointermove", e => { const r = container.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = -(((e.clientY - r.top) / r.height) * 2 - 1); });
    host.addEventListener("pointerleave", () => { setTimeout(() => { tx = ty = 0; }, 250); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

    function frame(now) {
      cx += (tx - cx) * ease; cy += (ty - cy) * ease;
      u.uSkew.value.set(cx * skewScale, -cy * yBoost * skewScale);
      u.iTime.value = now / 1000;
      renderer.render(scene, cam);
    }
    if (reduce) { frame(5000); return; }
    (function loop(t) { requestAnimationFrame(loop); if (visible) frame(t); })(performance.now());
  };
})();
