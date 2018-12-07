/* copyright 2018, stefano bovio @allyoucanmap. */

const { createElement } = require('./DOMUtils');
const { multiLineString } = require('./DrawUtils');
const { head, isEqual, isEmpty } = require('lodash');

const getRot = pos => {
    if (isEqual([[0, 1, 0], [1, 0, 0], [0, 0, 0]], pos)) {
        return 180;
    } else if (isEqual([[1, 0, 0], [0, 0, 0], [0, 1, 0]], pos)) {
        return 60;
    } else if (isEqual([[0, 0, 0], [0, 0, 1], [0, 1, 0]], pos)) {
        return 180;
    } else if (isEqual([[0, 0, 1], [0, 0, 0], [1, 0, 0]], pos)) {
        return 180;
    } else if (isEqual([[1, 0, 0], [0, 0, 1], [0, 0, 0]], pos)) {
        return -60;
    }
    return 0;
};

const getPages = ({tilesTransformations, sizes, textures, layers, styles}) => {
    const {width, height} = sizes[0];
    const filteredLayers = layers.filter(layer =>
        head(styles.filter(style => style.source === layer.id))
        && layer.tiles && !isEmpty(layer.tiles));

    const loadingLayers = filteredLayers.filter(layer =>
        !head(Object.keys(layer.tiles).filter(key => layer.tiles[key].status !== 'loaded'))
    );

    const isLoaded = filteredLayers.length === loadingLayers.length;

    if (!isLoaded) return null;

    let checked = {};
    const margin = width - height;
    const tileRot = [-150, -30, -270];

    const print = tilesTransformations.reduce((res, current) => {

        const near = current && Object.keys(current.near) || [];

        return [...res, ...near.map((name, idx) => {

            const keys = [name, current.name].sort();
            const currentNear = head(tilesTransformations.filter(tile => tile.name === name));
            if (checked[keys[0] + ':' + keys[1]] || !currentNear) return null;

            const texture = createElement('canvas', {
                width: width * 2,
                height: width
            },
            {
                width: width * 2 + 'px',
                height: width + 'px'
            });
            const ctx = texture.getContext('2d');

            multiLineString(ctx, {
                geometry: {
                    coordinates: [
                        [
                            [0, 0],
                            [width * 2, 0],
                            [width * 2, width],
                            [0, width],
                            [0, 0]
                        ],
                        [
                            [margin, 0],
                            [margin, width]
                        ],
                        [
                            [width * 2 - margin, 0],
                            [width * 2 - margin, width]
                        ]
                    ]
                }
            }, {
                'stroke': '#777777',
                'stroke-dasharray': '10 5'
            });

            checked[keys[0] + ':' + keys[1]] = true;
            if (current.t !== currentNear.t) {
                ctx.save();
                ctx.translate(margin + height + height / 3, width / 2);
                ctx.rotate(tileRot[idx] * Math.PI / 180);
                ctx.drawImage(textures[current.name].texture, -width / 2, -height * 2 / 3, width, height);
                ctx.restore();

                const pos = currentNear.surface.map(vertex => current.surface.map(vrt => isEqual(vertex, vrt) ? 1 : 0));

                ctx.save();
                ctx.translate(margin + height * 2 / 3, width / 2);
                ctx.rotate((tileRot[idx] + getRot(pos)) * Math.PI / 180);
                ctx.drawImage(textures[name].texture, -width / 2, -height * 2 / 3, width, height);
                ctx.restore();
            } else {

                if (current.up) {
                    ctx.save();
                    ctx.translate(margin + height + height / 3, width / 2);
                    ctx.rotate(-30 * Math.PI / 180);
                    ctx.drawImage(textures[current.name].texture, -width / 2, -height * 2 / 3, width, height);
                    ctx.restore();

                    ctx.save();
                    ctx.translate(margin + height * 2 / 3, width / 2);
                    ctx.rotate(-30 * Math.PI / 180);
                    ctx.drawImage(textures[name].texture, -width / 2, -height * 1 / 3, width, height);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.translate(margin + height + height / 3, width / 2);
                    ctx.rotate(30 * Math.PI / 180);
                    ctx.drawImage(textures[current.name].texture, -width / 2, -height * 1 / 3, width, height);
                    ctx.restore();

                    ctx.save();
                    ctx.translate(margin + height * 2 / 3, width / 2);
                    ctx.rotate(30 * Math.PI / 180);
                    ctx.drawImage(textures[name].texture, -width / 2, -height * 2 / 3, width, height);
                    ctx.restore();
                }
            }

            return texture;

        }).filter(val => val)];
    });

    const pages = [
        print.filter((val, idx) => idx < 10),
        print.filter((val, idx) => idx >= 10 && idx < 20),
        print.filter((val, idx) => idx >= 20 && idx < 30)
    ];
    return pages.map(page => {
        let xdx = 0;
        let ydx = 0;

        const texture = createElement('canvas', {
            width: width * 4,
            height: width * 5
        },
        {
            width: width * 4 + 'px',
            height: width * 5 + 'px'
        });

        const ctx = texture.getContext('2d');
        page.forEach((piece, idx) => {
            xdx = idx % 2 === 0 ? 0 : xdx + 1;
            ydx = idx % 5 === 0 ? 0 : ydx + 1;
            ctx.drawImage(piece, xdx * width * 2, ydx * width, width * 2, width);
        });
        return texture;
    });
};

module.exports = {
    getPages
};
