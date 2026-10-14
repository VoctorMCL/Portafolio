import { Effect } from '@babylonjs/core/Materials/effect';

export const VHS_SHADER_NAME = 'vhs';

Effect.ShadersStore[`${VHS_SHADER_NAME}FragmentShader`] = `
precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform float uTime;
uniform float uVhs;
uniform float uVignette;
uniform vec2 uResolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUV;
  float vhs = uVhs;

  float wobble =
    sin(uv.y * 90.0 + uTime * 3.0) * 0.0011 +
    sin(uv.y * 9.0 - uTime * 1.7) * 0.0020;
  uv.x += wobble * vhs;

  float ca = (0.0016 + abs(uv.x - 0.5) * 0.0045) * vhs;
  float r = texture2D(textureSampler, uv + vec2(ca, 0.0)).r;
  float g = texture2D(textureSampler, uv).g;
  float b = texture2D(textureSampler, uv - vec2(ca, 0.0)).b;
  vec3 col = vec3(r, g, b);

  float scan = mix(1.0, 0.86 + 0.14 * sin(uv.y * uResolution.y * 1.5), vhs * 0.6);
  col *= scan;

  float grain = hash(uv * uResolution + uTime) - 0.5;
  col += grain * 0.05 * (0.4 + vhs);

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 shadowTint = vec3(0.07, 0.03, 0.13);
  vec3 hiTint = vec3(0.86, 0.95, 1.06);
  col = mix(col + shadowTint * (1.0 - lum), col * hiTint, smoothstep(0.2, 0.9, lum));
  col = mix(vec3(lum), col, 1.16);

  vec2 p = uv - 0.5;
  float vig = smoothstep(0.98, 0.28, length(p));
  col *= mix(1.0, vig, uVignette);

  gl_FragColor = vec4(col, 1.0);
}
`;
