/* copyright 2018, stefano bovio @allyoucanmap. */

const updateElement = (el, attributes = {}, style = {}) => {
    Object.keys(attributes).forEach(key => {
        el.setAttribute(key, attributes[key]);
    });
    Object.keys(style).forEach(key => {
        el.style[key] = style[key];
    });
};

const createElement = (tag, attributes = {}, style = {}) => {
    const el = document.createElement(tag);
    updateElement(el, attributes, style);
    return el;
};

module.exports = {
    updateElement,
    createElement
};
