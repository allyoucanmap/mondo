
precision highp float;

attribute vec3 coordinates;
attribute float size;
attribute vec4 vcolor;

uniform mat4 modelViewProjectionMatrix;
uniform vec3 origin;

varying vec4 vvcolor;

void main(void) {
    vvcolor = vcolor;
    gl_Position = modelViewProjectionMatrix * vec4(coordinates - origin, 1.0);
    gl_PointSize = size;
}
