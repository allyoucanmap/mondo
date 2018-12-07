/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, getPole, scanFeaturesCoords } = require('../common');
const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');
const { vec2 } = require('gl-matrix');
const { vec3 } = require('gl-matrix');
const { mapValue } = require('../../Utils');
const SHAPE_TYPE = 'butterfly';

let tiles = {};
let models = [];
let bounds = [];
let sizes = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width}) => {

    if (bboxs[0][3] > 0) {
        const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], 0, height);
        const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
        const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
        return [width / 2 + x, y];
    }
    const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], height, 0);
    const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
    const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
    return [width / 2 - x, y];
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

        const _sizes = getDimensions(256);

        sizes = [
            {
                width: _sizes.TRIANGLE_WIDTH,
                height: _sizes.TRIANGLE_HEIGHT
            }
        ];

        bounds = [
            [[[-90, -90], [-90, 0], [0, 0], [0, -90]]],
            [[[-90, 0], [-90, 90], [0, 90], [0, 0]]],
            [[[-180, 0], [-180, 90], [-90, 90], [-90, 0]]],
            [[[0, -90], [0, 0], [90, 0], [90, -90]]],

            [[[0, 0], [0, 90], [90, 90], [90, 0]]],
            [[[90, 0], [90, 90], [180, 90], [180, 0]]],
            [[[90, -90], [90, 0], [180, 0], [180, -90]]],
            [[[-180, -90], [-180, 0], [-90, 0], [-90, -90]]]
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
            }),
            (coordinates, change) => ({
                index: [0, 2, 1, 0, 3, 2],
                coordinates,
                textureCoordinates: !change ? [
                    0.5, 0.0,
                    0.875, 0.75,
                    0.5, 1.0,
                    0.0, 1.0
                ] : [
                    0.5, 0.0,
                    1.0, 1.0,
                    0.5, 1.0,
                    0.125, 0.75
                ],
                vcolor: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            })
        ];
        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2],
                [3, 2, 1],
                [3, 4, 2],

                [0, 5, 1],
                [6, 1, 5],
                [6, 5, 7],

                [0, 8, 9, 10],
                [0, 13, 12, 11]
            ],
            vertices: () => {

                return [
                    [1, 0, 0],
                    [-1, 0, 0],
                    [1, 0.3473, 1.96962],
                    [-1, 0.3473, 1.96962],
                    [-1, 0.3473, 3.96962],
                    [1, 0.3473, -1.96962],
                    [-1, 0.3473, -1.96962],
                    [-1, 0.3473, -3.96962],

                    [0.73953, 0.12875, -1.47159],
                    [1.81116, 0.10097, -1.15405],
                    [2.96962, 0.03027, -0.34597],

                    [0.73953, 0.12875, 1.47159],
                    [1.81116, 0.10097, 1.15405],
                    [2.96962, 0.03027, 0.34597]
                ].map((vertex) => {
                    let out = [];
                    vec3.scale(out, vertex, 0.3);
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
    getSize: data => data.tiles.map(() => multSizes(Math.pow(2, data.zoom) + 4, sizes[0])),
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
                model: models[surface.length === 3 ? 0 : 1](surface.reduce((res, vertex) => [...res, ...vertex], []), idx % 2 !== 0),
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

        const keys = Object.keys(textures);
        const {height} = textures[keys[0]];
        const size = height / Math.cos(rad(45)) * 4;
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
        ctx.strokeStyle = '#777777';
        ctx.stroke();
        ctx.strokeRect(0, 0, size, size);

        ctx.save();
        ctx.translate(size / 4, size);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[0]].texture, -textures[keys[0]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size * 3 / 4, size);
        ctx.rotate(rad(-135));
        ctx.drawImage(textures[keys[1]].texture, -textures[keys[1]].width / 2, 0);
        ctx.restore();


        ctx.save();
        ctx.translate(size * 3 / 4, 0);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[2]].texture, -textures[keys[2]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size * 3 / 4, 0);
        ctx.rotate(rad(45));
        ctx.drawImage(textures[keys[3]].texture, -textures[keys[3]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size * 3 / 4, size / 4);
        ctx.rotate(rad(-135));
        ctx.drawImage(textures[keys[4]].texture, 0, -textures[keys[4]].height);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 4, 0);
        ctx.rotate(rad(45));
        ctx.drawImage(textures[keys[5]].texture, -textures[keys[5]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 4, 0);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[6]].texture, -textures[keys[6]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, 0);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[7]].texture, 0, -textures[keys[7]].height);
        ctx.restore();

        return [ canvas ];
    }
};
