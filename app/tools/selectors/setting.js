/* copyright 2018, stefano bovio @allyoucanmap. */

const type = state => state.setting && state.setting.type || 'icosahedron';
const backgroundColor = state => state.setting && state.setting.backgroundColor || '#f2f2f2';
const showGraticule = state => state.setting && state.setting.showGraticule;
const setting = state => state.setting || {};
const printScale = state => {
    const scale = state.setting && state.setting.printScale
        ? parseFloat(state.setting.printScale)
        : undefined;
    return !isNaN(scale) ? scale : undefined;
};

const printZoom = state => {
    const zoom = state.setting && state.setting.printZoom
        ? Math.floor(parseFloat(state.setting.printZoom))
        : undefined;
    return !isNaN(zoom) ? zoom : undefined;
};

module.exports = {
    type,
    setting,
    backgroundColor,
    showGraticule,
    printScale,
    printZoom
};
