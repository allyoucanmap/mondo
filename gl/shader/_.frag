
precision highp float;

uniform vec4 color;
uniform float time;
varying vec4 vvcolor;

void main(void) {
    if (vvcolor.r == -1.0) {
        gl_FragColor = mix(color, vec4(0.9, 0.9, 0.9, 1.0), gl_FragCoord.z / gl_FragCoord.w);
    } else {
        gl_FragColor = vvcolor;
    }
    gl_FragColor.rgb *= gl_FragColor.a;
}

