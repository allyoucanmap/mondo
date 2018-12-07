/* copyright 2018, stefano bovio @allyoucanmap. */

const UPDATE_STYLE = 'STYLE:UPDATE_STYLE';

const updateStyle = code => ({type: UPDATE_STYLE, code});

module.exports = {
    UPDATE_STYLE,
    updateStyle
};
