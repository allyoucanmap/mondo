/* copyright 2018, stefano bovio @allyoucanmap. */

const { isArray, isObject } = require('lodash');

const code = state => state.style && state.style.code || '';
const validCode = state => state.style && state.style.lastValidCode;

const styles = state => {
    let res;
    try {
        res = JSON.parse(code(state));
    } catch (e) {
        res = validCode(state);
    }
    return isArray(res) && res.filter(el => isObject(el)) || [];
};

module.exports = {
    styles,
    code
};
