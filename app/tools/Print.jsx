/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const { connect } = require('react-redux');
const Button = require('../containers/Button.jsx');
const printActions = require('./actions/print');
const styleSelectors = require('./selectors/style');
const databaseSelectors = require('./selectors/database');
const printSelectors = require('./selectors/print');
const canvasSelectors = require('./selectors/canvas');
const settingSelectors = require('./selectors/setting');
const saveAs = require('file-saver').default;

const Component = ({
    print = () => {},
    layers = [],
    pages = [],
    styles = [],
    loading,
    error,
    zoom = 0,
    type,
    printScale,
    printZoom
}) => (
    <div className="tool-container">
        <div className="head">
            <div>Print</div>
            {pages.length > 0 && <Button
                tooltip="Save"
                position="bottom"
                disabled={loading}
                onClick={() => {
                    pages.forEach((page, idx) => {
                        page.toBlob((blob) => {
                            saveAs(blob, `${type}_page_${idx}.png`);
                        });
                    });
                }}>
                3
            </Button>}
            <Button
                tooltip="Print"
                disabled={loading}
                position="bottom"
                onClick={() => print(layers, styles, zoom, type, printScale, printZoom)}>
                V
            </Button>
        </div>
        <div className="body">
            {error && <div className="error">{error}</div>}
            {loading ? <div className="loader">5</div> :
                pages.map((page, idx) => (
                    <div key={idx} className="img-container">
                        <img src={page.toDataURL()}/>
                    </div>
                ))}
        </div>
    </div>
);

module.exports = {
    icon: 5,
    Tool: connect(state => ({
        error: printSelectors.error(state),
        loading: printSelectors.loading(state),
        pages: printSelectors.pages(state),
        layers: databaseSelectors.layers(state),
        styles: styleSelectors.styles(state),
        zoom: canvasSelectors.zoom(state),
        type: settingSelectors.type(state),
        printScale: settingSelectors.printScale(state),
        printZoom: settingSelectors.printZoom(state)
    }), {
        print: printActions.print
    })(Component),
    position: 'panel',
    tooltip: 'Print'
};
