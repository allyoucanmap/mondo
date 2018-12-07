
precision highp float;

uniform vec4 color;

varying vec4 vvcolor;

void main(void) {
    if (vvcolor.r == -1.0) {
        gl_FragColor = color;
    } else {
        gl_FragColor = vvcolor;
    }
    gl_FragColor.rgb *= gl_FragColor.a;
}
