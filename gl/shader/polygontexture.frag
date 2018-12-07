
precision highp float;

uniform vec4 color;
uniform sampler2D baseTexture;

varying vec4 vvcolor;
varying vec2 vtextureCoordinates;

void main(void) {
    if (vvcolor.r == -1.0) {
        vec4 base = texture2D(baseTexture, vtextureCoordinates);
        gl_FragColor = base;
    } else {
        gl_FragColor = vvcolor;
    }
    gl_FragColor.rgb *= gl_FragColor.a;
}
