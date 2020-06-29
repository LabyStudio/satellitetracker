uniform vec3 glowColor;
varying float intensity;
void main()
{
    gl_FragColor = mix(vec4(glowColor, 1.0), vec4(0.0), intensity);
}