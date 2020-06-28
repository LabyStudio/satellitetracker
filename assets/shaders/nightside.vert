uniform vec3 viewVector;

varying vec2 vUv;
varying float mixAmount;

void main() {
  vUv = uv;

  vec3 vNormal = normalize( normalMatrix * normal );
  vec3 vNormel = normalize( normalMatrix * viewVector );

  // Smooth transition between day and night
  mixAmount = clamp( dot(vNormal, vNormel) * 10.0, -1.0, 1.0) * 0.5 + 0.5;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}