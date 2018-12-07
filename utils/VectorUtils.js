/* copyright 2018, stefano bovio @allyoucanmap. */

const {vec4, vec3} = require('gl-matrix');

const getPlaneVectors = (up, right, center, width, height) => {
    let cameraUp = [];
    vec3.scale(cameraUp, up, height / 2);

    let cameraRight = [];
    vec3.scale(cameraRight, right, width / 2);

    let topLeft = [];
    vec3.add(topLeft, center, cameraUp);
    vec3.sub(topLeft, topLeft, cameraRight);

    let topRight = [];
    vec3.add(topRight, center, cameraUp);
    vec3.add(topRight, topRight, cameraRight);

    let bottomRight = [];
    vec3.sub(bottomRight, center, cameraUp);
    vec3.add(bottomRight, bottomRight, cameraRight);

    let bottomLeft = [];
    vec3.sub(bottomLeft, center, cameraUp);
    vec3.sub(bottomLeft, bottomLeft, cameraRight);

    return [topLeft, topRight, bottomRight, bottomLeft];
};

const VectorUtils = {
    transform: (vector, matrix) => {
        let out = [];
        if (vector.length === 4) {
            vec4.transformMat4(out, vector, matrix);
        } else {
            vec3.transformMat4(out, vector, matrix);
        }
        return out;
    },
    getFrustumVectors: (camera, width, height) => {

        let direction = [];
        vec3.sub(direction, camera.target, camera.position);
        vec3.normalize(direction, direction);

        let right = [];
        vec3.cross(right, direction, camera.up);
        vec3.normalize(right, right);

        let nearCenter = [];
        vec3.scale(nearCenter, direction, camera.near);
        vec3.add(nearCenter, nearCenter, camera.position);

        let farCenter = [];
        vec3.scale(farCenter, direction, camera.far);
        vec3.add(farCenter, farCenter, camera.position);

        let near;
        let far;

        if (camera.type === 'ortho') {
            const cameraHeight = height / camera.zoom;
            const cameraWidth = width / camera.zoom;
            near = getPlaneVectors(camera.up, right, nearCenter, cameraWidth, cameraHeight);
            far = getPlaneVectors(camera.up, right, farCenter, cameraWidth, cameraWidth);
        } else {
            const a = 2 * Math.tan(camera.fovy * (Math.PI / 180.0) / 2);
            const nearHeight = a * camera.near;
            const farHeight = a * camera.far;
            const aspectRatio = width / height;
            const nearWidth = nearHeight * aspectRatio;
            const farWidth = farHeight * aspectRatio;
            near = getPlaneVectors(camera.up, right, nearCenter, nearWidth, nearHeight);
            far = getPlaneVectors(camera.up, right, farCenter, farWidth, farHeight);
        }

        return {
            near,
            far,
            normals: {
                near: VectorUtils.surfaceNormal(near[0], near[1], near[2]),
                far: VectorUtils.surfaceNormal(far[1], far[0], far[3]),
                top: VectorUtils.surfaceNormal(far[0], far[1], near[1]),
                bottom: VectorUtils.surfaceNormal(near[3], near[2], far[2]),
                left: VectorUtils.surfaceNormal(far[0], near[0], near[3]),
                right: VectorUtils.surfaceNormal(near[1], far[1], far[2])
            }
        };
    },
    surfaceNormal: (a, b, c) => {
        let u = [];
        vec3.sub(u, b, a);
        let v = [];
        vec3.sub(v, c, a);
        let cross = [];
        vec3.cross(cross, u, v);
        vec3.normalize(cross, cross);
        return cross;
    },
    intersectPlane: (a, b, plane, epsilon = 1e-6) => {
        let u = [];
        vec3.sub(u, b, a);
        let dot = vec3.dot(plane.normal, u);

        if (Math.abs(dot) > epsilon) {
            let w = [];
            vec3.sub(w, a, plane.center);
            let fac = -(vec3.dot(plane.normal, w) / dot);
            vec3.scale(u, u, fac);
            let add = [];
            vec3.add(add, a, u);
            return add;
        }
        return [0, 0, 0];

    }
};

module.exports = VectorUtils;
