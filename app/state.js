/* copyright 2018, stefano bovio @allyoucanmap. */

module.exports = (key, state) => {
    try {
        const initialState = JSON.parse(localStorage.getItem('state'));
        return initialState && initialState[key] || state || {};
    } catch(e) {
        return {};
    }
};
