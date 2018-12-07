/* copyright 2018, stefano bovio @allyoucanmap. */

const settingActions = require('../actions/setting');
const getState = require('../../state');

const initialState = getState('setting', {
    showGraticule: true,
    backgroundColor: '#f2f2f2',
    type: 'icosahedron',
    printScale: 1,
    printZoom: 0
});

module.exports = (state = initialState, action) => {
    switch (action.type) {
        case settingActions.UPDATE_SETTINGS: {
            return {...state, [action.param]: action.value};
        }
        default:
            return state;
    }
};
