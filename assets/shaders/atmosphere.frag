uniform vec3 glowColor;

varying float alphaMix;
varying float whiteMix;

void main() {
    // Color transition
    vec3 color = mix(glowColor, vec3(1.0, 1.0, 1.0), whiteMix);

    // Alpha transition
    gl_FragColor = mix(vec4(color, 1.0), vec4(0.0), alphaMix);
}