uniform sampler2D nightTexture;
varying vec2 vUv;

varying float mixAmount;

void main(void) {
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;

    // Mix night texture with transparent color (daylight)
    gl_FragColor = mix(vec4(nightColor, 0.8), vec4(0.0), mixAmount);

    // Apply rgb channel to alpha channel (For a smoother transition to alpha)
    gl_FragColor.a = gl_FragColor.r + gl_FragColor.g + gl_FragColor.b;

    /*
    // Filter black colors (Using black colors instead of alpha because of smaller texture size)
    if (gl_FragColor.r < 0.1 && gl_FragColor.g < 0.1 && gl_FragColor.b < 0.1) {
       // No color here
       discard;
    }
    */
}