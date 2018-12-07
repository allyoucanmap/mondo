/* copyright 2018, stefano bovio @allyoucanmap. */

const { range, isEmpty, get, min, max, isArray, isString } = require('lodash');
const { vec2 } = require('gl-matrix');
const tinycolor = require('tinycolor2');
const { mapValue } = require('../Utils');
const chroma = require('chroma-js');
const chache = {};

class Point {

    constructor(width, height) {
        this.state = {
            width,
            height,
            time: 0
        };

        this.setRandom();
    }

    update(x, y) {
        if (x === null || this.state.time > this.state.life) {
            this.setRandom();
        } else {
            this.state.lastX = this.state.x;
            this.state.lastY = this.state.y;
            this.state.x += x;
            this.state.y += y;
            this.state.time += 1;
        }
    }

    getCoords() {
        return [this.state.x, this.state.y];
    }

    getLastCoords() {
        return [this.state.lastX, this.state.lastY];
    }

    setRandom() {
        const x = Math.floor(Math.random() * this.state.width);
        const y = Math.floor(Math.random() * this.state.height);
        this.state = {
            ...this.state,
            x,
            y,
            lastX: x,
            lastY: y,
            time: 0,
            life: mapValue(Math.random(), 0, 1, 50, 200)
        };
    }
}

const getNumber = key => {
    const value = parseFloat(key);
    return !isNaN(value) ? value : null;
};

const validateColors = (colors = []) => {
    const validColors = colors.filter(color => tinycolor(color).isValid());
    return validColors.length > 1 ? validColors : null;
};
const getColorScale = color => {
    const colors = isString(color) && tinycolor(color).isValid() && [color, tinycolor(color).complement().toHexString()];
    return chroma.scale(colors || isArray(color) && validateColors(color) || ['#ff00ff', '#00ffff']).mode('lch');
};

module.exports = class Wind {

    constructor(data) {
        this.state = {style: {}, ...data};
        this.state.points = range(250).map(() =>
            new Point(
                this.state.width,
                this.state.height
            )
        );

        const name = `${this.state.shapeType}_${this.state.layerName}_${this.state.name}`;

        this.state.count = 50;
        this.state.speed = this.state.style.speed ? this.state.style.speed : 1;
        this.state.grid = chache[name] && chache[name].speed === this.state.speed && chache[name] || {};

        const uKey = this.state.style.u;
        const vKey = this.state.style.v;
        const minUKey = this.state.style['min-u'];
        const maxUKey = this.state.style['max-u'];
        const minVKey = this.state.style['min-v'];
        const maxVKey = this.state.style['max-v'];

        const minU = getNumber(minUKey) || getNumber(get(this.state, `features[0].properties.${minUKey || 'umin'}`)) || -1;
        const maxU = getNumber(maxUKey) || getNumber(get(this.state, `features[0].properties.${maxUKey || 'umax'}`)) || 1;
        const minV = getNumber(minVKey) || getNumber(get(this.state, `features[0].properties.${minVKey || 'vmin'}`)) || -1;
        const maxV = getNumber(maxVKey) || getNumber(get(this.state, `features[0].properties.${maxVKey || 'vmax'}`)) || 1;

        this.state.min = min([minU, minV]);
        this.state.max = max([maxU, maxV]);

        this.state.stroke = getColorScale(this.state.style.stroke);
        this.state.strokeOpacity = getNumber(this.state.style['stroke-opacity']) || 1;
        this.state.strokeWidth = getNumber(this.state.style['stroke-width']) || 1;

        if (this.state.features.length > 0 && isEmpty(this.state.grid)) {
            range(this.state.count).forEach((y) => {
                range(this.state.count).forEach((x) => {
                    const points = this.state.features
                        .filter(({geometry}) => {
                            const gX = Math.floor(geometry.coordinates[0][0] / this.state.width * this.state.count);
                            const gY = Math.floor(geometry.coordinates[0][1] / this.state.height * this.state.count);
                            return gX === x && gY === y;
                        })
                        .map(({properties = {}}) =>
                            [
                                getNumber(uKey) || getNumber(properties[uKey || 'u']) || 0,
                                getNumber(vKey) || getNumber(properties[vKey || 'v']) || 0
                            ]
                        );
                    if (points.length > 0) {
                        const sum = points.reduce((previous, current) => [previous[0] + current[0], previous[1] + current[1]]);
                        const posX = mapValue(sum[0] / points.length, this.state.min, this.state.max, -this.state.speed, this.state.speed);
                        const posY = mapValue(sum[1] / points.length, this.state.min, this.state.max, -this.state.speed, this.state.speed);
                        this.state.grid[`${x}_${y}`] = [posX, posY, vec2.length([posX, posY])];
                    } else {
                        this.state.grid[`${x}_${y}`] = [null, null];
                    }
                });
            });
            chache[name] = {...this.state.grid, speed: this.state.speed};
        }
    }

    draw() {
        const {ctx} = this.state;

        ctx.save();
        ctx.drawImage(this.state.background.texture, 0, 0);
        ctx.restore();

        this.interval = setInterval(() => {

            this.state.points.forEach(point => {

                const coords = point.getCoords();
                const x = Math.floor(coords[0] / this.state.width * this.state.count);
                const y = Math.floor(coords[1] / this.state.height * this.state.count);
                const direction = this.state.grid[`${x}_${y}`] || [0, 0, 0];

                point.update(...direction);
                ctx.beginPath();
                const color = this.state.stroke(mapValue(direction[2], 0, this.state.speed, 0, 1)).hex();
                ctx.strokeStyle = tinycolor(color)
                    .setAlpha(this.state.strokeOpacity)
                    .toRgbString();

                ctx.lineWidth = this.state.strokeWidth;
                ctx.moveTo(...point.getLastCoords());
                ctx.lineTo(...point.getCoords());
                ctx.stroke();

            });
        });
    }

    destroy() {
        if (this.interval) return clearInterval(this.interval);
        return null;
    }
};
