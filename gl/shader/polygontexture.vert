
precision highp float;

attribute vec3 coordinates;
attribute vec2 textureCoordinates;
attribute vec4 vcolor;

uniform mat4 modelViewProjectionMatrix;
uniform vec3 origin;

varying vec4 vvcolor;
varying vec2 vtextureCoordinates;

void main(void) {
    vtextureCoordinates = textureCoordinates;
    vvcolor = vcolor;
    gl_Position = modelViewProjectionMatrix * vec4(coordinates - origin, 1.0);
}
