/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, scanFeaturesCoords, getPole } = require('../common');
const { mapValue } = require('../../Utils');
const { vec2 } = require('gl-matrix');
const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');

const SHAPE_TYPE = 'pyramid';
let tiles = {};
let bounds = [];

const T_WIDTH = 512;
const T_HEIGHT = T_WIDTH / 2 * Math.tan(rad(60));

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width}, check) => {

    const ang = check ? -360 : 60;
    const deltaX = width / 2;
    const deltaY = check ? height * 2 / 3 : 0;
    const rot = check ? 120 : ang / 2;
    const maxAngle = bboxs.reduce((angle, bbox) => {
        return Math.abs(bbox[2] - bbox[0]) + angle;
    }, 0);

    return bboxs.reduce((newCoord, bbox, idx) => {
        if (coords[0] >= bbox[0] && coords[0] <= bbox[2]) {
            const angle = maxAngle === ang ?
                coords[0] - bbox[0]
                : mapValue(coords[0] - bbox[0], 0, maxAngle, 0, ang);

            const delta = !bboxs[idx - 1] ? 0
                : mapValue(Math.abs(bboxs[idx - 1][2] - bboxs[idx - 1][0]), 0, maxAngle, 0, ang);

            const alpha = angle + delta;

            const partIdx = Math.floor(angle / 60);
            const part = angle % 60;

            const hgt = check ?
            partIdx % 2 === 0 ? height / 3 / Math.cos(rad(part)) : height / 3 / Math.cos(rad(-rot / 2 - part))
            : height / Math.cos(rad(rot - angle));

            if (bbox[3] > 0) {
                const unit = mapValue(coords[1], bbox[3], bbox[1], 0, hgt);
                const x = unit * Math.sin(rad(alpha - rot));
                const y = unit * Math.cos(rad(alpha - rot));
                return [deltaX + x, deltaY + y];
            }

            const unit = mapValue(coords[1], bbox[3], bbox[1], hgt, 0);
            const x = unit * Math.sin(rad(alpha - rot));
            const y = unit * Math.cos(rad(alpha - rot));
            return [deltaX - x, deltaY - y];
        }
        return newCoord;
    }, [0, 0]);
};


module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {
        tiles = {};
        bounds = [
            [[[-180, -45], [-180, 90], [-60, 90], [-60, -45]]],
            [[[-60, -45], [-60, 90], [60, 90], [60, -45]]],
            [[[60, -45], [60, 90], [180, 90], [180, -45]]],
            [[[-180, -90], [-180, -45], [180, -45], [180, -90]]]
        ];

        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 1, 2],
                [0, 2, 3],
                [0, 3, 1],
                [3, 2, 1]
            ],
            vertices: () => {
                const radius = 1;
                const dmt = radius * 2;
                const h = Math.sqrt(3) / 2 * dmt;
                return [
                    [0, h * 2 / 3, 0],
                    [-dmt / 2, -h / 3, h / 3],
                    [dmt / 2, -h / 3, h / 3],
                    [0, -h / 3, -h * 2 / 3]
                ];
            }
        }, {
                position: [0, 0, 0],
                scale: [1, 1, 1],
                rotation
            });
    },
    getData: () => getData(SHAPE_TYPE),
    getSize: data => data.tiles.map(({_size}) => multSizes(Math.pow(2, data.zoom), _size)),
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
                _size: {
                    width: T_WIDTH,
                    height: T_HEIGHT
                },
                model: {
                    index: [0, 1, 2],
                    coordinates: surface.reduce((res, vertex) => [...res, ...vertex], []),
                    textureCoordinates: [
                        0.5, 0.0,
                        0.0, 1.0,
                        1.0, 1.0
                    ],
                    vcolor: [
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
        return coordinates.map(coords => [...project({coords, bboxs: tile.bbox, height, width}, tile.t > 2), 0]);
    },
    getPages: ({ textures }) => {
        const keys = Object.keys(textures);
        const side = textures[keys[0]].width * 2;

        const pages = keys.map(key => {
            const canvas = createElement('canvas', {
                width: side,
                height: side
            }, {
                width: side + 'px',
                height: side + 'px'
            });

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.fillRect(0, 0, side, side);


            ctx.save();
            ctx.translate(side / 4, 0);
            ctx.drawImage(textures[key].texture, 0, 0);
            ctx.restore();

            ctx.strokeStyle = '#777777';
            ctx.stroke();
            ctx.strokeRect(0, 0, side, side);

            return canvas;
        });
        return pages;
    }
};
