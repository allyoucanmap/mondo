/* copyright 2018, stefano bovio @allyoucanmap. */

const React = require('react');
const PropTypes = require('prop-types');
const { connect } = require('react-redux');
const { isEqual, delay } = require('lodash');

const canvasActions = require('./actions/canvas');

const styleSelectors = require('./selectors/style');
const databaseSelectors = require('./selectors/database');
const settingSelectors = require('./selectors/setting');

const { start, stop } = require('../../gl/index');

const Shape = require('../../utils/shape/index');
const { EARTH_RADIUS } = require('../../utils/shape/common');

const { resolutions } = require('../../utils/PrjUtils');

const { plotTiles, loadTiles, getCoordinates, getAngles, getCameraPosition } = require('../../utils/RenderUtils');

class Component extends React.Component {

    static propTypes = {
        id: PropTypes.string,
        layers: PropTypes.array,
        center: PropTypes.array,
        backgroundColor: PropTypes.string,
        styles: PropTypes.array,
        update: PropTypes.func,
        type: PropTypes.string,
        showGraticule: PropTypes.bool,
        maxZoom: PropTypes.number
    };

    static defaultProps = {
        id: 'gl-canvas',
        layers: [],
        center: [0, 0],
        backgroundColor: '#f2f2f2',
        styles: [],
        update: () => {},
        type: 'icosahedron',
        showGraticule: true,
        maxZoom: 4
    };

    state = {
        camera: null,
        layers: [],
        cameraAngles: [0, 0],
        tmpCameraAngles: [0, 0],
        angles: [0, 0],
        distanceFromCenter: EARTH_RADIUS * 3,
        zoom: 0
    };

    componentDidMount() {

        let current = {};
        let previous = {};

        Shape[this.props.type].setup();

        const angles = getAngles(this.props.center);
        const position = getCameraPosition(angles, this.state.distanceFromCenter);

        start('#' + this.props.id, {
            view: {
                before: ({ backgroundColor, camera, width, height }) => {

                    backgroundColor(this.props.backgroundColor);

                    camera.type = 'ortho';
                    camera.near = 1;
                    camera.far = this.state.distanceFromCenter * 3;

                    this.setState({ camera, width, height });
                },
                loop: ({ gl, backgroundColor, drawEntity, entity, camera, destroyEntity }) => {

                    current.layers = [...this.state.layers];
                    current.styles = [...this.props.styles];
                    current.zoom = this.state.zoom;
                    current.lastZoom = this.state.lastZoom;
                    current.angles = [...this.state.angles];
                    current.type = this.props.type;
                    current.loadingTile = this.state.loadingTile;
                    if (this.state.center) {
                        current.center = [...this.state.center];
                    }

                    camera.zoom = 1 / resolutions[current.zoom + 3];

                    if (this.state.tilesArray) {
                        current.tiles = [...this.state.tilesArray];
                    }

                    if (this.state.camera) {
                        camera.position = [...this.state.camera.position];
                    }

                    backgroundColor(this.props.backgroundColor);

                    if (this.props.showGraticule && !isEqual(current.tiles, previous.tiles)) {

                        if (current.tilesEntity) destroyEntity(current.tilesEntity);
                        if (current.grid) destroyEntity(current.grid);

                        const { planes } = Shape[current.type].getData();

                        current.grid = entity({
                            color: '#333333',
                            feature: {
                                type: 'MultiLineString',
                                scale: resolutions[current.zoom + 3] / 2 * 6,
                                coordinates: planes.map(coords => [...coords, coords[0]])
                            }
                        });

                        current.tilesEntity = entity({
                            color: '#333333',
                            feature: {
                                type: 'MultiLineString',
                                scale: resolutions[current.zoom + 3],
                                coordinates: current.tiles.map(tile => [...tile.surface, tile.surface[0]])
                            }
                        });
                    }

                    if (current.tiles && current.tiles.length > 0 && (
                        previous.loadingTile && !current.loadingTile
                        || current.layers && (!isEqual(current.layers, previous.layers))
                        || current.lastZoom !== previous.lastZoom
                        || !isEqual(current.tiles, previous.tiles)
                        || !isEqual(current.center, previous.center)
                        || !isEqual(current.styles, previous.styles))) {

                        if (current.tilesTexture) {
                            current.tilesTexture.forEach((ent) => {
                                gl.deleteTexture(ent.texture);
                                if (ent.canvas && ent.canvas.wind) {
                                    ent.canvas.wind.destroy();
                                }
                                destroyEntity(ent);
                            });

                            current.tilesTexture = null;
                        }

                        const { textures } = plotTiles({
                            layers: current.layers,
                            zoom: current.zoom,
                            angles: current.angles,
                            camera,
                            tiles: current.tiles,
                            styles: current.styles,
                            type: current.type
                        });

                        current.textures = textures;

                        current.tilesTexture = current.tiles && current.tiles.map(tile => {
                            return entity({
                                color: '#333333',
                                type: 'polygon',
                                ...(current.textures[tile.name] ? {
                                    textureData: {
                                        ...current.textures[tile.name],
                                        img: current.textures[tile.name].texture
                                    },
                                    canvas: current.textures[tile.name].canvas
                                } : {}),
                                model: tile.model || {
                                    index: [0, 1, 2],
                                    coordinates: tile.up ?
                                        tile.surface.reduce((res, vertex) => [...res, ...vertex], [])
                                        : [tile.surface[2], tile.surface[1], tile.surface[0]].reduce((res, vertex) => [...res, ...vertex], []),
                                    textureCoordinates: tile.up ?
                                        [0.5, 0.0, 0.0, 1.0, 1.0, 1.0]
                                        : [1.0, 0.0, 0.0, 0.0, 0.5, 1.0],
                                    vcolor: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
                                }
                            });
                        });
                    }

                    if (current.tilesTexture) {
                        current.tilesTexture.forEach(ent => {
                            drawEntity(ent);
                        });
                    }

                    if (this.props.showGraticule && current.tilesEntity) drawEntity(current.tilesEntity);
                    if (this.props.showGraticule && current.grid) drawEntity(current.grid);

                    previous = { ...current };
                }
            }
        });

        this.onUpdate(getCoordinates(angles), this.props.layers, this.state.zoom);
        this.setState({
            angles,
            camera: {
                ...this.state.camera,
                position
            }
        });

    }

    componentWillUpdate(newProps, newState) {
        if (this.props.layers && newProps.layers && !isEqual(this.props.layers, newProps.layers)) {
            this.onUpdate(getCoordinates(newState.angles), newProps.layers, newState.zoom);
        } else if (this.props.type !== newProps.type) {
            Shape[newProps.type].setup();
            this.setState({
                zoom: 0,
                lastZoom: 0
            });
            delay(() => {
                this.onUpdate(getCoordinates(newState.angles), newProps.layers, 0);
            }, 100);
        }
    }

    componentWillUnmount() {
        stop();
    }

    onWheel = event => {
        const maxZoom = Shape[this.props.type] && Shape[this.props.type].maxZoom
            ? Shape[this.props.type].maxZoom
            : this.props.maxZoom;

        const delta = event.deltaY < 0 ? this.state.zoom + 1 : this.state.zoom - 1;
        const zoom = delta < 0 ? 0 : delta > maxZoom && maxZoom || delta;
        this.setState({ zoom });
        if (this.zoomEvent) clearTimeout(this.zoomEvent);
        this.zoomEvent = setTimeout(() => {
            this.setState({ lastZoom: zoom });
            this.onUpdate(getCoordinates(this.state.angles), this.state.layers, zoom);
        }, 100);

    };

    onMouseUp = () => {
        if (this.state.dragging) {
            this.onUpdate(getCoordinates(this.state.angles), this.state.layers, this.state.zoom);
            this.setState({
                dragging: false,
                startPoint: null
            });
        }
    }

    onMouseMove = (event) => {
        if (event.buttons === 1) {
            if (!this.state.dragging) {
                this.setState({
                    dragging: true,
                    cameraAngles: this.state.tmpCameraAngles,
                    startPoint: [
                        event.clientX,
                        event.clientY
                    ]
                });
            } else {

                const delta = [
                    this.state.angles[0] - (event.clientX - this.state.startPoint[0]) * 0.02 / Math.pow(2, this.state.zoom),
                    this.state.angles[1] - (event.clientY - this.state.startPoint[1]) * 0.02 / Math.pow(2, this.state.zoom)
                ];

                const deltaY = 80;
                const angles = [
                    delta[0] >= -180 && delta[0] <= 180 ? delta[0] :
                        delta[0] < -180 && 180 || delta[0] > 180 && -180,
                    delta[1] >= -deltaY && delta[1] <= deltaY ? delta[1] :
                        delta[1] < -deltaY && -deltaY || delta[1] > deltaY && deltaY
                ];

                const position = getCameraPosition(angles, this.state.distanceFromCenter);

                this.setState({
                    angles,
                    camera: {
                        ...this.state.camera,
                        position
                    }
                });
            }
        } else {

            this.setState({
                dragging: false,
                startPoint: null
            });
        }
    };

    onUpdate = (coordinates, newLayers, zoom) => {

        if (this.state.loadingTile) {
            this.setState({ tail: { coordinates, newLayers, zoom } });
            return;
        }

        this.setState({ loadingTile: true });

        const tilesArray = loadTiles(
            {
                coordinates,
                newLayers,
                zoom,
                type: this.props.type,
                camera: this.state.camera
            },
            tArray => {
                this.setState({ loadingTile: false, tail: null, center: coordinates, tilesArray: tArray, layers: [] });
                if (this.state.tail) this.onUpdate(this.state.tail.coordinates, this.state.tail.newLayers, this.state.tail.zoom);
            },
            () => {
                this.setState({ loadingTile: false, tail: null });
                if (this.state.tail) this.onUpdate(this.state.tail.coordinates, this.state.tail.newLayers, this.state.tail.zoom);
            },
            layers => {
                this.setState({ layers });
            }
        );

        this.setState({ center: coordinates, tilesArray });
        this.props.update({center: coordinates, zoom});
    };

    render() {
        return (
            <div
                id={this.props.id}
                className="gl-canvas"
                onWheel={this.onWheel}
                onMouseUp={this.onMouseUp}
                onMouseMove={this.onMouseMove} />
        );
    }
}

module.exports = {
    position: 'body',
    Tool: connect(state => ({
        layers: databaseSelectors.layers(state),
        styles: styleSelectors.styles(state),
        type: settingSelectors.type(state),
        backgroundColor: settingSelectors.backgroundColor(state),
        showGraticule: settingSelectors.showGraticule(state)
    }), {
        update: canvasActions.update
    })(Component)
};
