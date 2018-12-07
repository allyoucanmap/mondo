/* copyright 2018, stefano bovio @allyoucanmap. */

const printActions = require('../actions/print');

module.exports = (state = {}, action) => {
    switch (action.type) {
        case printActions.PRINT_LOADING: {
            return {...state, loading: true, pages: [], error: null};
        }
        case printActions.PRINT_LOADED: {
            return {...state, loading: false, pages: action.pages, error: null};
        }
        case printActions.PRINT_ERROR: {
            return {...state, loading: false, error: action.error};
        }
        default:
            return state;
    }
};
