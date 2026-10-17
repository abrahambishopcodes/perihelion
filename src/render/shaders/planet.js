// Planet: dark body, molten noise veins that pulse, strong fresnel rim.

export const planetVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  varying vec3 vPosObj;

  void main() {
    vPosObj = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const planetFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;      // 0..1 extra brightness kick (switch pulse)
  uniform vec3 uBody;
  uniform vec3 uCore;
  uniform vec3 uHot;
  uniform float uRimPower;
  uniform float uRimStrength;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;
  uniform float uPulseSpeed;

  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  varying vec3 vPosObj;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(vViewDirW);
    float t = uTime * uNoiseSpeed;

    vec3 p = normalize(vPosObj) * uNoiseScale;
    float warp = fbm(p + vec3(t, -t * 0.7, t * 0.4));
    float f = fbm(p * 1.7 + warp * 1.5 - vec3(0.0, t, 0.0));

    // Thin bright veins where the noise crosses its midline.
    float veins = 1.0 - smoothstep(0.0, 0.08, abs(f - 0.5));
    float breathe = 0.5 + 0.5 * sin(uTime * uPulseSpeed * 6.2831);
    float heat = veins * (0.55 + 0.45 * breathe) + uPulse * 0.6;

    vec3 col = mix(uBody, uCore, clamp(heat, 0.0, 1.0));
    col += uHot * veins * uPulse * 0.8;

    float fres = pow(1.0 - max(dot(n, v), 0.0), uRimPower);
    col += mix(uCore, uHot, fres) * fres * uRimStrength * (1.0 + uPulse);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
