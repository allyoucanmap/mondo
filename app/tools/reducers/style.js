/* copyright 2018, stefano bovio @allyoucanmap. */

const styleActions = require('../actions/style');
const getState = require('../../state');

const initialState = getState('style', {
    code: '[\n\t{\n\t\t"source": "bg",\n\t\t"fill": "#ffffff"\n\t}\n]',
    lastValidCode: [{source: 'bg', fill: '#ffffff'}]
});

module.exports = (state = initialState, action) => {
    switch (action.type) {
        case styleActions.UPDATE_STYLE: {
            try {
                const lastValidCode = JSON.parse(action.code);
                return {...state, code: action.code, lastValidCode};
            } catch(e) {
                return {...state, code: action.code};
            }
        }
        default:
            return state;
    }
};
