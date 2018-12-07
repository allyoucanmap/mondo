/* copyright 2018, stefano bovio @allyoucanmap. */

const {range} = require('lodash');

const EARTH_RADIUS = 6378137.0;
const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS;
const ABS_MAX_LAT = 85.0511;

const deg = r => r / (Math.PI / 180.0);
const rad = d => d * (Math.PI / 180.0);
const resolution = (lat, z) => EARTH_CIRCUMFERENCE * Math.cos(lat * Math.PI / 180) / Math.pow(2, z + 8);
const scale = (lat, z, dpi) => dpi * 39.37 * resolution(lat, z);
const xToLon = x => deg(x / EARTH_RADIUS);
const yToLat = y => deg(2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2);
const lonToX = lon => rad(lon) * EARTH_RADIUS;
const latToY = lat => Math.log(Math.tan(rad(lat) / 2 + Math.PI / 4)) * EARTH_RADIUS;
const wgs84 = coord => [xToLon(coord[0]), yToLat(coord[1])];
const pseudo = coord => [lonToX(coord[0]), latToY(coord[1])];
const dpi = () => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    div.style.left = '-9999px';
    div.style.position = 'absolute';
    div.style.width = '1in';
    div.style.height = '1in';
    document.body.appendChild(div);
    const value = div.clientWidth;
    document.body.removeChild(div);
    return value;
};

const dpiValue = dpi();
const minZoom = 0;
const maxZoom = 21;
const zooms = range(maxZoom + 1);
const resolutions = zooms.map(zoom => resolution(0, zoom));
const scales = zooms.map(zoom => scale(0, zoom, dpiValue));

const toTile = (coordinates, zoom) => [
    Math.floor((coordinates[0] + 180) / 360 * Math.pow(2, zoom)),
    Math.floor((90 - coordinates[1]) / 180 * Math.pow(2, zoom))
];

const fromTile = (coordinates, zoom) => [
    coordinates[0] / Math.pow(2, zoom) * 360 - 180,
    90 - coordinates[1] / Math.pow(2, zoom) * 180
];

module.exports = {
    ABS_MAX_LAT,
    resolution,
    scale,
    wgs84,
    pseudo,
    lonToX,
    latToY,
    rad,
    deg,
    dpi,
    minZoom,
    maxZoom,
    zooms,
    resolutions,
    scales,
    toTile,
    fromTile
};
