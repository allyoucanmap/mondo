/* copyright 2018, stefano bovio @allyoucanmap. */

const loadShader = (gl, shader, type, error = () => { }) => {
    const id = gl.createShader(type);
    gl.shaderSource(id, shader);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(id));
        gl.deleteShader(id);
        return null;
    }
    return id;
};

const createProgram = ({ gl, vertex, fragment, attributes = [], uniforms = {} }, error = () => { }) => {
    const vertexId = loadShader(gl, vertex, gl.VERTEX_SHADER);
    const fragmentId = loadShader(gl, fragment, gl.FRAGMENT_SHADER);
    if (!vertexId || !fragmentId) {
        return { vertexId: null, fragmentId: null, programId: null, locations: null };
    }
    const programId = gl.createProgram();
    gl.attachShader(programId, vertexId);
    gl.attachShader(programId, fragmentId);
    Object.keys(attributes).forEach((attribute) => {
        if (attribute !== 'index') {
            gl.bindAttribLocation(programId, attributes[attribute].pos, attribute);
        }
    });
    gl.linkProgram(programId);
    gl.validateProgram(programId);
    const locations = Object.keys(uniforms).reduce((newLocations, name) => {
        return { ...newLocations, [name]: { loc: gl.getUniformLocation(programId, name), type: uniforms[name] } };
    }, {});
    if (!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
        error('Unable to initialize the this program: ' + gl.getProgramInfoLog(programId));
        return { vertexId: null, fragmentId: null, programId: null, locations: null };
    }
    return { vertexId, fragmentId, programId, locations };
};

const startShader = (gl, programId) => {
    gl.useProgram(programId);
};

const stopShader = gl => {
    gl.useProgram(null);
};

const destroyShaders = ({ gl, vertexId, fragmentId, programId }) => {
    if (programId && vertexId) { gl.detachShader(programId, vertexId); }
    if (programId && fragmentId) { gl.detachShader(programId, fragmentId); }
    if (vertexId) { gl.deleteShader(vertexId); }
    if (fragmentId) { gl.deleteShader(fragmentId); }
    if (programId) { gl.deleteProgram(programId); }
};

const loadUniforms = ({ gl, locations, uniforms }) => {
    uniforms.forEach(uniform => {
        const { name, value } = uniform;
        const type = locations[name] && locations[name].type || '';
        switch (type) {
            case 'i':
                gl.uniform1i(locations[name].loc, value);
                break;
            case 'f':
                gl.uniform1f(locations[name].loc, value);
                break;
            case 'fv':
                gl.uniform1fv(locations[name].loc, new Float32Array(value));
                break;
            case 'vec2':
                gl.uniform2fv(locations[name].loc, new Float32Array(value));
                break;
            case 'vec3':
                gl.uniform3fv(locations[name].loc, new Float32Array(value));
                break;
            case 'vec4':
                gl.uniform4fv(locations[name].loc, new Float32Array(value));
                break;
            case 'mat4':
                gl.uniformMatrix4fv(locations[name].loc, false, new Float32Array(value));
                break;
            default:
                break;
        }
    });
};

const createModel = (gl, attributes) => {
    return Object.keys(attributes).reduce((model, attribute) => {
        let buffer = gl.createBuffer();
        if (attribute === 'indexStart') {
            return {...model};
        }
        if (attribute === 'index') {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(attributes[attribute]), gl.STATIC_DRAW);
            return { ...model, [attribute]: { buffer, coords: [...attributes[attribute]] } };
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attributes[attribute]), gl.STATIC_DRAW);
        return { ...model, [attribute]: { buffer, coords: [...attributes[attribute]] } };
    }, {});
};

const deleteModel = (gl, model) => {
    Object.keys(model).forEach(attribute => {
        gl.deleteBuffer(model[attribute].buffer);
    });
};

const isPowerOf2 = (v) => (v & (v - 1)) === 0;

const defalutFrameBuffer = () => null;

const bindFrameBuffer = (gl, framebuffer, width, height) => {
    if (framebuffer.back) {
        framebuffer.count++;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.frame);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framebuffer.back, 0);
        gl.viewport(0, 0, width, height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture);

        let tmp = framebuffer.texture;
        framebuffer.texture = framebuffer.back;
        framebuffer.back = tmp;

    } else {
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.frame);
        gl.viewport(0, 0, width, height);
    }
};

const unbindFrameBuffer = (gl, width, height) => {
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
};

const createFrameBuffer = ({ gl, width, height, canvasWidth, canvasHeight, swap }) => {
    const frame = gl.createFramebuffer();
    const texture = gl.createTexture();
    const renderBuffer = gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

    if (swap) {
        const back = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, back);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        if (isPowerOf2(width) && isPowerOf2(height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        unbindFrameBuffer(gl, canvasWidth, canvasHeight);
        return { frame, texture, renderBuffer, back, count: 0 };
    }

    unbindFrameBuffer(gl, canvasWidth, canvasHeight);
    return { frame, texture, renderBuffer };
};

const clearFrameBuffer = (gl, frameBuffer) => {
    gl.deleteFramebuffer(frameBuffer.frame);
    gl.deleteTexture(frameBuffer.texture);
    gl.deleteRenderbuffer(frameBuffer.renderBuffer);
    if (frameBuffer.back) {
        gl.deleteTexture(frameBuffer.back);
    }
};

const bindTexture = ({ gl, img, width, height }) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

const bindTextureFromUrl = (gl, url, callback = () => { }) => {
    const img = document.createElement('img');
    img.$_am_texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, img.$_am_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    img.onload = () => {
        if (img.$_am_texture) {
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            gl.bindTexture(gl.TEXTURE_2D, img.$_am_texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            if (isPowerOf2(width) && isPowerOf2(height)) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            gl.bindTexture(gl.TEXTURE_2D, null);
            callback(img);
        }
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
    return img;
};

const bindBufferTexture = (gl, data, width, height) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

const destroyTextureFromUrl = (gl, img) => {
    if (img.$_am_texture) {
        gl.deleteTexture(img.$_am_texture);
        img.$_am_texture = null;
    }
};

module.exports = {
    createProgram,
    startShader,
    stopShader,
    destroyShaders,
    loadUniforms,
    createModel,
    deleteModel,
    defalutFrameBuffer,
    createFrameBuffer,
    bindFrameBuffer,
    unbindFrameBuffer,
    clearFrameBuffer,
    bindTexture,
    bindTextureFromUrl,
    destroyTextureFromUrl,
    bindBufferTexture
};
