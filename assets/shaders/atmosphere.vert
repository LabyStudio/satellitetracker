uniform vec3 viewVector;
uniform float strength;
uniform float shift;
varying float intensity;

void main()
{
    vec3 vNormal = normalize(normalMatrix * normal);
    vec3 vNormel = normalize(normalMatrix * viewVector);

    // Atmosphere around globe
    float transitionStrength = 20.0;
    float atmosphere = dot(vNormal, vNormel) * transitionStrength - shift;

    // Minimum and maximum
    float mixValue = clamp(atmosphere, 0.0, 1.0);

    // Apply strength to atmosphere/mixValue to control it
    intensity = 1.0 - ((1.0 - mixValue) * strength);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}