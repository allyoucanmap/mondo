/* copyright 2018, stefano bovio @allyoucanmap. */

const { getXYZ, getLatLon, getFaceId, getFence } = require('./common');
const { vec3 } = require('gl-matrix');
const {head, isNil} = require('lodash');

const jsts = require('jsts/dist/jsts.min.js');

const reader = new jsts.io.GeoJSONReader();
const writer = new jsts.io.GeoJSONWriter();

const warpPole = ({area, latLonCoords, isPole, triangleId, northVertex, southVertex, type}) => {

    const index = head(area.map((coords, idx) => {
        if (area.length - 1 === idx) return null;
        return Math.abs(area[idx][0] - area[idx + 1][0]) > 180 ? idx : null;
    }).filter(val => val));

    if (isNil(index)) {
        return [[...latLonCoords]];
    }

    const geomA = reader.read(JSON.stringify(
        {
            type: 'LineString',
            coordinates: [
                area[index][0] >= 0 ? area[index] : [area[index][0] + 360, area[index][1]],
                area[index + 1][0] >= 0 ? area[index + 1] : [area[index + 1][0] + 360, area[index + 1][1]]
            ]
        }
    ));
    const geomB = reader.read(JSON.stringify({
        type: 'LineString',
        coordinates: [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]]
    }));

    const intersection = writer.write(geomA.intersection(geomB));
    const point = intersection && intersection.coordinates && [...intersection.coordinates];
    const direction = index !== 0 && area[0][0] > area[1][0] ? -1 : 1
    || area[index + 2][0] > area[index + 3][0] ? -1 : 1;

    const checkPole = isPole || triangleId === getFaceId(northVertex, type) && 1
        || triangleId === getFaceId(southVertex, type) && -1;

    const polePolygon = [
        [...point],
        [180, 90 * checkPole],
        [-180, 90 * checkPole],
        [-1 * point[0], point[1]]
    ];

    return [area.reduce((newArea, vertex, idx) => {
        if (idx === index) {
            return [
                ...newArea,
                vertex,
                ...(direction === -1 ? [...polePolygon].reverse() : polePolygon)
            ];
        }
        return [...newArea, vertex];
    }, [])];
};

const warp = (vert, triangleId, type, { center, tHeight} = {}) => {

    const northVertex = getXYZ([0, 90]);
    const southVertex = getXYZ([0, -90]);

    const northDist = tHeight && center && vec3.dist(center, northVertex) < tHeight / 2;
    const southDist = tHeight && center && vec3.dist(center, southVertex) < tHeight / 2;

    const closedVertices = [...vert, vert[0]].map(vertex => getLatLon(vertex));

    const isPole = triangleId === getFaceId(northVertex, type) && northDist && 1
        || triangleId === getFaceId(southVertex, type) && southDist && -1;

    const maxLonDelta = closedVertices.map((vertex, idx) => {
        if (closedVertices.length - 1 === idx) return null;
        return Math.abs(closedVertices[idx][0] - closedVertices[idx + 1][0]);
    })
    .filter(val => val)
    .reduce((previous, current) => previous > current ? previous : current);

    const area = getFence(vert);
    const latLonCoords = (area[0] === area[area.length - 1] ? [...area] : [...area, area[0]]);

    if (!isPole && maxLonDelta > 180) {
        const normalizedCoords = latLonCoords.map(val => {
            if (val[0] >= 0) return val;
            return [val[0] + 360, val[1]];
        });
        const geomA = reader.read(JSON.stringify({
            type: 'Polygon',
            coordinates: [normalizedCoords]
        }));
        const geomB = reader.read(JSON.stringify({
            type: 'Polygon',
            coordinates: [[[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]]]
        }));

        try {
            const difference = writer.write(geomA.difference(geomB));
            const intersection = writer.write(geomA.intersection(geomB));

            return difference && intersection
            && difference.coordinates && intersection.coordinates
            && difference.coordinates[0] && intersection.coordinates[0] && [
                difference.coordinates[0].map(coords => [coords[0] - 360, coords[1]]),
                [...intersection.coordinates[0]]
            ] || [];
        } catch(e) {
            return warpPole({area, latLonCoords, isPole, triangleId, northVertex, southVertex, type});
        }
    } else if (isPole) {
        return warpPole({area, latLonCoords, isPole, triangleId, northVertex, southVertex, type});
    }
    return [[...latLonCoords]];
};

module.exports = {
    warp
};
