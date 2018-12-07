/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, getPole, scanFeaturesCoords } = require('../common');

const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');
const { vec2 } = require('gl-matrix');
const { vec3 } = require('gl-matrix');
const { mapValue } = require('../../Utils');
const SHAPE_TYPE = 'lily';

let tiles = {};
let models = [];
let bounds = [];
let sizes = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const limitDist = vec2.dist([0.38871, 0.25318], [1, 0]);
const T_HEIGHT = vec2.dist([0.38871, 0], [1, 0]);

const project = ({coords, bboxs, height, width}, angle = 45) => {

    const limit = mapValue(limitDist, 0, 0.78047, 0, height);
    const tHeight = mapValue(T_HEIGHT, 0, 0.78047, 0, height);

    const maxAngle = bboxs.reduce((sumAngle, bbox) => {
        return Math.abs(bbox[2] - bbox[0]) + sumAngle;
    }, 0);

    return bboxs.reduce((newCoord, bbox, idx) => {
        if (coords[0] >= bbox[0] && coords[0] <= bbox[2]) {
            const mappedAngle = maxAngle === angle ?
                coords[0] - bbox[0]
                : mapValue(coords[0] - bbox[0], 0, maxAngle, 0, angle);

            const delta = !bboxs[idx - 1] ? 0
                : mapValue(Math.abs(bboxs[idx - 1][2] - bboxs[idx - 1][0]), 0, maxAngle, 0, angle);

            const alpha = mappedAngle + delta;

            if (bbox[3] > 0) {
                const unit = mapValue(coords[1], bbox[3], bbox[1], 0, height);
                if (unit > limit) {
                    const margin = Math.abs(Math.tan(rad(11.25)) * (unit - tHeight));
                    const x = mapValue(coords[0], bbox[0], bbox[2], margin, width - margin);
                    return [x, unit];
                }
                const x = unit * Math.sin(rad(alpha - angle / 2));
                const y = unit * Math.cos(rad(alpha - angle / 2));
                return [width / 2 + x, y];
            }
            const unit = mapValue(coords[1], bbox[3], bbox[1], height, 0);
            if (unit > limit) {
                const margin = Math.abs(Math.tan(rad(11.25)) * (unit - tHeight));
                const x = mapValue(coords[0], bbox[2], bbox[0], margin, width - margin);
                return [x, unit];
            }
            const x = unit * Math.sin(rad(alpha - angle / 2));
            const y = unit * Math.cos(rad(alpha - angle / 2));
            return [width / 2 - x, y];
        }
        return newCoord;
    }, [0, 0]);
};

module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {

        tiles = {};

        sizes = [
            {
                width: 256,
                height: 394.582
            }
        ];

        bounds = [

            [[[-180, 0], [-180, 90], [-90, 90], [-90, 0]]],
            [[[90, 0], [90, 90], [180, 90], [180, 0]]],
            [[[0, 0], [0, 90], [90, 90], [90, 0]]],
            [[[-90, 0], [-90, 90], [0, 90], [0, 0]]],

            [[[-180, -90], [-180, 0], [-90, 0], [-90, -90]]],
            [[[90, -90], [90, 0], [180, 0], [180, -90]]],
            [[[0, -90], [0, 0], [90, 0], [90, -90]]],
            [[[-90, -90], [-90, 0], [0, 0], [0, -90]]]
        ];

        models = [
            (coordinates) => ({
                index: [
                    0, 1, 2,
                    0, 2, 4,
                    4, 2, 3
                ],
                coordinates,
                textureCoordinates: [
                    0.06646, 1.0,
                    0.93354, 1.0,
                    1.0, 0.78324,
                    0.5, 0.0,
                    0.0, 0.78324
                ],
                vcolor: [
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1
                ]
            }),
            (coordinates) => ({
                index: [
                    2, 1, 0,
                    4, 2, 0,
                    3, 2, 4
                ],
                coordinates,
                textureCoordinates: [
                    0.93354, 1.0,
                    0.06646, 1.0,
                    0.0, 0.78324,
                    0.5, 0.0,
                    1.0, 0.78324
                ],
                vcolor: [
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1
                ]
            })
        ];
        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2, 3, 4],
                [5, 0, 6, 7, 8],
                [9, 5, 10, 11, 12],
                [1, 9, 13, 14, 15],

                [0, 1, 2, 3, 4],
                [5, 0, 6, 7, 8],
                [9, 5, 10, 11, 12],
                [1, 9, 13, 14, 15]
            ],
            vertices: () => {

                return [
                    [0.21953, 0, 0.21953],

                    [-0.21953, 0, 0.21953],
                    [-0.25318, 0, 0.38871],
                    [0, 0, 1],
                    [0.25318, 0, 0.38871],

                    [0.21953, 0, -0.21953],
                    [0.38871, 0, 0.25318],
                    [1, 0, 0],
                    [0.38871, 0, -0.25318],

                    [-0.21953, 0, -0.21953],
                    [0.25318, 0, -0.38871],
                    [0, 0, -1],
                    [-0.25318, 0, -0.38871],


                    [-0.38871, 0, -0.25318],
                    [-1, 0, 0],
                    [-0.38871, 0, 0.25318]


                ].map((vertex) => {
                    let out = [];
                    vec3.scale(out, vertex, 1.0);
                    return out;
                });
            }
        },
        {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation
        });
    },
    getData: () => getData(SHAPE_TYPE),
    getSize: data => data.tiles.map(() => multSizes(Math.pow(2, data.zoom), sizes[0])),
    getTiles: ({ zoom = 4 }) => {
        const { planes, centers } = getData(SHAPE_TYPE);

        return planes.map((plane, idx) => {

            const name = `${zoom}_t${idx}`;

            if (tiles[name]) return { ...tiles[name] };

            const surface = [...plane];

            tiles[name] = {
                t: idx,
                name,
                surface,
                model: models[idx > 3 ? 1 : 0](surface.reduce((res, vertex) => [...res, ...vertex], [])),
                center: centers[idx],
                bounds: bounds[idx],
                bbox: getBBox(bounds[idx])
            };

            return { ...tiles[name] };
        });
    },
    updateFeatures: features =>
        scanFeaturesCoords(features, coordinates =>
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
    ),
    transformTiles: (_tiles, data) => {
        return _tiles.map((tile, idx) => {

            const { width, height } = data.sizes[idx];
            return {
                ...tile,
                transform: {
                    tileSurface: [
                        [0, 0],
                        [0, height],
                        [width, height],
                        [width, 0]
                    ]
                }
            };
        });
    },
    transform: (coordinates, tileSurface, { tile, width, height }, type) => {
        if (type === 'bg') return [coordinates];
        return coordinates.map(coords => [...project({coords, bboxs: tile.bbox, height, width}), 0]);
    },
    getPages: ({ textures }) => {
        // 3.414251084
        const keys = Object.keys(textures);
        const {height} = textures[keys[0]];
        const size = height * 3.414251084;
        const canvas = createElement('canvas', {
            width: size,
            height: size
        }, {
            width: size + 'px',
            height: size + 'px'
        });

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillRect(0, 0, size, size);

        const unit = [
            0,
            1,
            2,
            3,

            4,
            4,
            5,
            5,
            6,
            6,
            7,
            7
        ];

        const translate = [

            {
                pos: [0, 0],
                rot: -45
            },
            {
                pos: [0, size],
                rot: -135
            },
            {
                pos: [size, size],
                rot: 135
            },
            {
                pos: [size, 0],
                rot: 45
            },

            {
                pos: [0, 0],
                rot: 0
            },
            {
                pos: [0, 0],
                rot: -90
            },

            {
                pos: [0, size],
                rot: 270
            },
            {
                pos: [0, size],
                rot: 180
            },

            {
                pos: [size, size],
                rot: 180
            },
            {
                pos: [size, size],
                rot: -270
            },

            {
                pos: [size, 0],
                rot: 0
            },
            {
                pos: [size, 0],
                rot: 90
            }
        ];

        unit.forEach((unt, idx) => {
            ctx.save();
            ctx.translate(...translate[idx].pos);
            ctx.rotate(rad(translate[idx].rot));
            ctx.drawImage(textures[keys[unt]].texture, -textures[keys[unt]].width / 2, 0);
            ctx.restore();
        });

        ctx.strokeStyle = '#777777';
        ctx.stroke();
        ctx.strokeRect(0, 0, size, size);

        return [ canvas ];
    }
};
