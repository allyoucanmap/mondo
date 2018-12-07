/* copyright 2018, stefano bovio @allyoucanmap. */

const UPDATE_SETTINGS = 'SETTINGS:UPDATE_SETTINGS';

const updateSettings = (param, value) => ({type: UPDATE_SETTINGS, param, value});

module.exports = {
    UPDATE_SETTINGS,
    updateSettings
};
