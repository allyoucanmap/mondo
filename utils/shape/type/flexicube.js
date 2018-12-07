/* copyright 2018, stefano bovio @allyoucanmap. */

const { setup, getData, getBBox, rad, scanFeaturesCoords, getPole } = require('../common');
const { mapValue } = require('../../Utils');
const { vec2 } = require('gl-matrix');
const { range } = require('lodash');
const { createElement } = require('../../DOMUtils');

const SHAPE_TYPE = 'flexicube';
let tiles = {};
let bounds = [];

const multSizes = (zoom, { width, height }) => ({
    width: width * zoom,
    height: height * zoom
});

const project = ({coords, bboxs, height, width}, length, check) => {

    const ang = length === 4 ? 90 : 70;
    const deltaX = length === 4 ? 0 : width / 2;
    const rot = length === 4 ? check ? 0 : ang : ang / 2;
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

            const hgt = length === 4 && idx !== 1 ?
                height / Math.cos(rad(angle > 45 ? 90 - angle : angle))
                : length === 4 ? height / Math.cos(rad(45 - angle)) : height;

            if (bbox[3] > 0) {
                const unit = mapValue(coords[1], bbox[3], bbox[1], 0, hgt);
                const x = unit * Math.sin(rad(alpha - rot));
                const y = unit * Math.cos(rad(alpha - rot));
                return [deltaX + x, y];
            }

            const unit = mapValue(coords[1], bbox[3], bbox[1], hgt, 0);
            const x = unit * Math.sin(rad(alpha - rot));
            const y = unit * Math.cos(rad(alpha - rot));
            return [deltaX - x, y];
        }
        return newCoord;
    }, [0, 0]);
};


module.exports = {
    maxZoom: 2,
    setup: (rotation = [0, 0, 0]) => {
        tiles = {};
        bounds = [
            [[[-60, -90], [-60, 0], [60, 0], [60, -90]]],
            [[[-180, -90], [-180, 0], [-60, 0], [-60, -90]]],
            [[[60, -90], [60, 0], [180, 0], [180, -90]]],

            [[[-180, 0], [-180, 90], [-120, 90], [-120, 0]]],
            [[[-120, 0], [-120, 90], [-60, 90], [-60, 0]]],
            [[[-60, 0], [-60, 90], [0, 90], [0, 0]]],
            [[[60, 0], [60, 90], [120, 90], [120, 0]]],
            [[[120, 0], [120, 90], [180, 90], [180, 0]]],
            [[[0, 0], [0, 90], [60, 90], [60, 0]]],

            [
                [[120, 0], [120, 90], [180, 90], [180, 0]],
                [[-180, 0], [-180, 90], [-120, 90], [-120, 0]]
            ],
            [[[-120, 0], [-120, 90], [-0, 90], [-0, 0]]],
            [[[0, 0], [0, 90], [120, 90], [120, 0]]],

            [[[120, -90], [120, 0], [180, 0], [180, -90]]],
            [[[60, -90], [60, 0], [120, 0], [120, -90]]],
            [[[-120, -90], [-120, 0], [-60, 0], [-60, -90]]],
            [[[-180, -90], [-180, 0], [-120, 0], [-120, -90]]],
            [[[0, -90], [0, 0], [60, 0], [60, -90]]],
            [[[-60, -90], [-60, 0], [0, 0], [0, -90]]]
        ];

        return setup(SHAPE_TYPE, {
            faces: () => [
                [0, 3, 6, 4],
                [0, 1, 2, 3],
                [0, 4, 5, 1],

                [7, 1, 2],
                [7, 2, 3],
                [7, 3, 6],
                [7, 4, 5],
                [7, 5, 1],
                [7, 6, 4],

                [10, 11, 8, 5],
                [10, 9, 12, 11],
                [10, 5, 4, 9],

                [13, 8, 5],
                [13, 5, 4],
                [13, 12, 11],
                [13, 11, 8],
                [13, 4, 9],
                [13, 9, 12]
            ],
            vertices: () => {
                const radius = 1;
                return [
                    [-radius / 2, -radius / 2, radius],
                    [-radius / 2, radius / 2, radius],
                    [radius / 2, radius / 2, radius],
                    [radius / 2, -radius / 2, radius],
                    [-radius / 2, -radius / 2, 0],
                    [-radius / 2, radius / 2, 0],
                    [radius / 2, -radius / 2, 0],

                    [0, 0, radius / 2],

                    [radius / 2, radius / 2, 0],
                    [-radius / 2, -radius / 2, -radius],
                    [-radius / 2, radius / 2, -radius],
                    [radius / 2, radius / 2, -radius],
                    [radius / 2, -radius / 2, -radius],

                    [0, 0, -radius / 2]

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
                _size: surface.length === 4 ? {width: 512, height: 512} : {width: 512, height: 512 * 0.7140740033710573},
                model: surface.length === 4 ? {
                    index: [0, 3, 1, 3, 2, 1],
                    coordinates: surface.reduce((res, vertex) => [...res, ...vertex], []),
                    textureCoordinates: [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ],
                    vcolor: [
                        -1, -1, -1, -1,
                        -1, -1, -1, -1,
                        -1, -1, -1, -1,
                        -1, -1, -1, -1
                    ]
                } : {
                    index: [0, 1, 2],
                    coordinates: surface.reduce((res, vertex) => [...res, ...vertex], []),
                    textureCoordinates: [
                        0.5, 0.0,
                        0.0, 1.0,
                        1.0, 1.0
                    ],
                    vcolor: [ -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
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
        return coordinates.map(coords => [...project({coords, bboxs: tile.bbox, height, width}, tile.surface.length, tile.t > 4), 0]);
    },
    getPages: ({ textures }) => {
        const keys = Object.keys(textures);
        const width = textures[keys[0]].width * 2;
        const height = width * 29.7 / 21;

        const units = [
            [17, 9, 12, 11],
            [16, 13, 14, 12],
            [15, 10, 11, 14],
            [8, 5, 2, 4],
            [7, 3, 0, 2],
            [6, 1, 4, 0]
        ];

        const pages = units.map(unit => {
            const canvas = createElement('canvas', {
                width,
                height
            }, {
                width: width + 'px',
                height: height + 'px'
            });

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(0, height / 2);
            ctx.drawImage(textures[keys[unit[0]]].texture, 0, -textures[keys[unit[0]]].height);
            ctx.restore();

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate(rad(180));
            ctx.drawImage(textures[keys[unit[1]]].texture, 0, -textures[keys[unit[2]]].height);
            ctx.restore();

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate(rad(180));
            ctx.drawImage(textures[keys[unit[2]]].texture, -textures[keys[unit[2]]].width, -textures[keys[unit[2]]].height);
            ctx.restore();

            ctx.save();
            ctx.translate(width / 4, height / 2 + textures[keys[unit[3]]].height);
            ctx.rotate(rad(110));
            ctx.drawImage(textures[keys[unit[3]]].texture, -textures[keys[unit[3]]].width / 2, 0);
            ctx.restore();

            ctx.strokeStyle = '#777777';
            ctx.stroke();
            ctx.strokeRect(0, 0, width, height);

            return canvas;
        });
        return pages;
    }
};
