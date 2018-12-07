/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const PropTypes = require('prop-types');

class Button extends React.Component {

    static propTypes = {
        tooltip: PropTypes.string,
        position: PropTypes.string,
        active: PropTypes.bool,
        onClick: PropTypes.func,
        disabled: PropTypes.bool,
        className: PropTypes.string
    };

    static defaultProps = {
        position: 'left',
        onClick: () => {},
        className: ''
    };

    state = {};

    render() {

        const {
            tooltip,
            position,
            active,
            onClick,
            children,
            disabled,
            className
        } = this.props;

        return (
            <div
                className={`button${className && ` ${className}` || ''}`}>
                {this.state.hover && tooltip && <div
                    className={`tooltip${position && ` ${position}` || ''}`}>
                    {tooltip}
                </div>}
                <button
                    disabled={disabled}
                    className={`icon ${active ? 'active' : ''}`}
                    onMouseEnter={() => this.setState({ hover: true })}
                    onMouseLeave={() => this.setState({ hover: false })}
                    onClick={() => onClick()}>
                    {children}
                </button>
            </div>
        );
    }

}

module.exports = Button;
