/* copyright 2018, stefano bovio @allyoucanmap. */

const databaseActions = require('../actions/database');
const uuidv1 = require('uuid/v1');

module.exports = (state = {
    databases: [],
    formKeys: {
        database: [
            { key: 'user', label: 'User' },
            { key: 'password', label: 'Password', type: 'password' },
            { key: 'database', label: 'Database' },
            { key: 'port', label: 'Port' },
            { key: 'host', label: 'Host' },
            { key: 'max', label: 'Max Connections' },
            { key: 'min', label: 'Min Connections' }
        ],
        folder: [
            { key: 'path', label: 'Path' }
        ]
    },
    errors: {},
    loading: {}
}, action) => {
    switch (action.type) {
        case databaseActions.ADD: {
            const { category } = action;
            return {
                ...state, databases:
                    [
                        ...state.databases,
                        category === 'database'
                        ? {
                            id: uuidv1(),
                            user: '',
                            password: '',
                            database: '',
                            port: 5432,
                            host: 'localhost',
                            max: 30,
                            min: 10,
                            category
                        }
                        : {
                            id: uuidv1(),
                            category,
                            path: ''
                        }
                    ]
            };
        }
        case databaseActions.UPDATE: {
            const { id, key, value } = action;
            return {
                ...state,
                databases: state.databases.map(database => database.id === id ? { ...database, [key]: value } : { ...database }),
                errors: { ...state.errors, [id]: key !== 'collapsed' ? null : state.errors[id] }
            };
        }
        case databaseActions.CONNECTED: {
            const { database: connectedDatabase } = action;
            return { ...state, databases: state.databases.map(database => database.id === connectedDatabase.id ? { ...connectedDatabase } : { ...database }) };
        }
        case databaseActions.LOADING: {
            const { id } = action;
            return {
                ...state,
                loading: { ...state.loading, [id]: true },
                errors: { ...state.errors, [id]: null }
            };
        }
        case databaseActions.LOADED: {
            const { id } = action;
            return {
                ...state,
                loading: { ...state.loading, [id]: false },
                errors: { ...state.errors, [id]: null }
            };
        }
        case databaseActions.ERROR: {
            const { id, err } = action;
            return {
                ...state,
                loading: { ...state.loading, [id]: false },
                errors: { ...state.errors, [id]: err }
            };
        }
        case databaseActions.UPDATE_TABLE: {
            const { databaseId, tableId, key, value } = action;
            return {
                ...state, databases: state
                    .databases.map(database => database.id === databaseId ?
                        { ...database, tables: database.tables.map(table => table.id === tableId ? { ...table, [key]: value } : { ...table }) }
                        : { ...database })
            };
        }
        case databaseActions.REMOVE: {
            const { database: connectedDatabase } = action;
            return {
                ...state,
                databases: state.databases.filter(database => database.id !== connectedDatabase.id)
            };
        }
        case databaseActions.DISCONNECTED: {
            const { database: connectedDatabase } = action;
            return {
                ...state,
                databases: state.databases
                    .map(database => database.id === connectedDatabase.id ? {
                        ...database,
                        connected: false,
                        tables: []
                    } : { ...database })
            };
        }
        default:
            return state;
    }
};
