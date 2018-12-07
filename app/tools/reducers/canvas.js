/* copyright 2018, stefano bovio @allyoucanmap. */

const canvasActions = require('../actions/canvas');

module.exports = (state = {}, action) => {
    switch (action.type) {
    case canvasActions.UPDATE: {
        return {
            ...state,
            zoom: action.zoom,
            center: action.center
        };
    }
    default:
        return state;
    }
};
