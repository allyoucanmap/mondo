/* copyright 2018, stefano bovio @allyoucanmap. */

const { SELECT_TOOL } = require('../actions/tool');

const getState = require('../../state');
const initialState = getState('tool');

module.exports = (state = initialState, action) => {
    switch (action.type) {
        case SELECT_TOOL: {
            return {...state, selected: action.selected};
        }
        default:
            return state;
    }
};
