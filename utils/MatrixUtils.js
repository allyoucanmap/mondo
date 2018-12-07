/* copyright 2018, stefano bovio @allyoucanmap. */

const {mat4} = require('gl-matrix');

const MatrixUtils = {
    rotationMatrix: (angle, axis = [0, 1, 0]) => {
        let rotationMatrix = [];
        mat4.fromRotation(rotationMatrix, angle * (Math.PI / 180.0), axis);
        return rotationMatrix;
    },
    modelMatrix: (entity) => {
        let modelMatrix = [];
        let translateMatrix = [];
        mat4.translate(translateMatrix, [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ], entity.position);
        let xRotationMatrix = [];
        mat4.fromXRotation(xRotationMatrix, entity.rotation[0] * (Math.PI / 180.0));
        let yRotationMatrix = [];
        mat4.fromYRotation(yRotationMatrix, entity.rotation[1] * (Math.PI / 180.0));
        let zRotationMatrix = [];
        mat4.fromZRotation(zRotationMatrix, entity.rotation[2] * (Math.PI / 180.0));

        mat4.mul(modelMatrix, translateMatrix, xRotationMatrix);
        mat4.mul(modelMatrix, modelMatrix, yRotationMatrix);
        mat4.mul(modelMatrix, modelMatrix, zRotationMatrix);

        mat4.scale(modelMatrix, modelMatrix, entity.scale);

        return modelMatrix;
    },
    modelViewProjectionMatrix: (modelMatrix, viewMatrix, projectionMatrix) => {
        let modelViewProjectionMatrix = [];
        mat4.mul(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
        mat4.mul(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix);
        return modelViewProjectionMatrix;
    },
    viewProjectionMatrix: (viewMatrix, projectionMatrix) => {
        let viewProjectionMatrix = [];
        mat4.mul(viewProjectionMatrix, projectionMatrix, viewMatrix);
        return viewProjectionMatrix;
    },
    projectionMatrix: (options) => {
        let projectionMatrix = [];
        if (options && options.type === 'ortho') {
            mat4.ortho(projectionMatrix, options.left, options.right, options.bottom, options.top, options.near, options.far);
        } else if (options && options.type === 'perspective') {
            mat4.perspective(projectionMatrix, options.fovy, options.aspect, options.near, options.far);
        }
        return projectionMatrix;
    },
    viewMatrix: (eye, center, up) => {
        let viewMatrix = [];
        mat4.lookAt(viewMatrix, eye, center, up);
        return viewMatrix;
    }
};

module.exports = MatrixUtils;
