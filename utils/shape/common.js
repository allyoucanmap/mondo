/* copyright 2018, stefano bovio @allyoucanmap. */

const { vec3, vec2 } = require('gl-matrix');
const { range, min, max } = require('lodash');
const { transform, surfaceNormal, intersectPlane } = require('../VectorUtils');
const { modelMatrix } = require('../MatrixUtils');
const EARTH_RADIUS = 6378137.0;

let SHAPE_TYPE = '';
let data = {};

const deg = r => r / (Math.PI / 180.0);
const rad = d => d * (Math.PI / 180.0);

const getData = type => data[type] && { ...data[type] } || {};

const getLatLon = xyz => {
    const x = xyz[0];
    const y = xyz[1];
    const z = -xyz[2];
    const radius = Math.sqrt(x * x + y * y + z * z);
    const lat = 90 - deg(Math.acos(y / radius));
    const lon = deg(Math.atan2(z, x));
    return [lon, lat];
};

const getXYZ = coords => {
    const radius = EARTH_RADIUS;
    const lon = coords[0];
    const lat = coords[1];
    const cosLat = Math.cos(lat * Math.PI / 180.0);
    const sinLat = Math.sin(lat * Math.PI / 180.0);
    const cosLon = Math.cos(lon * Math.PI / 180.0);
    const sinLon = Math.sin(lon * Math.PI / 180.0);
    const x = radius * cosLat * cosLon;
    const y = radius * cosLat * sinLon;
    const z = radius * sinLat;
    return [x, z, -y];
};

const getBBox = bounds => {
    return bounds.map(coordinates => {
        const xCoordinates = coordinates.map(coords => coords[0]);
        const yCoordinates = coordinates.map(coords => coords[1]);

        const left = min(xCoordinates);
        const right = max(xCoordinates);
        const bottom = min(yCoordinates);
        const top = max(yCoordinates);

        return [left, bottom, right, top];
    });
};

const getCenter = vertices => {
    return range(3).map(idx => {
        const length = vertices.reduce((newV, vertex) => newV + vertex[idx], 0);
        return length / vertices.length;
    });
};

const getFaceId = (xyz, type) => {
    const { centers } = data[type || SHAPE_TYPE];
    const radius = EARTH_RADIUS;
    let maxDistance = 9999 * radius;
    return centers.reduce((face, center, idx) => {
        const centerDistance = vec3.distance(centers[idx], xyz);
        if (centerDistance < maxDistance) {
            maxDistance = centerDistance;
            return idx;
        }
        return face;
    }, -1);
};

const getPole = (pointA, pointB, delta) => {
    if (delta === 1) {
        return pointB;
    }
    if (pointA.length === 2 && pointB.length === 2) {
        let out = [];
        vec2.lerp(out, pointA, pointB, delta);
        return [...out];
    }
    let out = [];
    const pA = pointA.length === 2 ? [...pointA, 0] : pointA;
    const pB = pointB.length === 2 ? [...pointB, 0] : pointB;
    vec3.lerp(out, pA, pB, delta);
    return [...out];
};

const getFence = (vert, xyz, precision = 32) => {
    return vert.reduce((newFence, vertex, idx) => {
        const first = getLatLon(vertex);
        return [
            ...newFence,
            (xyz ? getXYZ(first) : first),
            ...range(precision).map((step) => {
                if (step === precision - 1 ) {
                    return null;
                }
                const delta = (step + 1) * 1 / precision;

                if (idx < vert.length - 1) {
                    const current = getLatLon(getPole(vertex, vert[idx + 1], delta));
                    return [...(xyz ? getXYZ(current) : current)];
                }
                const current = getLatLon(getPole(vertex, vert[0], delta));
                return [...(xyz ? getXYZ(current) : current)];
            }).filter(val => val)
        ];
    }, []);
};

const splitTriangle = (vert, zoom = 0) => {
    const count = Math.pow(2, zoom);
    return vert.reduce((newFence, vertex, idx) => {
        return [
            ...newFence,
            vertex,
            ...range(count).map((step) => {
                if (step === count - 1 ) {
                    return null;
                }
                const delta = (step + 1) * 1 / count;
                if (idx < vert.length - 1) {
                    const current = getPole(vertex, vert[idx + 1], delta);
                    return [...current];
                }
                const current = getPole(vertex, vert[0], delta);
                return [...current];
            }).filter(val => val)
        ];
    }, []);
};

const lawOfCos = (vert, degrees) => {
    const sideC = vec3.dist(vert[0], vert[1]);
    const sideA = vec3.dist(vert[1], vert[2]);
    const sideB = vec3.dist(vert[2], vert[0]);
    const angleA = Math.acos((Math.pow(sideB, 2) + Math.pow(sideC, 2) - Math.pow(sideA, 2)) / (2 * sideB * sideC));
    const angleB = Math.acos((Math.pow(sideC, 2) + Math.pow(sideA, 2) - Math.pow(sideB, 2)) / (2 * sideC * sideA));
    const angleC = Math.acos((Math.pow(sideA, 2) + Math.pow(sideB, 2) - Math.pow(sideC, 2)) / (2 * sideA * sideB));
    return {
        a: degrees ? deg(angleA) : angleA,
        b: degrees ? deg(angleB) : angleB,
        c: degrees ? deg(angleC) : angleC
    };
};

const getDeltaXY = (vert, target, angleKey = 'a') => {
    const angles = lawOfCos([...vert, target]);
    const tetha = Math.abs(angles[angleKey] - rad(30));
    const side = angleKey === 'a' ? vec3.dist(vert[0], target) : vec3.dist(vert[1], target);
    const x = side * Math.sin(tetha);
    const y = side * Math.cos(tetha);
    return { x, y };
};

const project = (coordinates, withIndex, type) => {
    const {normals, centers} = data[type || SHAPE_TYPE];
    const coords = coordinates.length === 2 ? getXYZ(coordinates) : coordinates;
    const index = getFaceId(coords, type || SHAPE_TYPE);
    const plane = { normal: normals[index], center: centers[index] };
    const position = intersectPlane([0, 0, 0], coords, plane);
    return withIndex ? { index, position } : position;
};

const setup = (
    type,
    shape = {
        vertices: () => [],
        faces: () => []
    },
    model = {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [30, 30, 30]
    },
    radius = EARTH_RADIUS
) => {
    SHAPE_TYPE = type;

    const matrix = modelMatrix(model);

    const vertices = [...shape.vertices()]
        .map(vertex => {
            let norm = [];
            vec3.scale(norm, vertex, radius);
            return [...norm];
        })
        .map(vertex => transform(vertex, matrix));

    const faces = [...shape.faces()];
    const planes = faces.map(face => [...face.map(id => [...vertices[id]])]);
    const centers = faces.map((face, idx) => getCenter(faces[idx].map(faceId => vertices[faceId])));
    const rotations = centers.map(coords => getLatLon(coords));
    const normals = planes.map(vert => surfaceNormal(...vert));
    const near = centers.map((center, centerId) => {
        const distances = centers.map((diffCenter, idx) => {
            return centerId === idx ? null : {
                idx,
                dist: vec3.dist(center, diffCenter)
            };
        }).filter(val => val);
        return [...distances.sort((a, b) => a.dist > b.dist ? 1 : -1)].filter((val, id) => id < 3).map(val => val.idx);
    });

    data[type] = {
        vertices,
        centers,
        normals,
        planes,
        faces,
        rotations,
        near,
        EARTH_RADIUS
    };

    return { ...data[type] };
};

const scanFeaturesCoords = (features, update = coords => coords) => features.map(feature => {
    const geometryType = feature.geometry && feature.geometry.type;
    const coordinates = geometryType === 'LineString' && update(feature.geometry.coordinates)
    || geometryType === 'MultiLineString' && feature.geometry.coordinates.map(coords => update(coords))
    || geometryType === 'Polygon' && feature.geometry.coordinates.map(coords => update(coords))
    || geometryType === 'MultiPolygon' && feature.geometry.coordinates.map(group => group.map(coords => update(coords)));

    return {
        ...feature,
        geometry: {
            ...feature.geometry,
            coordinates: coordinates || feature.geometry.coordinates
        }
    };
});

module.exports = {
    deg,
    rad,
    getLatLon,
    getXYZ,
    getBBox,
    getPole,
    getCenter,
    getFaceId,
    getData,
    getDeltaXY,
    project,
    setup,
    EARTH_RADIUS,
    getFence,
    splitTriangle,
    lawOfCos,
    scanFeaturesCoords
};
