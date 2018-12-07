/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, getPole, scanFeaturesCoords } = require('../common');
const { mapValue } = require('../../Utils');
const { max, min, range } = require('lodash');
const { rotationMatrix } = require('../../MatrixUtils');
const { transform } = require('../../VectorUtils');
const { createElement } = require('../../DOMUtils');
const { vec2 } = require('gl-matrix');

const SHAPE_TYPE = 'lotus';

let tiles = {};
let models = [];
let bounds = [];
let sizes = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width, pos}) => {
    if (pos === 2) {
        if (bboxs.length === 2) {
            if (coords[0] >= bboxs[0][0] && coords[0] <= bboxs[0][2]) {

                const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], 0, width / 2 / Math.cos(rad(45)));

                const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
                const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
                return [width / 2 + x, y];
            }

            const unit = mapValue(coords[1], bboxs[1][3], bboxs[1][1], 0, width / 2 / Math.cos(rad(45)));

            const x = unit * Math.sin(rad(coords[0] - bboxs[1][0]));
            const y = unit * Math.cos(rad(coords[0] - bboxs[1][0]));
            return [width / 2 + x, y];
        }

        const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], 0, width / 2 / Math.cos(rad(45)));

        const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
        const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
        return [width / 2 + x, y];
    }

    if (pos === 0) {

        const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], height, 0);

        const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
        const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
        return [width / 2 + x, height - y];
    }

    const unit = mapValue(coords[1], bboxs[0][3], bboxs[0][1], 0, height);

    const x = unit * Math.sin(rad(coords[0] - bboxs[0][0] - 45));
    const y = unit * Math.cos(rad(coords[0] - bboxs[0][0] - 45));
    return [width / 2 + x, y];

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
            },
            {
                width: _sizes.TRIANGLE_WIDTH,
                height: _sizes.TRIANGLE_HEIGHT
            },
            {
                width: _sizes.QUARTER,
                height: _sizes.QUARTER
            }
        ];

        models = [
            (coordinates) => ({
                index: [0, 1, 2],
                coordinates,
                textureCoordinates: [0.5, 1.0, 1.0, 0.0, 0.0, 0.0],
                vcolor: [ -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            }),
            (coordinates) => ({
                index: [0, 2, 1],
                coordinates,
                textureCoordinates: [0.5, 0.0, 1.0, 1.0, 0.0, 1.0],
                vcolor: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            }),
            (coordinates) => ({
                index: [0, 1, 3, 3, 1, 2],
                coordinates,
                textureCoordinates: [0.5, 1.0, 1.0, 0.5, 0.5, 0.0, 0.0, 0.5],
                vcolor: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            })
        ];
        bounds = [
            [[[-90, -90], [-90, 0], [0, 0], [0, -90]]],
            [[[-180, -90], [-180, 0], [-90, 0], [-90, -90]]],
            [[[90, -90], [90, 0], [180, 0], [180, -90]]],
            [[[0, -90], [0, 0], [90, 0], [90, -90]]],

            [[[-90, 0], [-90, 90], [0, 90], [0, 0]]],
            [[[-180, 0], [-180, 90], [-90, 90], [-90, 0]]],
            [[[90, 0], [90, 90], [180, 90], [180, 0]]],
            [[[0, 0], [0, 90], [90, 90], [90, 0]]],

            [[[-45, 0], [-45, 90], [45, 90], [45, 0]]],
            [[[-135, 0], [-135, 90], [-45, 90], [-45, 0]]],
            [[[135, 0], [135, 90], [180, 90], [180, 0]],
            [[-180, 0], [-180, 90], [-135, 90], [-135, 0]]],
            [[[45, 0], [45, 90], [135, 90], [135, 0]]]
        ];
        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2],
                [0, 2, 3],
                [0, 3, 4],
                [0, 4, 1],

                [5, 1, 2],
                [6, 2, 3],
                [7, 3, 4],
                [8, 4, 1],

                [1, 10, 9, 11],
                [2, 14, 12, 13],
                [3, 17, 15, 16],
                [4, 19, 18, 20]
            ],
            vertices: () => {

                const {
                    QUARTER,
                    HEIGHT,
                    EIGHTH,
                    TRIANGLE_HEIGHT
                } = getDimensions(2);

                const DELTA_HEIGHT = TRIANGLE_HEIGHT * Math.sin(Math.PI / 4);
                const DELTA_SIDE = DELTA_HEIGHT * Math.sin(Math.PI / 4);

                return [

                    [0, -HEIGHT / 2, 0],
                    [0, -HEIGHT / 2, QUARTER],
                    [QUARTER, -HEIGHT / 2, 0],
                    [0, -HEIGHT / 2, -QUARTER],
                    [-QUARTER, -HEIGHT / 2, 0.0],

                    [EIGHTH + DELTA_SIDE, -HEIGHT / 2 + DELTA_HEIGHT, EIGHTH + DELTA_SIDE],
                    [EIGHTH + DELTA_SIDE, -HEIGHT / 2 + DELTA_HEIGHT, -EIGHTH - DELTA_SIDE],
                    [-EIGHTH - DELTA_SIDE, -HEIGHT / 2 + DELTA_HEIGHT, -EIGHTH - DELTA_SIDE],
                    [-EIGHTH - DELTA_SIDE, -HEIGHT / 2 + DELTA_HEIGHT, EIGHTH + DELTA_SIDE],

                    [0, HEIGHT / 2, QUARTER],
                    [-EIGHTH, 0, QUARTER],
                    [EIGHTH, 0, QUARTER],

                    [QUARTER, HEIGHT / 2, 0],
                    [QUARTER, 0, -EIGHTH],
                    [QUARTER, 0, EIGHTH],

                    [0, HEIGHT / 2, -QUARTER],
                    [-EIGHTH, 0, -QUARTER],
                    [EIGHTH, 0, -QUARTER],

                    [-QUARTER, HEIGHT / 2, 0],
                    [-QUARTER, 0, -EIGHTH],
                    [-QUARTER, 0, EIGHTH]
                ];
            }
        },
        {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation
        });
    },
    getData: () => getData(SHAPE_TYPE),
    getSize: data => data.tiles.map((tile, idx) => multSizes(Math.pow(2, data.zoom) + 4, sizes[Math.floor(idx / 4)])),
    getTiles: ({ zoom = 4 }) => {
        const { planes, centers } = getData(SHAPE_TYPE);

        return planes.map((plane, idx) => {

            const name = `${zoom}_t${idx}`;

            if (tiles[name]) return { ...tiles[name] };

            const surface = [...plane];

            const pos = Math.floor(idx / 4);

            tiles[name] = {
                t: idx,
                name,
                pos,
                surface,
                model: models[pos](surface.reduce((res, vertex) => [...res, ...vertex], [])),
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
                if (coordinates[idx + 1] && vec2.dist(coords, coordinates[idx + 1]) > 45 ) {
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

            const pos = Math.floor(idx / 4);

            if (pos === 0) {
                const xIdx = 0;
                const yIdx = 2;
                const mtx = rotationMatrix(idx * 90 - 45);
                const transformedSurface = tile.surface.map(coords => transform(coords, mtx));
                const x = transformedSurface.map(coords => coords[xIdx]);
                const y = transformedSurface.map(coords => coords[yIdx]);
                const { width, height } = data.sizes[idx];
                const maxX = max(x);
                const maxY = max(y);
                const minX = min(x);
                const minY = min(y);
                return {
                    ...tile,
                    transform: {
                        tileSurface: transformedSurface.map(coords => [
                            mapValue(coords[xIdx], minX, maxX, 0, width),
                            idx % 2 === 0 ?
                                mapValue(coords[yIdx], minY, maxY, height, 0) :
                                mapValue(coords[yIdx], minY, maxY, 0, height)
                        ])
                    }
                };
            }

            if (pos === 1) {
                const xIdx = 0;
                const yIdx = 2;
                const mtx = rotationMatrix((idx - 4) * 90 - 45);
                const transformedSurface = tile.surface.map(coords => transform(coords, mtx));
                const x = transformedSurface.map(coords => coords[xIdx]);
                const y = transformedSurface.map(coords => coords[yIdx]);
                const { width, height } = data.sizes[idx];
                const maxX = max(x);
                const maxY = max(y);
                const minX = min(x);
                const minY = min(y);
                return {
                    ...tile,
                    transform: {
                        tileSurface: transformedSurface.map(coords => [
                            mapValue(coords[xIdx], minX, maxX, 0, width),
                            idx % 2 === 0 ?
                                mapValue(coords[yIdx], minY, maxY, height, 0) :
                                mapValue(coords[yIdx], minY, maxY, 0, height)
                        ])
                    }
                };
            }

            const xIdx = idx % 2 === 0 ? 0 : 1;
            const yIdx = idx % 2 === 0 ? 1 : 2;

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
                        mapValue(coords[yIdx], minY, maxY, height, 0)
                    ])
                }
            };
        });
    },
    transform: (coordinates, tileSurface, { tile, width, height }, type) => {
        if (type === 'bg') return [coordinates];
        return coordinates.map(coords => [...project({coords, bboxs: tile.bbox, height, width, pos: tile.pos}), 0]);
    },
    getPages: ({ textures }) => {
        const keys = Object.keys(textures);
        const {width} = textures[keys[0]];
        const size = width * 4;
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
        ctx.translate(size / 2, textures[keys[0]].height / 2);
        ctx.rotate(rad(0));
        ctx.drawImage(textures[keys[0]].texture, -textures[keys[0]].width / 2, -textures[keys[0]].height / 2);
        ctx.restore();

        ctx.save();
        ctx.translate(size - textures[keys[1]].width / 2, size / 2);
        ctx.rotate(rad(90));
        ctx.drawImage(textures[keys[1]].texture, -textures[keys[1]].width / 2, -textures[keys[1]].height / 2);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, size - textures[keys[0]].height / 2);
        ctx.rotate(rad(180));
        ctx.drawImage(textures[keys[2]].texture, -textures[keys[2]].width / 2, -textures[keys[2]].height / 2);
        ctx.restore();

        ctx.save();
        ctx.translate(textures[keys[3]].width / 2, size / 2);
        ctx.rotate(rad(270));
        ctx.drawImage(textures[keys[3]].texture, -textures[keys[3]].width / 2, -textures[keys[3]].height / 2);
        ctx.restore();

        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[4]].texture, -textures[keys[4]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size, 0);
        ctx.rotate(rad(90 - 45));
        ctx.drawImage(textures[keys[5]].texture, -textures[keys[5]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size, size);
        ctx.rotate(rad(180 - 45));
        ctx.drawImage(textures[keys[6]].texture, -textures[keys[6]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(0, size);
        ctx.rotate(rad(270 - 45));
        ctx.drawImage(textures[keys[7]].texture, -textures[keys[7]].width / 2, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, width);
        ctx.rotate(rad(45));
        ctx.drawImage(textures[keys[8]].texture, -textures[keys[8]].width, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(width, size / 2);
        ctx.rotate(rad(-135));
        ctx.drawImage(textures[keys[8]].texture, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, width);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[9]].texture, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(size - width, size / 2);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[9]].texture, -textures[keys[9]].width, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size - width, size / 2);
        ctx.rotate(rad(45));
        ctx.drawImage(textures[keys[10]].texture, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(size / 2, size - width);
        ctx.rotate(rad(-135));
        ctx.drawImage(textures[keys[10]].texture, -textures[keys[10]].width, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(size / 2, size - width);
        ctx.rotate(rad(135));
        ctx.drawImage(textures[keys[11]].texture, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(width, size / 2);
        ctx.rotate(rad(-45));
        ctx.drawImage(textures[keys[11]].texture, -textures[keys[10]].width, 0);
        ctx.restore();

        return [ canvas ];
    }
};
