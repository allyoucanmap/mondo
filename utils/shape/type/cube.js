/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, scanFeaturesCoords, getPole } = require('../common');
const { mapValue } = require('../../Utils');
const { vec2 } = require('gl-matrix');
const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');

const SHAPE_TYPE = 'cube';
let tiles = {};
let bounds = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width}, square) => {

    if (square) {
        const x = mapValue(coords[0], bboxs[0][0], bboxs[0][2], 0, width);
        const y = mapValue(coords[1], bboxs[0][1], bboxs[0][3], height, 0);
        return [x, y];
    }

    const maxAngle = bboxs.reduce((angle, bbox) => {
        return Math.abs(bbox[2] - bbox[0]) + angle;
    }, 0);

    return bboxs.reduce((newCoord, bbox, idx) => {
        if (coords[0] >= bbox[0] && coords[0] <= bbox[2]) {
            const angle = maxAngle === 360 ?
                coords[0] - bbox[0]
                : mapValue(coords[0] - bbox[0], 0, maxAngle, 0, 360);

            const delta = !bboxs[idx - 1] ? 0
                : mapValue(Math.abs(bboxs[idx - 1][2] - bboxs[idx - 1][0]), 0, maxAngle, 0, 360);

            const alpha = angle + delta;

            if (bbox[3] > 0) {
                const unit = mapValue(coords[1], bbox[3], bbox[1], 0, height / 2);
                const x = unit * Math.sin(rad(alpha - 135));
                const y = unit * Math.cos(rad(alpha - 135));
                return [x + width / 2, y + height / 2];
            }

            const unit = mapValue(coords[1], bbox[3], bbox[1], height / 2, 0);
            const x = unit * Math.sin(rad(alpha - 135));
            const y = unit * Math.cos(rad(alpha - 135));
            return [x + width / 2, height / 2 - y];
        }
        return newCoord;
    }, [0, 0]);
};

module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {
        tiles = {};
        bounds = [

            [[[-180, 45], [-180, 90], [180, 90], [180, 45]]],

            [[[-180, -90], [-180, -45], [180, -45], [180, -90]]],

            [[[-90, -45], [-90, 45], [0, 45], [0, -45]]],
            [[[0, -45], [0, 45], [90, 45], [90, -45]]],
            [[[90, -45], [90, 45], [180, 45], [180, -45]]],
            [[[-180, -45], [-180, 45], [-90, 45], [-90, -45]]]
        ];

        return setup(SHAPE_TYPE, {
            faces: () => [
                [6, 2, 1, 5],
                [3, 7, 4, 0],

                [2, 3, 0, 1],
                [1, 0, 4, 5],
                [5, 4, 7, 6],
                [6, 7, 3, 2]
            ],
            vertices: () => {
                const radius = 1;
                return [
                    [-radius / 2, -radius / 2, -radius / 2],
                    [-radius / 2, radius / 2, -radius / 2],
                    [radius / 2, radius / 2, -radius / 2],
                    [radius / 2, -radius / 2, -radius / 2],

                    [-radius / 2, -radius / 2, radius / 2],
                    [-radius / 2, radius / 2, radius / 2],
                    [radius / 2, radius / 2, radius / 2],
                    [radius / 2, -radius / 2, radius / 2]
                ];
            }
        }, {
                position: [0, 0, 0],
                scale: [1, 1, 1],
                rotation
            });
    },
    getData: () => getData(SHAPE_TYPE),
    getSize: data => data.tiles.map(() => multSizes(Math.pow(2, data.zoom), {width: 512, height: 512})),
    getTiles: ({ zoom = 4 }) => {

        const { planes, centers } = getData(SHAPE_TYPE);

        return planes.map((plane, idx) => {

            const name = `${zoom}_t${idx}`;

            if (tiles[name]) return { ...tiles[name] };

            const surface = plane;

            tiles[name] = {
                t: idx,
                name,
                surface,
                center: centers[idx],
                bounds: bounds[idx],
                bbox: getBBox(bounds[idx]),
                model: {
                    index: [0, 2, 3, 0, 1, 2],
                    coordinates: surface.reduce((res, vertex) => [...res, ...vertex], []),
                    textureCoordinates: [
                        0.0, 0.0,
                        0.0, 1.0,
                        1.0, 1.0,
                        1.0, 0.0
                    ],
                    vcolor: [
                        -1, -1, -1, -1,
                        -1, -1, -1, -1,
                        -1, -1, -1, -1,
                        -1, -1, -1, -1
                    ]
                }
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
                        ...range(20).map(jdx => getPole(coords, coordinates[idx + 1], jdx / 20))
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
        return coordinates.map(coords => [...project({coords, bboxs: tile.bbox, height, width}, tile.t > 1), 0]);
    },
    getPages: ({ textures }) => {

        const keys = Object.keys(textures);
        const {height} = textures[keys[0]];
        const size = height * Math.cos(rad(45)) * 4;

        const near = [
            [1, 3],
            [4, 5],
            [3, 1],
            [4, 5],
            [0, 2],
            [0, 2]
        ];
        const baseRots = [
            [0, 0, 0],
            [0, -180, -180],
            [0, 0, 0],
            [0, 0, 0],
            [0, -90, 90],
            [-90, 0, -180]
        ];
        const pages = keys.map((key, idx) => {
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

            const rot = idx % 2 === 0 ? 0 : 90;
            const baseRot = baseRots[idx];

            ctx.save();
            ctx.translate(size * 3 / 4, size / 4);
            ctx.rotate(rad(45 + rot + baseRot[0]));
            ctx.drawImage(textures[key].texture, -textures[key].width / 2, -textures[key].height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(size / 4, size * 3 / 4);
            ctx.rotate(rad(45 + rot + baseRot[0]));
            ctx.drawImage(textures[key].texture, -textures[key].width / 2, -textures[key].height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(size / 2, 0);
            ctx.rotate(rad(-45 + rot + baseRot[0]));
            ctx.drawImage(textures[key].texture, -textures[key].width / 2, -textures[key].height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(size / 2, size);
            ctx.rotate(rad(-45 + rot + baseRot[0]));
            ctx.drawImage(textures[key].texture, -textures[key].width / 2, -textures[key].height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(size / 4, size / 4);
            ctx.rotate(rad(-45 + rot + baseRot[1]));
            ctx.drawImage(textures[keys[near[idx][0]]].texture, -textures[keys[near[idx][0]]].width / 2, -textures[keys[near[idx][0]]].height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(size * 3 / 4, size * 3 / 4);
            ctx.rotate(rad(-45 + rot + baseRot[2]));
            ctx.drawImage(textures[keys[near[idx][1]]].texture, -textures[keys[near[idx][1]]].width / 2, -textures[keys[near[idx][1]]].height / 2);
            ctx.restore();

            ctx.strokeStyle = '#777777';
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

        return [canvas, ...pages];
    }
};
