/* copyright 2018, stefano bovio @allyoucanmap. */

const UPDATE = 'CANVAS:UPDATE';

const update = ({center, zoom}) => ({type: UPDATE, center, zoom});

module.exports = {
    UPDATE,
    update
};
