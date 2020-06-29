uniform vec3 viewVector;
uniform float strength;
uniform float shift;

varying float alphaMix;
varying float whiteMix;

void main()
{
    vec3 vNormal = normalize(normalMatrix * normal);
    vec3 vNormel = normalize(normalMatrix * viewVector);

    // Atmosphere around globe
    float transitionStrength = 20.0;
    float atmosphere = dot(vNormal, vNormel) * transitionStrength - shift;

    // Minimum and maximum
    float clampMixAlpha = clamp(atmosphere, 0.0, 1.0);

    // Apply strength to atmosphere/mixValue to control it
    alphaMix = 1.0 - ((1.0 - clampMixAlpha) * strength);

    // Smooth transition transition between blue and white (1 = white, 0 = blue)
    whiteMix = 1.0 - atmosphere - 0.9;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}