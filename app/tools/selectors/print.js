/* copyright 2018, stefano bovio @allyoucanmap. */

const pages = state => state.print && state.print.pages;
const loading = state => state.print && state.print.loading;
const error = state => state.print && state.print.error;

module.exports = {
    pages,
    loading,
    error
};
