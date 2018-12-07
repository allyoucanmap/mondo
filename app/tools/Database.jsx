/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const { connect } = require('react-redux');
const Button = require('../containers/Button.jsx');
const databaseActions = require('./actions/database');
const databaseSelectors = require('./selectors/database');

const Component = ({
    errors = {},
    loading = {},
    databases = [],
    formKeys = [],
    tableKeys = [
        { label: 'Max Zoom', key: 'maxZomm' },
        { label: 'Min Zoom', key: 'minZomm' }
    ],
    addDatabase = () => { },
    connectDatabase = () => { },
    updateTable = () => { },
    updateDatabase = () => { },
    disconnectDatabase = () => { }
}) => (
    <div className="tool-container">
        <div className="head">
            <div>Databases</div>
            <div className="button-group">
                <Button
                    tooltip="Directory"
                    position="bottom"
                    onClick={() => addDatabase('folder')}>
                    L
                </Button>
                <Button
                    tooltip="Database"
                    position="bottom"
                    onClick={() => addDatabase('database')}>
                    I
                </Button>
            </div>
        </div>
        <div className="body">
            {databases.map(database => (
                <div key={database.id} className="tool-container">
                    <div className="head">
                        <strong className={`${errors[database.id] ? 'text-error' : ''}`}>{database.database || database.path}</strong>
                        <div className="button-group">
                            <Button
                                disabled={loading[database.id]}
                                tooltip="Remove"
                                onClick={() => disconnectDatabase(database, true)}>
                                X
                            </Button>
                            <Button
                                active={database.connected}
                                disabled={loading[database.id]}
                                tooltip={database.connected ? 'Disconnect' : 'Connect'}
                                onClick={database.connected ? () => disconnectDatabase(database) : () => connectDatabase(database)}>
                                {database.connected ? 'Q' : '0'}
                            </Button>
                            <Button
                                disabled={loading[database.id]}
                                tooltip={database.collapsed ? 'Expand' : 'Collapse'}
                                position="left"
                                onClick={() => updateDatabase(database.id, 'collapsed', !database.collapsed)}>
                                {database.collapsed ? 'P' : 'M'}
                            </Button>
                        </div>
                    </div>

                    {loading[database.id] && <div className="body">
                        <div className="loader">9</div>
                    </div>}

                    {!loading[database.id] && !database.collapsed && <div className="body">
                        {errors[database.id] && <div className="error">{errors[database.id]}</div>}
                        {!database.connected && <div className="form">
                            {formKeys[database.category] && formKeys[database.category].map(({ key, label, type = 'text' }) => (
                                <div key={key}>
                                    <small>{label}</small>
                                    <input
                                        key={key}
                                        type={type}
                                        value={database[key]}
                                        onChange={event => updateDatabase(database.id, key, event.target.value)} />
                                </div>
                            ))}
                        </div>}

                        {database.connected && database.tables && database.tables.map((tableObj) => (
                            <span key={tableObj.id}>
                                <div className="row-input">
                                    <Button
                                        active={tableObj.enabled}
                                        position="right"
                                        tooltip={tableObj.enabled ? 'Disable' : 'Enable'}
                                        onClick={() => updateTable(database.id, tableObj.id, 'enabled', !tableObj.enabled)}>
                                        {tableObj.enabled ? 'Q' : '0'}
                                    </Button>
                                    <small>{tableObj.table}</small>
                                    {/*database.category === 'database' && <Button
                                        disabled={tableObj.enabled}
                                        tooltip={tableObj.expanded ? 'Collapse' : 'Expand'}
                                        onClick={() => updateTable(database.id, tableObj.id, 'expanded', !tableObj.expanded)}>
                                        {tableObj.expanded ? 'M' : 'P'}
                                    </Button>*/}
                                </div>
                                {database.category === 'database' && tableObj.expanded && !tableObj.enabled && <div className="form">
                                    {tableKeys.map(({ key: tableKey, label: tableLabel }) => (
                                        <div key={tableKey}>
                                            <small>{tableLabel}</small>
                                            <input
                                                key={tableKey}
                                                value={tableObj[tableKey]}
                                                onChange={event => updateTable(database.id, tableObj.id, tableKey, event.target.value)} />
                                        </div>
                                    ))}
                                </div>}
                            </span>
                        ))}
                    </div>}
                </div>
            ))}
        </div>
    </div>
);

module.exports = {
    icon: '9',
    Tool: connect(state => ({
        errors: databaseSelectors.errors(state),
        loading: databaseSelectors.loading(state),
        databases: databaseSelectors.databases(state),
        formKeys: databaseSelectors.formKeys(state)
    }), {
        addDatabase: databaseActions.add,
        connectDatabase: databaseActions.connect,
        updateDatabase: databaseActions.update,
        updateTable: databaseActions.updateTable,
        disconnectDatabase: databaseActions.disconnect
    })(Component),
    position: 'panel',
    tooltip: 'Data'
};
