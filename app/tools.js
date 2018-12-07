/* copyright 2018, stefano bovio @allyoucanmap. */

const requireTools = require.context('./tools/', true, /\.jsx$/);
module.exports = requireTools.keys().map(key => ({key: key.replace(/\.jsx|\.\//g, ''), ...requireTools(key)}));
