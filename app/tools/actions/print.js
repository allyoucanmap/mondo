/* copyright 2018, stefano bovio @allyoucanmap. */

const {plotTiles, loadTiles, getAngles} = require('../../../utils/RenderUtils');
const {getCurrentCamera} = require('../../../gl/index');
const { getPages } = require('../../../utils/PageUtils');
const Shape = require('../../../utils/shape/index');

const PRINT_LOADING = 'PRINT:PRINT_LOADING';
const PRINT_LOADED = 'PRINT:PRINT_LOADED';
const PRINT_ERROR = 'PRINT:PRINT_ERROR';

const printLoading = () => ({type: PRINT_LOADING});
const printLoaded = pages => ({type: PRINT_LOADED, pages});
const printError = error => ({type: PRINT_ERROR, error});

const print = (newLayers = [], styles = [], zoom = 0, type, printScale = 1, printZoom) => {
    return (dispatch) => {
        dispatch(printLoading());
        let layers = [];
        const tiles = loadTiles(
            {
                coordinates: [0, 0],
                newLayers,
                zoom: 0,
                fullRes: true,
                type,
                printZoom
            },
            () => dispatch(printError('No layers')),
            () => {
                const data = plotTiles({
                    layers,
                    zoom: 0,
                    angles: getAngles([0, 0]),
                    camera: getCurrentCamera(),
                    tiles,
                    styles,
                    scale: printScale,
                    type
                });
                const {textures = {}} = data;
                const keys = Object.keys(textures);
                const maxTime = keys && keys[0] && textures[keys[0]] && textures[keys[0]].maxTime || 0;

                setTimeout(() => {
                    keys.forEach((key) => {
                        if (textures[key] && textures[key].canvas && textures[key].canvas.wind) {
                            textures[key].canvas.wind.destroy();
                        }
                    });
                    const pages = Shape[type] && Shape[type].getPages && Shape[type].getPages(data) || getPages(data);
                    if (pages) {
                        dispatch(printLoaded(pages));
                    } else {
                        dispatch(printError('No pages'));
                    }
                }, maxTime);

            },
            lyrs => { layers = [...lyrs]; }
        );
    };
};

module.exports = {
    PRINT_LOADING,
    printLoading,
    PRINT_LOADED,
    printLoaded,
    PRINT_ERROR,
    printError,
    print
};
