// Detalle procedural en el sombreador: enlucido, sillares, madera, roca, tierra y pelaje.
// Se añade a materiales existentes con onBeforeCompile, sin texturas extra.
import * as THREE from 'three';

const NOISE = /* glsl */`
float dh_hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dh_noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dh_hash(i + vec3(0,0,0)), dh_hash(i + vec3(1,0,0)), f.x), mix(dh_hash(i + vec3(0,1,0)), dh_hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dh_hash(i + vec3(0,0,1)), dh_hash(i + vec3(1,0,1)), f.x), mix(dh_hash(i + vec3(0,1,1)), dh_hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float dh_fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * dh_noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
// sillares: devuelve (altura, id de bloque)
vec2 dh_bricks(vec2 uv, vec2 size){ vec2 g = uv / size; float row = floor(g.y); g.x += mod(row, 2.0) * 0.5; vec2 id = floor(g); vec2 f = fract(g);
  vec2 e = min(f, 1.0 - f) * size; float m = smoothstep(0.0, 0.035, min(e.x, e.y)); return vec2(m, dh_hash(vec3(id, 3.7))); }
`;

// mode: 'surf' (atributo surf por vértice), 'terrain', 'fur', 'rock', 'plaster'
export function addDetail(material, { mode = 'surf', scale = 1, bump = 1, objectSpace = false } = {}) {
  material.userData.detail = { mode, scale, bump };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uDScale = { value: scale }; sh.uniforms.uDBump = { value: bump };
    let vdecl = '\nvarying vec3 vDPos;\nvarying vec3 vDNrm;\n';
    if (mode === 'surf') vdecl += 'attribute float surf;\nvarying float vSurf;\n';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + vdecl);
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${objectSpace ? 'vDPos = position; vDNrm = normal;' : `
      { vec4 dp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          dp = instanceMatrix * dp;
        #endif
        vDPos = (modelMatrix * dp).xyz; vDNrm = normalize(mat3(modelMatrix) * normal); }`}
      ${mode === 'surf' ? 'vSurf = surf;' : ''}`);
    let fdecl = '\nuniform float uDScale;\nuniform float uDBump;\nvarying vec3 vDPos;\nvarying vec3 vDNrm;\n' + (mode === 'surf' ? 'varying float vSurf;\n' : '') + NOISE;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + fdecl);
    // cálculo de la altura de detalle y modulación del color
    let body = '';
    if (mode === 'surf') body = /* glsl */`
      int st = int(vSurf + 0.5);
      vec3 an = abs(normalize(vDNrm));
      vec2 puv = an.y > max(an.x, an.z) ? p.xz : (an.x > an.z ? p.zy : p.xy);
      if (st == 1) { // sillar de piedra
        vec2 b = dh_bricks(puv, vec2(0.62, 0.36));
        float n = dh_fbm(p * 7.0);
        dHeight = b.x * 0.6 + n * 0.4;
        dCol = mix(0.62, 1.0, b.x) * (0.88 + 0.22 * b.y) * (0.9 + 0.2 * n);
      } else if (st == 2) { // madera
        float g = dh_fbm(vec3(p.x * 2.5, p.y * 0.35 + p.x * 0.2, p.z * 2.5) * 6.0);
        float rings = sin((p.x + p.z) * 60.0 + g * 9.0) * 0.5 + 0.5;
        dHeight = rings * 0.5 + g * 0.5;
        dCol = 0.78 + 0.28 * g + 0.08 * rings;
      } else if (st == 3) { // tela
        float w = sin(puv.x * 900.0) * sin(puv.y * 900.0);
        dHeight = 0.5 + w * 0.15 + dh_noise(p * 40.0) * 0.2; dCol = 0.92 + 0.1 * dh_noise(p * 8.0) + 0.04 * w;
      } else if (st == 4) { // roca natural
        float n = dh_fbm(p * 1.6); float c = dh_fbm(p * 6.0 + 3.0);
        dHeight = n * 0.6 + c * 0.4; dCol = 0.72 + 0.4 * n + 0.12 * c;
      } else { // enlucido de cal
        float big = dh_fbm(p * 0.45); float mid = dh_fbm(p * 3.0); float fine = dh_noise(p * 28.0);
        dHeight = mid * 0.6 + fine * 0.4;
        dCol = 0.9 + 0.12 * mid + 0.04 * fine - 0.1 * smoothstep(0.55, 0.85, big);
      }`;
    else if (mode === 'terrain') body = /* glsl */`
      float big = dh_fbm(p * 0.08); float mid = dh_fbm(p * 0.7); float fine = dh_noise(p * 6.0); float vfine = dh_noise(p * 22.0);
      dHeight = mid * 0.4 + fine * 0.35 + vfine * 0.25;
      dCol = 0.84 + 0.2 * big + 0.12 * mid + 0.08 * fine + 0.05 * vfine;`;
    else if (mode === 'fur') body = /* glsl */`
      float s = dh_noise(vec3(p.x * 90.0, p.y * 18.0, p.z * 90.0)); float m = dh_fbm(p * 9.0);
      dHeight = s * 0.6 + m * 0.4; dCol = 0.86 + 0.16 * s + 0.12 * m;`;
    else if (mode === 'rock') body = /* glsl */`
      float n = dh_fbm(p * 1.4); float c = dh_fbm(p * 5.0 + 3.0); float f = dh_noise(p * 24.0);
      dHeight = n * 0.5 + c * 0.35 + f * 0.15; dCol = 0.74 + 0.36 * n + 0.12 * c + 0.05 * f;`;
    else body = /* glsl */`
      float mid = dh_fbm(p * 3.0); float fine = dh_noise(p * 25.0);
      dHeight = mid * 0.6 + fine * 0.4; dCol = 0.9 + 0.14 * mid + 0.05 * fine;`;
    const frag = /* glsl */`
      float dHeight = 0.5; float dCol = 1.0;
      { vec3 p = vDPos * uDScale;
        ${body}
      }
      diffuseColor.rgb *= dCol;`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + frag);
    // relieve: perturba la normal con las derivadas de la altura
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
        float hx = dFdx(dHeight), hy = dFdy(dHeight);
        vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
        vec3 grad = sign(det) * (hx * r1 + hy * r2) * uDBump * 0.012;
        normal = normalize(abs(det) * normal - grad);
      }`);
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  material.customProgramCacheKey = () => key + '|detail-' + mode + (objectSpace ? '-o' : '');
  material.needsUpdate = true;
  return material;
}
