/* copyright 2018, stefano bovio @allyoucanmap. */

const { vec3, vec2 } = require('gl-matrix');
const { setup, getData, project, getDeltaXY, rad, getPole, getCenter, splitTriangle, getBBox, lawOfCos, scanFeaturesCoords } = require('../common');
const { warp } = require('../warp');
const { isEqual, head, range } = require('lodash');

const SHAPE_TYPE = 'icosahedron';

let tiles = {};

const getName = ({zoom, tIndex, aIndex, bIndex, cIndex}) => `z${zoom}_t${tIndex}_a${aIndex}_b${bIndex}_c${cIndex}`;

const getTileSurface = ({aIndex, rows, coordinates, up}) => {

    if (isEqual(rows[0][0], rows[0][1])) {
        return [
            rows[0][0],
            rows[1][0],
            rows[1][1]
        ];
    }

    const topCount = aIndex;
    const bottomCount = aIndex + 1;

    const rowLength = up ?
        vec3.dist(rows[0][0], rows[0][1])
        : vec3.dist(rows[1][0], rows[1][1]);

    const rowAngles = up ?
        lawOfCos([rows[0][0], rows[0][1], coordinates.position])
        : lawOfCos([rows[1][0], rows[1][1], coordinates.position]);

    const hypotenuse = up ?
        vec3.dist(rows[0][0], coordinates.position)
        : vec3.dist(rows[1][0], coordinates.position);

    const yDist = hypotenuse * Math.cos(rowAngles.a);

    const rowLoc = up ?
        Math.round(yDist / rowLength * topCount)
        : Math.round(yDist / rowLength * bottomCount);

    return up ?
        [
            getPole(rows[0][0], rows[0][1], rowLoc / topCount),
            getPole(rows[1][0], rows[1][1], rowLoc / bottomCount),
            getPole(rows[1][0], rows[1][1], (rowLoc + 1) / bottomCount)
        ]
        :
        [
            getPole(rows[1][0], rows[1][1], rowLoc / bottomCount),
            getPole(rows[0][0], rows[0][1], (rowLoc - 1) / topCount),
            getPole(rows[0][0], rows[0][1], (rowLoc) / topCount)
        ];
};

const getTileName = ({coords, zoom}) => {
    const coordinates = project(coords, true, SHAPE_TYPE);

    const {planes} = getData(SHAPE_TYPE);

    const plane = planes[coordinates.index];

    const deltaA = getDeltaXY([plane[0], plane[1]], coordinates.position);
    const deltaB = getDeltaXY([plane[1], plane[2]], coordinates.position);
    const deltaC = getDeltaXY([plane[2], plane[0]], coordinates.position);

    const planeHeight = vec3.dist(plane[0], plane[1]) * Math.cos(rad(30));

    const count = Math.pow(2, zoom);
    const aIndex = zoom === 0 ? 0 : Math.floor((deltaA.y / planeHeight) * count);
    const bIndex = zoom === 0 ? 0 : Math.floor((deltaB.y / planeHeight) * count);
    const cIndex = zoom === 0 ? 0 : Math.floor((deltaC.y / planeHeight) * count);

    return getName({zoom, aIndex, bIndex, cIndex, tIndex: coordinates.index});
};

const getTile = ({coords, zoom, tileName}) => {

    if (tiles[tileName]) return tiles[tileName];

    const {planes} = getData(SHAPE_TYPE);

    const coordinates = project(coords, true, SHAPE_TYPE);
    const plane = planes[coordinates.index];

    const deltaA = getDeltaXY([plane[0], plane[1]], coordinates.position);
    const deltaB = getDeltaXY([plane[1], plane[2]], coordinates.position);
    const deltaC = getDeltaXY([plane[2], plane[0]], coordinates.position);

    const planeHeight = vec3.dist(plane[0], plane[1]) * Math.cos(rad(30));

    const count = Math.pow(2, zoom);
    const aIndex = zoom === 0 ? 0 : Math.floor((deltaA.y / planeHeight) * count);
    const bIndex = zoom === 0 ? 0 : Math.floor((deltaB.y / planeHeight) * count);
    const cIndex = zoom === 0 ? 0 : Math.floor((deltaC.y / planeHeight) * count);

    const name = getName({zoom, aIndex, bIndex, cIndex, tIndex: coordinates.index});

    if (tiles[name]) return tiles[name];

    const up = (aIndex + bIndex + cIndex) % 2 === 0;

    const rows = [
        [
            getPole(plane[0], plane[1], aIndex / count),
            getPole(plane[0], plane[2], aIndex / count)
        ],
        [
            getPole(plane[0], plane[1], (aIndex + 1) / count),
            getPole(plane[0], plane[2], (aIndex + 1) / count)
        ]
    ];

    const surface = getTileSurface({aIndex, rows, coordinates, up});

    const center = getCenter(surface);

    let splittedTriangle = splitTriangle(surface, 1);
    splittedTriangle = [...splittedTriangle, splittedTriangle[0]];
    const nearCenters = splittedTriangle
        .reduce((newNearCenters, point, idx) => {

            if (idx % 2 === 0) return {...newNearCenters};

            let out = [];
            vec3.sub(out, point, center);
            vec3.scale(out, out, 2);
            vec3.add(out, center, out);

            const key = getTileName({coords: out, zoom, planes});
            return {
                ...newNearCenters,
                [key]: {
                    center: out,
                    points: [
                        splittedTriangle[idx - 1],
                        getPole(center, out, 0.6),
                        splittedTriangle[idx + 1]
                    ]
                }
            };
        }, {});

    const bounds = warp(surface, coordinates.index, SHAPE_TYPE, {tHeight: planeHeight / count, center});

    tiles[name] = {
        name,
        surface,
        center,
        up,
        z: zoom,
        t: coordinates.index,
        a: aIndex,
        b: bIndex,
        c: cIndex,
        bounds,
        bbox: getBBox(bounds),
        near: nearCenters
    };

    return {...tiles[name]};
};

module.exports = {
    maxZoom: 4,
    setup: (rotation = [30, 30, 30]) => {
        tiles = {};
        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2],
                [0, 2, 3],
                [0, 3, 4],
                [0, 4, 5],
                [0, 5, 1],
                [6, 8, 7],
                [6, 9, 8],
                [6, 10, 9],
                [6, 11, 10],
                [6, 7, 11],
                [1, 9, 10],
                [10, 2, 1],
                [2, 10, 11],
                [11, 3, 2],
                [3, 11, 7],
                [7, 4, 3],
                [4, 7, 8],
                [8, 5, 4],
                [5, 8, 9],
                [9, 1, 5]
            ],
            vertices: () => {
                const radius = 1;
                const point = radius / 2 * (Math.sqrt(5) - 1);
                return [
                    [-radius, point, 0],
                    [-point, 0, -radius],
                    [-radius, -point, 0],
                    [-point, 0, radius],
                    [0, radius, point],
                    [0, radius, -point],
                    [radius, -point, 0],
                    [point, 0, radius],
                    [radius, point, 0],
                    [point, 0, -radius],
                    [0, -radius, -point],
                    [0, -radius, point]
                ];
            }
        }, {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation
        });
    },
    getData: () => getData(SHAPE_TYPE),
    getTile,
    updateFeatures: features => {
        return scanFeaturesCoords(features, coordinates =>
            coordinates.reduce((newCoords, coords, idx) => {
                if (coordinates[idx + 1] && vec2.dist(coords, coordinates[idx + 1]) > 10 ) {
                    return [
                        ...newCoords,
                        coords,
                        ...range(10).map(jdx => getPole(coords, coordinates[idx + 1], jdx / 10))
                    ];
                }
                return [
                    ...newCoords,
                    coords
                ];
            }, []
        )
    ); },
    getTiles: ({coords, zoom = 4}) => {

        const {planes, EARTH_RADIUS: radius} = getData(SHAPE_TYPE);
        const startTile = getTile({coords, zoom, planes});
        const maxTileCount = 20;
        const maxDistance = radius / Math.pow(2, zoom) * 2.5;

        let tmp = {};
        tmp[startTile.name] = {...startTile};

        let check = Object.keys(startTile.near)
            .filter(key => head(startTile.near[key].points.filter(point => vec3.dist(point, startTile.center) <= maxDistance)))
            .map(key => getTile({coords: startTile.near[key].center, zoom, planes}))
            .filter(tile => !tmp[tile.name]);

        const search = () => {
            check.forEach(tile => {
                tmp[tile.name] = {...tile};
            });

            let currentNear = check.reduce((near, tile) => [...near, ...Object.keys(tile.near).map(key => tile.near[key])], []);

            check = currentNear
                .filter(near => head(near.points.map(point => vec3.dist(point, startTile.center) <= maxDistance)))
                .map(near => getTile({coords: near.center, zoom, planes}))
                .filter(tile => !tmp[tile.name]);
        };

        while (!!head(check) && Object.keys(tmp).length <= maxTileCount) {
            search();
        }

        return Object.keys(tmp).map(key => tmp[key]);
    }
};
