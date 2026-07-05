import * as THREE from 'three';
import { snoise3 } from './glslNoise';

export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        vPos = position;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPos;
      ${snoise3}
      void main() {
        vec3 p = normalize(vPos);
        float flow = uTime * 0.035;
        float granulation = fbm(p * 3.2 + vec3(flow, flow * 0.6, 0.0), 5);
        float largeCells = fbm(p * 1.3 - vec3(0.0, flow * 0.4, flow * 0.2), 4);
        float spots = fbm(p * 2.0 + 11.0 + vec3(flow * 0.15), 4);

        float t = granulation * 0.35 + largeCells * 0.65;
        t = t * 0.5 + 0.5;

        vec3 coolColor = vec3(0.65, 0.11, 0.02);
        vec3 midColor = vec3(1.0, 0.42, 0.05);
        vec3 hotColor = vec3(1.0, 0.78, 0.35);
        vec3 whiteHot = vec3(1.0, 0.98, 0.85);

        vec3 color = mix(coolColor, midColor, smoothstep(0.15, 0.55, t));
        color = mix(color, hotColor, smoothstep(0.5, 0.8, t));
        color = mix(color, whiteHot, smoothstep(0.78, 1.0, t));

        float spotMask = smoothstep(0.55, 0.75, spots) * 0.55;
        color = mix(color, coolColor * 0.8, spotMask);

        float ndotv = clamp(dot(normalize(vNormal), vViewDir), 0.0, 1.0);
        float limb = pow(ndotv, 0.35);
        color *= mix(0.55, 1.15, limb);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

export function createCoronaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffb060) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = 1.0 - clamp(dot(normalize(vNormal), vViewDir), 0.0, 1.0);
        float alpha = pow(fresnel, 3.2);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}
