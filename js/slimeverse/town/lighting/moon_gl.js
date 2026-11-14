// moon_gl.js -- Real Lighting, WebGL2 half: ONE fullscreen fragment shader
// at 1x world pixels producing the ADDITIVE moonlight for the frame:
// - a rim bevel on every sprite edge that faces the moon (auto-normal from
//   the caster layer's alpha, posterized so it stays pixel art);
// - slow drifting light shafts falling from the top-left, fading with
//   distance from the moon and suppressed inside cast shadows;
// - interleaved-gradient-noise dither (no banding on dark gradients).
// It never reads the rendered frame back: inputs are the two small layers
// from shadows.js. Any failure (no WebGL2, compile error, context lost)
// turns this off and lighting/index.js falls back to Canvas2D.

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main() { vUV = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uCaster;
uniform sampler2D uShadow;
uniform vec2 uTexel;
uniform vec2 uOrigin;
uniform vec2 uSize;
uniform vec4 uView;
uniform vec3 uLight;
uniform float uRim;
uniform float uShafts;
uniform float uTime;
in vec2 vUV;
out vec4 outColor;
float A(vec2 d) { return texture(uCaster, vUV + d * uTexel).a; }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  float a = step(0.5, A(vec2(0.0)));
  float diag = 1.0 - A(vec2(-1.0, -1.0));
  float side = max(1.0 - A(vec2(-1.0, 0.0)), 1.0 - A(vec2(0.0, -1.0)));
  float deep = 1.0 - A(vec2(-2.0, -2.0));
  float rim = a * clamp(diag * 0.55 + side * 0.45 + deep * 0.3, 0.0, 1.0);
  rim = floor(rim * 3.0 + 0.5) / 3.0;
  float shade = texture(uShadow, vUV).a;
  vec2 world = uOrigin + vUV * uSize;
  vec2 sp = (world - uView.xy) / uView.zw;
  float u = (world.x - world.y) * 0.7071;
  float band = (sin(u * 0.042 + uTime * 0.13) * 0.5 + 0.5) * (sin(u * 0.0153 - uTime * 0.05 + 1.7) * 0.5 + 0.5);
  band = smoothstep(0.3, 1.0, band);
  float fall = clamp(1.0 - length(sp * vec2(0.8, 1.1)) * 0.8, 0.0, 1.0);
  float shafts = band * fall * uShafts * (1.0 - shade * 0.9);
  vec3 c = uLight * (rim * uRim * (1.0 - shade * 0.75) + shafts);
  c += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(max(c, vec3(0.0)), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
  return s;
}

export class MoonGL {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ok = false;
    this.error = null;
    try { this.setup(); } catch (err) { this.error = String(err && err.message || err); this.ok = false; }
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; this.error = 'context lost'; });
    this.canvas.addEventListener('webglcontextrestored', () => { try { this.setup(); this.error = null; } catch (err) { this.error = String(err); } });
  }

  setup() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = [this.texture(), this.texture()];
    this.u = {};
    for (const n of ['uCaster', 'uShadow', 'uTexel', 'uOrigin', 'uSize', 'uView', 'uLight', 'uRim', 'uShafts', 'uTime']) this.u[n] = gl.getUniformLocation(prog, n);
    this.ok = true;
  }

  texture() {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  upload(unit, tex, source) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  // Renders the light for `layers` (shadows.js frame) and returns the canvas.
  render(layers, view, light, t) {
    if (!this.ok || this.gl.isContextLost()) return null;
    const gl = this.gl;
    const { w, h } = layers;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    this.upload(0, this.tex[0], layers.caster);
    this.upload(1, this.tex[1], layers.shadow);
    const rgb = light.light.split(',').map((v) => Number(v) / 255);
    gl.uniform1i(this.u.uCaster, 0);
    gl.uniform1i(this.u.uShadow, 1);
    gl.uniform2f(this.u.uTexel, 1 / w, 1 / h);
    gl.uniform2f(this.u.uOrigin, layers.ox, layers.oy);
    gl.uniform2f(this.u.uSize, w, h);
    gl.uniform4f(this.u.uView, view.x, view.y, view.w, view.h);
    gl.uniform3f(this.u.uLight, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(this.u.uRim, light.rim);
    gl.uniform1f(this.u.uShafts, light.shafts);
    gl.uniform1f(this.u.uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.canvas;
  }

  dispose() {
    if (!this.gl) return;
    for (const t of this.tex || []) this.gl.deleteTexture(t);
    this.tex = this.ok ? [this.texture(), this.texture()] : [];
  }
}
