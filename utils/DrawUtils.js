/* copyright 2018, stefano bovio @allyoucanmap. */

const tynicolor = require('tinycolor2');
const { isEmpty, head, isArray, isString, trim, template } = require('lodash');

const path = (ctx, coordinates, style = () => { }) => {
    ctx.beginPath();
    coordinates.forEach(c => {
        c.forEach((p, i) => {
            const x = p[0];
            const y = p[1];
            if (i === 0) {
                ctx.moveTo(x, y);
            } else if (i === c.length - 1) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
    });

    const featureBBox = coordinates.map((coordinate) => {
        const min = coordinate.reduce((previous, current) => {
            const x = current[0];
            const y = current[1];
            const newX = x < previous[0] ? x : previous[0];
            const newY = y < previous[1] ? y : previous[1];
            return [newX, newY];
        }, [Infinity, Infinity]);

        const max = coordinate.reduce((previous, current) => {
            const x = current[0];
            const y = current[1];
            const newX = x > previous[0] ? x : previous[0];
            const newY = y > previous[1] ? y : previous[1];
            return [newX, newY];
        }, [-Infinity, -Infinity]);
        return [min, max];
    });

    const min = featureBBox.reduce((previous, current) => {
        const newX = current[0][0] < previous[0][0] ? current[0][0] : previous[0][0];
        const newY = current[0][1] < previous[0][1] ? current[0][1] : previous[0][1];
        return [[newX, newY], []];
    }, [[Infinity, Infinity], [Infinity, Infinity]]);

    const max = featureBBox.reduce((previous, current) => {
        const newX = current[1][0] > previous[1][0] ? current[1][0] : previous[1][0];
        const newY = current[1][1] > previous[1][1] ? current[1][1] : previous[1][1];
        return [[], [newX, newY]];
    }, [[-Infinity, -Infinity], [-Infinity, -Infinity]]);

    style([min[0][0], min[0][1], max[1][0], max[1][1]]);
};

const isFiltered = ({ properties = {} } = {}, filter = []) => {

    if (isEmpty(filter) || !isArray(filter) || isEmpty(properties)) return true;
    const filterMatch = filter.map((line) => {
        const lineMatch = (line || []).map(comp => {
            if (comp.length !== 3) {
                return false;
            } else if (comp[1] === '=') {
                return properties[comp[0]] === comp[2];
            } else if (comp[1] === '!=') {
                return properties[comp[0]] !== comp[2];
            } else if (comp[1] === '>') {
                return properties[comp[0]] > comp[2];
            } else if (comp[1] === '<') {
                return properties[comp[0]] < comp[2];
            } else if (comp[1] === '>=') {
                return properties[comp[0]] >= comp[2];
            } else if (comp[1] === '<=') {
                return properties[comp[0]] <= comp[2];
            }
            return false;
        });
        const trueCnt = lineMatch.filter(val => val);
        return trueCnt.length === lineMatch.length;
    });

    return !!head(filterMatch.filter(val => val));
};

const parseArrayValue = (value, properties) => {

    if (!isArray(value)) return value;

    const defaultValue = head(value);

    const valueMatch = value.filter((val, idx) => idx > 0)
        .map(comp => {
            if (comp.length !== 4) {
                return null;
            } else if (comp[1] === '=') {
                return properties[comp[0]] === comp[2] ? comp[3] : null;
            } else if (comp[1] === '!=') {
                return properties[comp[0]] !== comp[2] ? comp[3] : null;
            } else if (comp[1] === '>') {
                return properties[comp[0]] > comp[2] ? comp[3] : null;
            } else if (comp[1] === '<') {
                return properties[comp[0]] < comp[2] ? comp[3] : null;
            } else if (comp[1] === '>=') {
                return properties[comp[0]] >= comp[2] ? comp[3] : null;
            } else if (comp[1] === '<=') {
                return properties[comp[0]] <= comp[2] ? comp[3] : null;
            } else if (comp[1] === '_w') {
                return properties[comp[0]] && isString(properties[comp[0]]) && properties[comp[0]].indexOf(comp[2]) === 0 ? comp[3] : null;
            }
            return null;
        }).filter(val => val);

    return head(valueMatch) || defaultValue;
};

const applyOpacity = (color, opacity) => {
    const rgb = color.toRgb();
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity || rgb.a})`;
};

const stroke = (ctx, style = {}, {properties = {}}) => {
    const opacity = style['stroke-opacity'];
    ctx.setLineDash(style['stroke-dasharray'] && style['stroke-dasharray'].split(' ').map(value => !isNaN(parseFloat(value)) && parseFloat(value) || null).filter(v => v) || []);
    const strokeValue = tynicolor(parseArrayValue(style.stroke, properties));
    ctx.strokeStyle = strokeValue.isValid() && applyOpacity(strokeValue, opacity) || '#333333';
    ctx.lineWidth = style['stroke-width'] && parseArrayValue(style['stroke-width'], properties) || 1;
    ctx.lineCap = style['stroke-linecap'] && parseArrayValue(style['stroke-linecap'], properties) || 'round';
    ctx.lineJoin = style['stroke-linejoin'] && parseArrayValue(style['stroke-linejoin'], properties) || 'round';
    ctx.stroke();
};

const fill = (ctx, style = {}, {properties = {}}) => {
    const opacity = style['fill-opacity'];
    const fillValue = tynicolor(parseArrayValue(style.fill, properties));
    ctx.fillStyle = fillValue.isValid() && applyOpacity(fillValue, opacity) || '#333333';
    ctx.fill('evenodd');
};

const marks = {
    square: (ctx, feature, style) => {
        const size = style.size && parseArrayValue(style.size, feature.properties) || 10;
        const coordinates = feature.geometry.coordinates[0];
        path(ctx, [
            [
                [coordinates[0] - size / 2, coordinates[1] + size / 2],
                [coordinates[0] + size / 2, coordinates[1] + size / 2],
                [coordinates[0] + size / 2, coordinates[1] - size / 2],
                [coordinates[0] - size / 2, coordinates[1] - size / 2],
                [coordinates[0] - size / 2, coordinates[1] + size / 2]
            ]
        ], () => {
            if (style.stroke) stroke(ctx, style, feature);
            if (style.fill) fill(ctx, style, feature);
        });
    }
};

const text = (ctx, coordinates, properties, style) => {
    const label = style.label && template(style.label)(properties);
    const font = style.font && parseArrayValue(style.font, properties);
    if (font) ctx.font = font;
    if (style.stroke) {
        stroke(ctx, style, {properties});
        ctx.strokeText(label, coordinates[0], coordinates[1]);
    }
    if (style.fill) {
        fill(ctx, style, {properties});
        ctx.fillText(label, coordinates[0], coordinates[1]);
    }
};

const point = (ctx, feature, style) => {
    if (isFiltered(feature, style.filter)) {
        const mark = style.mark && trim(style.mark, '"');
        if (mark) {
            return marks[mark] && marks[mark](ctx, feature, style);
        }
        return text(ctx, feature.geometry.coordinates[0], feature.properties, style);
    }
};

const lineString = (ctx, feature, style) => {
    if (isFiltered(feature, style.filter)) {
        path(ctx, [feature.geometry.coordinates], () => {
            if (style.stroke) stroke(ctx, style, feature);
            if (style.fill) fill(ctx, style, feature);
        });
    }
};

const multiLineString = (ctx, feature, style) => {
    if (isFiltered(feature, style.filter)) {
        feature.geometry.coordinates.forEach(coords => {
            path(ctx, [coords], () => {
                if (style.stroke) stroke(ctx, style, feature);
                if (style.fill) fill(ctx, style, feature);
            });
        });
    }
};

const polygon = (ctx, feature, style) => {
    if (isFiltered(feature, style.filter)) {
        path(ctx, feature.geometry.coordinates, () => {
            ctx.closePath();
            if (style.fill) fill(ctx, style, feature);
            if (style.stroke) stroke(ctx, style, feature);
        });
    }
};

const multiPolygon = (ctx, feature, style) => {
    if (isFiltered(feature, style.filter)) {
        feature.geometry.coordinates.forEach(coordinates => {
            path(ctx, coordinates, () => {
                ctx.closePath();
                if (style.fill) fill(ctx, style, feature);
                if (style.stroke) stroke(ctx, style, feature);
            });
        });
    }
};

module.exports = {
    path,
    stroke,
    fill,
    point,
    lineString,
    multiLineString,
    polygon,
    multiPolygon
};
