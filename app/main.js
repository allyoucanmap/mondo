/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const ReactDOM = require('react-dom');
const { connect } = require('react-redux');

const store = require('./store');
const tools = require('./tools');

const {Provider} = require('react-redux');
const Container = require('./containers/Container.jsx');

const { selectTool } = require('./tools/actions/tool');
const toolSelectors = require('./tools/selectors/tool');

require('../assets/style/index.less');

const Root = connect(
    state => ({
        selected: toolSelectors.selected(state)
    }),
    {
        onSelect: selectTool
    }
)(props => (
    <Container
        title={'モンド'}
        selected={props.selected}
        tools={props.tools}
        onSelect={props.onSelect}/>));

ReactDOM.render(
    <Provider store={store}>
        <Root tools={tools}/>
    </Provider>,
    document.getElementById('root'));
