/* copyright 2018, stefano bovio @allyoucanmap. */

const SELECT_TOOL = 'TOOL:SELECT_TOOL';

module.exports = {
    SELECT_TOOL,
    selectTool: selected => ({type: SELECT_TOOL, selected})
};
