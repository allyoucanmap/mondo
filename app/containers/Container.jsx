/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const Button = require('./Button.jsx');

module.exports = ({
    title,
    children,
    tools = [],
    selected,
    onSelect = () => {}
}) => (
        <div className="container">
            <div className="bg">
                {children}
                {tools
                    .filter(({position}) => position === 'body')
                    .map(({key, Tool}) => <Tool key={key}/>)}
            </div>

            {tools.length > 0 &&
                <div className="panel">
                    {selected ? tools
                        .filter(({key, position}) => key === selected && position === 'panel')
                        .map(({Tool, key}) => (
                            <div key={key} className="panel-container" >
                                {Tool && <Tool />}
                            </div>)
                        ) :
                        <div className="logo-container">
                            <div className="logo icon">
                                Z
                            </div>
                            <div className="logo-text">
                                {title}
                            </div>
                        </div>}
                </div>}

            <div className="tools">
                <div className="button-group">
                {tools
                    .filter(({position}) => position === 'panel')
                    .map(({ key, icon, tooltip, onToggle = () => {} }) => (
                    <Button
                        key={key}
                        tooltip={tooltip}
                        active={key === selected}
                        onClick={() => {
                            onSelect(key === selected ? undefined : key);
                            onToggle();
                        }}>
                        {icon}
                    </Button>)
                )}
                </div>
            </div>
        </div>
    );
