/* copyright 2018, stefano bovio @allyoucanmap. */

const { combineReducers, createStore, applyMiddleware } = require('redux');
const logger = require('redux-logger').default;

const requireReducers = require.context('./tools/reducers', true, /\.js$/);
const reducers = requireReducers.keys().reduce((reducer, key) => ({ ...reducer, [key.replace(/\.js|\.\//g, '')]: requireReducers(key) }), {});
const thunk = require('redux-thunk').default;

const save = store => next => action => {
    next(action);
    const state = store.getState();
    localStorage.setItem('state', JSON.stringify(state));
};

module.exports = createStore(
    combineReducers(reducers),
    applyMiddleware(...(process.env.NODE_ENV === 'development' ? [thunk, save, logger] : [thunk, save]))
);
