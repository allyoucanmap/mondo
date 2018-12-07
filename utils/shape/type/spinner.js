/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, getPole, scanFeaturesCoords } = require('../common');

const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');
const { vec2, vec3 } = require('gl-matrix');
const { mapValue } = require('../../Utils');
const SHAPE_TYPE = 'spinner';

let tiles = {};
let models = [];
let bounds = [];
let sizes = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width}) => {

    const maxAngle = bboxs.reduce((angle, bbox) => {
        return Math.abs(bbox[2] - bbox[0]) + angle;
    }, 0);

    return bboxs.reduce((newCoord, bbox, idx) => {
        if (coords[0] >= bbox[0] && coords[0] <= bbox[2]) {
            const angle = maxAngle === 90 ?
                coords[0] - bbox[0]
                : mapValue(coords[0] - bbox[0], 0, maxAngle, 0, 90);

            const delta = !bboxs[idx - 1] ? 0
                : mapValue(Math.abs(bboxs[idx - 1][2] - bboxs[idx - 1][0]), 0, maxAngle, 0, 90);

            const alpha = angle + delta;

            if (bbox[3] > 0) {
                const unit = mapValue(coords[1], bbox[3], bbox[1], 0, height);
                const x = unit * Math.sin(rad(alpha - 45));
                const y = unit * Math.cos(rad(alpha - 45));
                return [width / 2 + x, y];
            }

            const unit = mapValue(coords[1], bbox[3], bbox[1], height, 0);
            const x = unit * Math.sin(rad(alpha - 45));
            const y = unit * Math.cos(rad(alpha - 45));
            return [width / 2 - x, y];
        }
        return newCoord;
    }, [0, 0]);
};
const getDimensions = (unit = 1) => {

    const QUARTER = unit / 4;
    const HEIGHT = QUARTER;
    const EIGHTH = unit / 8;
    const TRIANGLE_HEIGHT = QUARTER * Math.sin(Math.PI / 4);
    const TRIANGLE_WIDTH = QUARTER * Math.sqrt(2);

    return {
        QUARTER,
        HEIGHT,
        EIGHTH,
        TRIANGLE_HEIGHT,
        TRIANGLE_WIDTH
    };
};

module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {

        tiles = {};

        const _sizes = getDimensions(2048);

        sizes = [
            {
                width: _sizes.TRIANGLE_WIDTH,
                height: _sizes.TRIANGLE_HEIGHT
            }
        ];

        bounds = [
            [[[-90, -90], [-90, 0], [0, 0], [0, -90]]],
            [[[-90, 0], [-90, 90], [0, 90], [0, 0]]],

            [[[-180, -90], [-180, 0], [-90, 0], [-90, -90]]],
            [[[-180, 0], [-180, 90], [-90, 90], [-90, 0]]],

            [[[90, -90], [90, 0], [180, 0], [180, -90]]],
            [[[90, 0], [90, 90], [180, 90], [180, 0]]],

            [[[0, -90], [0, 0], [90, 0], [90, -90]]],
            [[[0, 0], [0, 90], [90, 90], [90, 0]]],


            [[[0, 0], [0, 90], [135, 90], [135, 0]]],
            [[[-135, 0], [-135, 90], [0, 90], [0, 0]]],

            [[[0, -90], [0, 0], [135, 0], [135, -90]]],
            [[[-135, -90], [-135, 0], [0, 0], [0, -90]]],

            [[[45, -90], [45, 0], [180, 0], [180, -90]]],

            [[[-180, -90], [-180, 0], [-45, 0], [-45, -90]]],

            [[[45, 0], [45, 90], [180, 90], [180, 0]]],
            [[[-180, 0], [-180, 90], [-45, 90], [-45, 0]]],


            [
                [[135, 0], [135, 90], [180, 90], [180, 0]],
                [[-180, 0], [-180, 90], [-90, 90], [-90, 0]]
            ],

            [[[-90, 0], [-90, 90], [45, 90], [45, 0]]],

            [
                [[135, -90], [135, 0], [180, 0], [180, -90]],
                [[-180, -90], [-180, 0], [-90, 0], [-90, -90]]
            ],

            [[[-90, -90], [-90, 0], [45, 0], [45, -90]]],

            [
                [[90, -90], [90, 0], [180, 0], [180, -90]],
                [[-180, -90], [-180, 0], [-135, 0], [-135, -90]]
            ],
            [[[-45, -90], [-45, 0], [90, 0], [90, -90]]],

            [
                [[90, 0], [90, 90], [180, 90], [180, 0]],
                [[-180, 0], [-180, 90], [-135, 90], [-135, 0]]
            ],
            [[[-45, 0], [-45, 90], [90, 90], [90, 0]]],

            [[[-1, -1], [-1, 0], [0, 0], [0, -1]]]

        ];

        models = [
            (coordinates) => ({
                index: [0, 1, 2],
                coordinates,
                textureCoordinates: [
                    0.5, 0.0,
                    0.0, 1.0,
                    1.0, 1.0
                ],
                vcolor: [ -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            })
        ];
        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2],
                [0, 2, 1],

                [0, 2, 3],
                [0, 3, 2],

                [0, 3, 4],
                [0, 4, 3],

                [0, 4, 1],
                [0, 1, 4],


                [0, 1, 5],
                [0, 5, 1],

                [0, 6, 1],
                [0, 1, 6],

                [0, 3, 6],
                [0, 6, 3],

                [0, 5, 3],
                [0, 3, 5],


                [0, 5, 2],
                [0, 2, 5],

                [0, 2, 6],
                [0, 6, 2],

                [0, 6, 4],
                [0, 4, 6],

                [0, 4, 5],
                [0, 5, 4]

            ],
            vertices: () => {

                return [
                    [0, 0, 0],

                    [0.5, 0, 0],
                    [0, 0, 0.5],
                    [-0.5, 0, 0],
                    [0, 0, -0.5],

                    [0, 0.5, 0],
                    [0, -0.5, 0]
                ].map((vertex) => {
                    let out = [];
                    vec3.scale(out, vertex, 2.5);
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
    getTiles: ({ zoom = 4, camera }) => {
        const { planes, centers, normals } = getData(SHAPE_TYPE);
        let cameraNormal = [];
        vec3.normalize(cameraNormal, camera && camera.position || [0, 0, 0]);
        return planes
            .map((plane, idx) => {

                if (!(!camera || vec3.dot(normals[idx], cameraNormal) > 0)) return null;

                const name = `${zoom}_t${idx}`;

                if (tiles[name]) return { ...tiles[name] };

                const surface = [...plane];

                tiles[name] = {
                    t: idx,
                    name,
                    surface,
                    model: models[0](surface.reduce((res, vertex) => [...res, ...vertex], [])),
                    center: centers[idx],
                    bounds: bounds[idx] || bounds[bounds.length - 1],
                    bbox: getBBox(bounds[idx] || bounds[bounds.length - 1])
                };

                return { ...tiles[name] };
            }).filter(val => val);
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
                        [width / 2, 0],
                        [0, height],
                        [width, height]
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

        const keys = [...Object.keys(textures)].reverse();
        const {height} = textures[keys[0]];
        const size = height / Math.cos(rad(45)) * 2;

        const faces = [
            [
                0, 1, 8, 9,
                10, 11, 7, 6
            ],
            [
                3, 2, 12, 13,
                14, 15, 4, 5
            ],

            [
                1, 0, 18, 19,
                16, 17, 2, 3
            ],
            [
                5, 4, 21, 20,
                23, 22, 6, 7
            ],


            [
                9, 8, 16, 17,
                22, 23, 14, 15
            ],
            [
                10, 11, 20, 21,
                18, 19, 13, 12
            ]
        ];

        const translate = [
            {
                pos: [0, size / 2],
                rot: -135
            },
            {
                pos: [ size / 2, 0],
                rot: 45
            },
            {
                pos: [ size / 2, 0],
                rot: -45
            },
            {
                pos: [ size, size / 2],
                rot: 135
            },

            {
                pos: [0, size / 2],
                rot: -45
            },
            {
                pos: [ size / 2, size],
                rot: 135
            },
            {
                pos: [ size, size / 2],
                rot: 45
            },
            {
                pos: [ size / 2, size],
                rot: -135
            }
        ];

        const pages = faces.map(face => {
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

            face.forEach((pos, idx) => {
                ctx.save();
                ctx.translate(...translate[idx].pos);
                ctx.rotate(rad(translate[idx].rot));
                ctx.drawImage(textures[keys[pos]].texture, -textures[keys[pos]].width / 2, 0);
                ctx.restore();
            });

            ctx.strokeStyle = '#000000';
            ctx.stroke();
            ctx.strokeRect(0, 0, size, size);

            return canvas;
        });

        const canvas = createElement('canvas', {
            width: size * 2,
            height: size * 3
        }, {
            width: (size * 2) + 'px',
            height: (size * 3) + 'px'
        });

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillRect(0, 0, size * 2, size * 3);

        pages.forEach((page, idx) => {
            const y = Math.floor(idx / 2);
            const x = idx - y * 2;
            ctx.save();
            ctx.translate(x * size, y * size);
            ctx.drawImage(page, 0, 0);
            ctx.restore();
        });

        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.strokeRect(0, 0, size * 2, size * 3);

        return [canvas];
    }
};
