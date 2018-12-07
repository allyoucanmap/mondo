/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad } = require('../common');
const { mapValue } = require('../../Utils');
const { max, min } = require('lodash');
const { createElement } = require('../../DOMUtils');

const SHAPE_TYPE = 'crane';
let tiles = {};
let models = [];
let bounds = [];
let sizes = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bbox, height, width}) => {

    const size = {
        width: [
            1,
            0.87296
        ],
        height: [
            1.20713,
            0.31913,
            0.43648
        ]
    };

    if (coords[1] < 0) {
        const y = mapValue(coords[1], bbox[1], bbox[3], height, 0);
        const hgt = height * size.height[1] / (size.height[0] + size.height[1]);
        const margin = Math.abs(Math.tan(rad(22.5)) * (y - hgt));
        const x = mapValue(coords[0], bbox[0], bbox[2], margin, width - margin);
        return [x, y];
    } else if (coords[1] >= 0 && coords[1] <= 38.012466749) {
        const y = mapValue(coords[1], bbox[1], bbox[3], height, 0);
        const hgt = height * size.height[1] / (size.height[0] + size.height[1]);
        const margin = Math.abs(Math.tan(rad(11.25)) * (hgt - y));
        const x = mapValue(coords[0], bbox[0], bbox[2], margin, width - margin);
        return [x, y];
    }

    const y = mapValue(coords[1], bbox[1], bbox[3], height, 0);
    const margin = Math.tan(rad(45)) * (height - y);
    const x = mapValue(coords[0], bbox[0], bbox[2], margin, width - margin);
    return [x, y];
};

module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {
        tiles = {};
        sizes = [
            {
                width: 87.296,
                height: 43.647
            },
            {
                width: 87.296,
                height: 43.647
            },
            {
                width: 100,
                height: 152.627
            },
            {
                width: 100,
                height: 152.627
            }
        ];
        models = [
            (coordinates) => ({
                index: [0, 1, 2],
                coordinates,
                textureCoordinates: [
                    0.0, 1.0,
                    1.0, 1.0,
                    0.5, 0.0
                ],
                vcolor: [
                    -1, -1, -1, -1,
                    -1, -1, -1, -1,
                    -1, -1, -1, -1
                ]
            }),
            (coordinates) => ({
                index: [0, 1, 2],
                coordinates,
                textureCoordinates: [
                    0.0, 1.0,
                    1.0, 1.0,
                    0.5, 0.0
                ],
                vcolor: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            }),
            (coordinates) => ({
                index: [
                    0, 1, 2,
                    0, 2, 3,
                    0, 3, 4
                ],
                coordinates,
                textureCoordinates: [
                    0.93650, 0.0,
                    0.06352, 0.0,
                    0.0, 0.20910,
                    0.5, 1.0,
                    1.0, 0.20910
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
                    0, 1, 2,
                    0, 2, 3,
                    0, 3, 4
                ],
                coordinates,
                textureCoordinates: [
                    0.0, 0.20910,
                    0.5, 1.0,
                    1.0, 0.20910,
                    0.93650, 0.0,
                    0.06352, 0.0
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
        bounds = [
            [
                [
                    [-180.0, 90.0],
                    [-180.0, 38.012466749],
                    [0.0, 38.012466749],
                    [0.0, 90.0]
                ]
            ],
            [
                [
                    [0, 90.0],
                    [180.0, 90.0],
                    [180.0, 38.012466749],
                    [0.0, 38.012466749]
                ]
            ],
            [
                [
                    [-180.0, 38.012466749],
                    [-180.0, -90.0],
                    [0.0, -90.0],
                    [0.0, 38.012466749]
                ]
            ],
            [
                [
                    [0, 38.012466749],
                    [180.0, 38.012466749],
                    [180.0, -90.0],
                    [0.0, -90.0]
                ]
            ]
        ];
        return setup(SHAPE_TYPE, {
            faces: () => [
                [4, 3, 5],
                [7, 8, 6],
                [0, 2, 1, 5, 3],
                [6, 8, 10, 11, 9]
            ],
            vertices: () => {
                const radius = 1;
                const left = -0;
                const right = 0;
                return [
                    [right + 0.43648, 0.31913, -radius / 2],
                    [right + 0.43648, 0.31913, radius / 2],
                    [right + 1.20713 + 0.43648, 0.31913, 0],

                    [right, 0.31913, -0.43648],
                    [right, 0.75560, 0],
                    [right, 0.31913, 0.43648],

                    [left, 0.31913, -0.43648],
                    [left, 0.75560, 0],
                    [left, 0.31913, 0.43648],

                    [left - 0.43648, 0.31913, -radius / 2],
                    [left - 0.43648, 0.31913, radius / 2],
                    [left - 1.20713 - 0.43648, 0.31913, 0]
                ];
            }
        }, {
                position: [0, 0, 0],
                scale: [1, 1, 1],
                rotation
            });
    },
    getData: () => getData(SHAPE_TYPE),
    getSize: data => {
        return data.tiles.map((tile, idx) => {
            return multSizes(Math.pow(2, data.zoom) + 4, sizes[idx]);
        });
    },
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
                model: models[idx]([...surface.reverse()].reduce((res, vertex) => [...res, ...vertex], [])),
                center: centers[idx],
                bounds: bounds[idx],
                bbox: getBBox(bounds[idx])
            };
            return { ...tiles[name] };
        });
    },
    transformTiles: (_tiles, data) => {

        return _tiles.map((tile, idx) => {

            const xIdx = idx > 1 ? 2 : 2;
            const yIdx = idx > 1 ? 0 : 1;

            const x = tile.surface.map(coords => coords[xIdx]);
            const y = tile.surface.map(coords => coords[yIdx]);
            const { width, height } = data.sizes[idx];

            const maxX = max(x);
            const maxY = max(y);
            const minX = min(x);
            const minY = min(y);

            return {
                ...tile,
                transform: {
                    tileSurface: tile.surface.map(coords => [
                        mapValue(coords[xIdx], minX, maxX, 0, width),
                        idx === 2 ? mapValue(coords[yIdx], minY, maxY, 0, height)
                        : mapValue(coords[yIdx], minY, maxY, height, 0),
                        0
                    ])
                }
            };
        });
    },
    transform: (coordinates, tileSurface, { tile, width, height }, type) => {
        if (type === 'bg') return [coordinates];
        return coordinates.map(coords => {
            return [
                ...project({coords, bbox: tile.bbox[0], height, width}),
                0
            ];
        });
    },
    getPages: ({ textures }) => {

        const keys = Object.keys(textures);
        const {width} = textures[keys[2]];
        const size = width * 4.261847937;
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
        ctx.translate(0, 0);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[0]].texture, -textures[keys[0]].width / 2, -textures[keys[0]].height);
        ctx.restore();

        ctx.save();
        ctx.translate(size, size);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[1]].texture, -textures[keys[1]].width / 2, -textures[keys[1]].height);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[2]].texture, -textures[keys[2]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[3]].texture, -textures[keys[3]].width / 2, 0);
        ctx.restore();

        return [ canvas ];
    }
};
