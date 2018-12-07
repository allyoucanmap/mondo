/* copyright 2018, stefano bovio @allyoucanmap. */

const layers = state => {
    const databases = state && state.database && state.database.databases || [];
    return databases.reduce((newLayers, database) => {
        return [
            ...newLayers,
            ...(database && database.connected && database.tables && database.tables.filter(table => table.enabled) || [])
        ];
    }, []);
};

const databases = state => state.database && state.database.databases || [];
const formKeys = state => state.database && state.database.formKeys || [];
const loading = state => state.database && state.database.loading || {};
const errors = state => state.database && state.database.errors || {};

module.exports = {
    layers,
    databases,
    formKeys,
    loading,
    errors
};
