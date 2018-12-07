/* copyright 2018, stefano bovio @allyoucanmap. */

const xmlns = 'http://www.w3.org/2000/svg';

const updateElement = (el, attributes = {}, style = {}) => {
    Object.keys(attributes).forEach(key => {
        el.setAttribute(key, attributes[key]);
    });
    Object.keys(style).forEach(key => {
        el.style[key] = style[key];
    });
};

const createElement = (tag, attributes = {}, style = {}) => {
    const el = document.createElementNS(xmlns, tag);
    updateElement(el, attributes, style);
    return el;
};

export {
    updateElement,
    createElement
};
