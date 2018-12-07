/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const PropTypes = require('prop-types');
const { connect } = require('react-redux');
const { trim, startsWith } = require('lodash');
const { Controlled: CodeMirror } = require('react-codemirror2');
const styleActions = require('./actions/style');
const styleSelectors = require('./selectors/style');
const { createElement } = require('../../utils/DOMUtils');
const tinycolor = require('tinycolor2');
const { ChromePicker } = require('react-color');

require('codemirror/lib/codemirror.css');
require('codemirror/mode/javascript/javascript');

class Component extends React.Component {

    static propTypes = {
        code: PropTypes.string,
        update: PropTypes.func
    };

    state = {};

    onRenderToken = (editor) => {

        if (this.markers) {
            this.markers.forEach(marker => {
                marker.clear();
            });
        }
        this.markers = [];

        const lineCount = editor.lineCount();
        editor.doc.iter(0, lineCount, line => {

            const lineNo = line.lineNo();
            const lineTokens = editor.getLineTokens(lineNo);
            lineTokens.forEach(token => {
                const string = token && token.string && trim(token.string, '"') || '';
                if (string && startsWith(string, '#') && tinycolor(string).isValid()) {
                    const replacedWith = createElement('div', {}, {
                        display: 'inline-block',
                        color: tinycolor.mostReadable(string, '#000000', {includeFallbackColors: true}).toHexString(),
                        backgroundColor: string
                    });
                    replacedWith.innerHTML = `"${string}"`;
                    replacedWith.onclick = () => this.setState({ token, lineNo });
                    this.markers.push(editor.doc.markText({ line: lineNo, ch: token.start }, { line: lineNo, ch: token.end }, {
                        replacedWith
                    }));
                }
            });
        });
    };

    render() {
        const {
            code = '',
            update = () => { }
        } = this.props;
        return (
            <div className="tool-container">
                <div className="head">
                    <div>Style</div>
                </div>
                <div className="body">
                    <CodeMirror
                        value={code}
                        editorDidMount={editor => {
                            this.onRenderToken(editor);
                            this.editor = editor;
                        }}
                        onBeforeChange={(editor, diff, value) => update(value)}
                        onChange={editor => {
                            this.onRenderToken(editor);
                        }}
                        options={{
                            mode: 'javascript',
                            lineNumbers: false,
                            theme: 'mondo',
                            indentUnit: 4,
                            tabSize: 4
                        }} />
                    {this.state.token && <div
                        className="overlay"
                        onClick={event => {
                            if (event.target.getAttribute('class') === 'overlay') {
                                if (this.state.value) {
                                    this.editor.replaceRange(
                                        `"${this.state.value}"`,
                                        {
                                            line: this.state.lineNo,
                                            ch: this.state.token.start
                                        },
                                        {
                                            line: this.state.lineNo,
                                            ch: this.state.token.end
                                        }
                                    );
                                }
                                this.setState({ lineNo: null, token: null, value: null });
                            }
                        }}>
                        <ChromePicker
                            color={{hex: this.state.value || tinycolor(trim(this.state.token.string, '"')).toHexString()}}
                            onChange={({hex}) => this.setState({ value: hex })}/>
                    </div>}
                </div>
            </div>
        );
    }
}

module.exports = {
    icon: 'D',
    position: 'panel',
    Tool: connect(state => ({
        code: styleSelectors.code(state)
    }), {
            update: styleActions.updateStyle
        })(Component),
    tooltip: 'Style'
};
