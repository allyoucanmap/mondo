/* copyright 2018, stefano bovio @allyoucanmap. */

const ADD = 'DATABASE:ADD';
const REMOVE = 'DATABASE:REMOVE';
const LOADING = 'DATABASE:LOADING';
const LOADED = 'DATABASE:LOADED';
const ERROR = 'DATABASE:ERROR';
const CONNECTED = 'DATABASE:CONNECTED';
const UPDATE = 'DATABASE:UPDATE';
const UPDATE_TABLE = 'DATABASE:UPDATE_TABLE';
const DISCONNECTED = 'DATABASE:DISCONNECTED';

const add = (category) => ({ type: ADD, category });
const loading = id => ({ type: LOADING, id });
const loaded = id => ({ type: LOADED, id });
const error = (id, err) => ({ type: ERROR, id, err });
const connected = database => ({ type: CONNECTED, database });
const update = (id, key, value) => ({ type: UPDATE, id, key, value });
const updateTable = (databaseId, tableId, key, value) => ({ type: UPDATE_TABLE, databaseId, tableId, key, value });
const disconnected = database => ({ type: DISCONNECTED, database });
const remove = database => ({ type: REMOVE, database });

const connect = (poolData) => {
    const services = {
        database: window.pg,
        folder: window.geofiles
    };

    const service = poolData && poolData.category && services[poolData.category];

    return (dispatch) => {
        dispatch(loading(poolData.id));

        if (service && service.addStore) {
            service.addStore(poolData)
                .then(tables => {
                    dispatch(connected({...poolData, tables: tables.map(table => ({...table, category: poolData.category})), connected: true}));
                    dispatch(loaded(poolData.id));
                })
                .catch(err => {
                    dispatch(error(poolData.id, err));
                });
        } else {
            dispatch(error(poolData.id, 'No connection'));
        }
    };
};

const disconnect = (database, rmv) => {
    const services = {
        database: window.pg,
        folder: window.geofiles
    };

    const service = database && database.category && services[database.category];

    return (dispatch) => {
        if (database && database.connected && service && service.removeStore) {
            service.removeStore(database);
        }
        if (rmv) {
            dispatch(remove(database));
        } else {
            dispatch(disconnected(database));
        }
    };
};

module.exports = {
    ADD,
    add,
    UPDATE,
    update,
    UPDATE_TABLE,
    updateTable,
    LOADING,
    loading,
    LOADED,
    loaded,
    ERROR,
    error,
    CONNECTED,
    connected,
    connect,
    REMOVE,
    remove,
    DISCONNECTED,
    disconnected,
    disconnect
};
