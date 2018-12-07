/* copyright 2018, stefano bovio @allyoucanmap. */

const { createElement } = require('./DOMUtils');
const { transform } = require('./VectorUtils');
const { rotationMatrix, modelMatrix, modelViewProjectionMatrix } = require('./MatrixUtils');
const Shape = require('./shape/index');
const { getLatLon, project } = require('./shape/common');

const { deg, rad } = require('./PrjUtils');
const { mapValue } = require('./Utils');
const { head, isEmpty, isNil, join } = require('lodash');
const { vec2 } = require('gl-matrix');
const { lineString, multiLineString, polygon, multiPolygon, point } = require('./DrawUtils');
const { cameraMatix } = require('../gl/index');
const Wind = require('./animation/wind');

const SIDE = 512;

const getCoordinates = angles => [angles[0] - 90, -angles[1]];
const getAngles = coords => [coords[0] + 90, -coords[1]];
const getCameraPosition = (angles, distanceFromCenter) => {
    return transform(
        transform(
            [0, 0, distanceFromCenter],
            rotationMatrix(angles[1], [1, 0, 0])
        ),
        rotationMatrix(angles[0], [0, 1, 0])
    );
};

const transformCoordinates = (coordinates, { mvp, width, height, delta = [0, 0], rotation = 0 }, vert) =>
    coordinates.map(coord => {
        const transformed = vert ? transform(coord, mvp) : transform(project(coord), mvp);
        const rotated = transform([
            width / 2 - mapValue(transformed[0], -1, 1, 0, width) + delta[0],
            height / 2 - mapValue(transformed[1], 1, -1, 0, height) + delta[1],
            transformed[2]
        ], rotationMatrix(deg(rotation), [0, 0, 1]));

        return [
            rotated[0] + width / 2,
            rotated[1] + height / 2,
            rotated[2]
        ];
    });

const adjustPosition = (coordinates, tileSurface, trnsfrm) => {
    const transformed = transformCoordinates(coordinates, trnsfrm);
    return transformed.map(coords => [
        coords[0],
        coords[1] - (tileSurface[0][1] < 0 ? tileSurface[0][1] : -(trnsfrm.height - tileSurface[0][1])),
        coords[2]
    ]);
};

const getCurrentCamera = ({camera, scale, center, distanceFromCenter}) => ({
    ...camera,
    zoom: camera.zoom * scale,
    position: getCameraPosition(getAngles(getLatLon(center)), distanceFromCenter)
});

const getSize = ({ tiles, camera, centers, distanceFromCenter, modelMat, scale = 1 }) => {
    return tiles.map(tile => {
        const currentCamera = getCurrentCamera({camera, scale, center: centers[tile.t], distanceFromCenter});
        const { viewMat, projectionMat } = cameraMatix(currentCamera, SIDE * scale, SIDE * scale);
        const mvp = modelViewProjectionMatrix(modelMat, viewMat, projectionMat);
        const tileSurface = transformCoordinates(tile.surface, { mvp, width: SIDE * scale, height: SIDE * scale}, true);
        const distance = vec2.dist(tileSurface[0], tileSurface[1]);
        return {
            width: Math.ceil(distance),
            height: Math.ceil(distance * Math.cos(rad(30)))
        };
    });
};

const getBoundsWKT = bounds => bounds.map(coordinates => `POLYGON((${join([...coordinates, coordinates[0]].map(coords => join(coords, ' ')), ', ')}))`);

const onUpdateLayer = (layer, layers, properties, update = () => {}, getLayer = () => {}) => {
    const currentId = layers
        .map(({id}, idx) => id === layer.id ? idx : null)
        .filter(val => val !== null);
    const topLayers = layers.filter((lyr, idx) => idx < currentId);
    const bottomLayers = layers.filter((lyr, idx) => idx > currentId);
    const lyrs = [
        ...topLayers,
        {
            ...layer,
            ...properties
        },
        ...bottomLayers
    ];
    update([...lyrs]);
    getLayer([...lyrs]);
};

const loadTiles = (
    {
        coordinates,
        newLayers,
        zoom,
        fullRes,
        type,
        camera,
        printZoom
    },
    onEmpty = () => {},
    onLoaded = () => {},
    getLayer = () => {}
) => {

    const services = {
        database: window.pg,
        folder: window.geofiles
    };

    const tilesArray = Shape[type].getTiles({coords: coordinates, zoom, camera}).map(tile => ({...tile, boundsWKT: getBoundsWKT(tile.bounds)}));

    if (newLayers && newLayers.length === 0 || !services.database || !services.folder) {
        onEmpty(tilesArray);
        return tilesArray;
    }

    const tiles = tilesArray.reduce((newTiles, tile) => {
        return {
            ...newTiles,
            [tile.name]: {...tile}
        };
    }, {});

    let layers = newLayers
        .map(layer => {
            return {
                ...layer,
                tiles: (isNil(layer.maxZoom) || zoom >= layer.maxZoom) && {
                    ...tiles,
                    ...(layer.tiles || {})
                } || {
                    ...(layer.tiles || {})
                }
            };
        });

    let cnt = tilesArray.length * layers.length;

    layers.forEach((layer) => {

        let layerTiles = {...layer.tiles};

        tilesArray.forEach(tile => {
            if (layerTiles[tile.name] && !layerTiles[tile.name].status) {

                layerTiles = {
                    ...layerTiles,
                    [tile.name]: {
                        ...layerTiles[tile.name],
                        status: 'loading'
                    }
                };

                onUpdateLayer(layer, layers, {tiles: {...layerTiles}}, lyrs => { layers = lyrs; }, getLayer);

                const service = layer && layer.category && services[layer.category];

                service.getFeatures({
                    wkt: tile.boundsWKT,
                    bbox: tile.bbox,
                    geometryName: layer.geometryName,
                    table: layer.table,
                    zoom,
                    type: layer.type,
                    database: layer.database,
                    propertyKeys: layer.propertyKeys,
                    fullRes,
                    file: layer.file,
                    path: layer.path,
                    tileName: tile.name,
                    shapeType: type,
                    printZoom
                })
                .then(({features}) => {

                    cnt--;

                    layerTiles = {
                        ...layerTiles,
                        [tile.name]: {
                            ...layerTiles[tile.name],
                            features: Shape[type] && Shape[type].updateFeatures && Shape[type].updateFeatures(features) || features,
                            status: 'loaded'
                        }
                    };

                    onUpdateLayer(layer, layers, {tiles: {...layerTiles}}, lyrs => { layers = lyrs; }, getLayer);

                    if (cnt === 0) { onLoaded(); }
                })
                .catch(() => {
                    cnt--;
                    if (cnt === 0) { onLoaded(); }
                });
            } else {
                cnt--;
                if (cnt === 0) { onLoaded(); }
            }
        });
    });

    return tilesArray;
};

const plotTiles = ({ zoom, tiles, camera, type, layers, styles = [], scale = 1 } = {}) => {

    const { centers, planes, EARTH_RADIUS } = Shape[type].getData();

    const distanceFromCenter = EARTH_RADIUS * 3;

    const modelMat = modelMatrix({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
    });

    const sizeData = {
        tiles,
        camera,
        centers,
        distanceFromCenter,
        modelMat,
        zoom,
        scale
    };
    const sizes = (Shape[type] && Shape[type].getSize && Shape[type].getSize(sizeData).map(({width, height}) => ({ width: width * scale, height: height * scale }))
    || getSize(sizeData));

    const tilesTransformations = Shape[type] && Shape[type].transformTiles ?
        Shape[type].transformTiles(tiles, { sizes })
        : tiles.map((tile, idx) => {
            const { width, height } = sizes[idx];
            const currentCamera = getCurrentCamera({camera, scale, center: centers[tile.t], distanceFromCenter});
            const { viewMat, projectionMat } = cameraMatix(currentCamera, width, height);
            const mvp = modelViewProjectionMatrix(modelMat, viewMat, projectionMat);

            const tCenter = transformCoordinates([centers[tile.t]], { mvp, width, height }, true);
            const tileCenter = transformCoordinates([tile.center], { mvp, width, height }, true);
            const plane = transformCoordinates(planes[tile.t], { mvp, width, height }, true);
            // const centerDist = vec2.dist(tCenter[0], plane[0]);
            const rotation = Math.atan2((tCenter[0][0] - plane[0][0]), (tCenter[0][1] - plane[0][1])) + (tile.surface.length === 4 ? rad(-45) : 0);

            const delta = [
                tCenter[0][0] - tileCenter[0][0],
                tCenter[0][1] - tileCenter[0][1]
            ];

            const tileSurface = transformCoordinates(tile.surface, { mvp, width, height, delta, rotation }, true);

            return {
                ...tile,
                transform: {
                    tileSurface,
                    mvp,
                    delta,
                    rotation
                }
            };
        });

    const filteredLayers = layers.filter(layer =>
        head(styles.filter(style => style.source === layer.table))
        && layer.tiles && !isEmpty(layer.tiles)
    );

    const transformedLayers = filteredLayers.map(layer => ({
        ...layer,
        transformedFeatures: tilesTransformations
            .filter(tile => layer.tiles && layer.tiles[tile.name] && layer.tiles[tile.name].features)
            .reduce((newTransformedFeatures, tile, idx) => {
                const { width, height } = sizes[idx];
                const { tileSurface, mvp, delta, rotation } = tile && tile.transform || {};

                const adjustFunc = Shape[type] && Shape[type].transform || adjustPosition;
                return {
                    ...newTransformedFeatures,
                    [tile.name]: layer.tiles[tile.name].features.map(feature => {
                        const geometryType = feature.geometry && feature.geometry.type;


                        if (geometryType === 'Point') {
                            return {
                                ...feature,
                                geometry: {
                                    ...feature.geometry,
                                    coordinates: adjustFunc([feature.geometry.coordinates], tileSurface, { tile, mvp, width, height, delta, rotation })
                                }
                            };
                        }

                        if (geometryType === 'LineString') {
                            return {
                                ...feature,
                                geometry: {
                                    ...feature.geometry,
                                    coordinates: adjustFunc(feature.geometry.coordinates, tileSurface, { tile, mvp, width, height, delta, rotation })
                                }
                            };
                        }

                        if (geometryType === 'MultiLineString') {
                            return {
                                ...feature,
                                geometry: {
                                    ...feature.geometry,
                                    coordinates: feature.geometry.coordinates.map(coords =>
                                        adjustFunc(coords, tileSurface, { tile, mvp, width, height, delta, rotation })
                                    )
                                }
                            };
                        }

                        if (geometryType === 'Polygon') {
                            return {
                                ...feature,
                                geometry: {
                                    ...feature.geometry,
                                    coordinates: feature.geometry.coordinates.map(coords =>
                                        adjustFunc(coords, tileSurface, { tile, mvp, width, height, delta, rotation })
                                    )
                                }
                            };
                        }

                        if (geometryType === 'MultiPolygon') {
                            return {
                                ...feature,
                                geometry: {
                                    ...feature.geometry,
                                    coordinates: feature.geometry.coordinates.map(coords =>
                                        coords.map(vertex =>
                                            adjustFunc(vertex, tileSurface, { tile, mvp, width, height, delta, rotation })
                                        )
                                    )
                                }
                            };
                        }
                        return { ...feature };
                    })
                };
            }, {})
    }));


    const backgroundTiles = tilesTransformations.map((tile, idx) => {

        const surface = tile.transform && tile.transform.tileSurface || tile.surface;
        const { width, height } = sizes[idx];

        return {
            name: tile.name,
            feature: {
                geometry: {
                    type: 'Polygon',
                    coordinates: Shape[type] && Shape[type].transform && Shape[type].transform(surface, surface, { tile, width, height }, 'bg')
                    || [surface.map(coords => [
                        coords[0],
                        coords[1] - (surface[0][1] < 0 ? surface[0][1] : -(height - surface[0][1])),
                        coords[2]
                    ])]
                }
            }
        };
    }) || [];

    const reversSizes = [...sizes].reverse();

    const textures = [...backgroundTiles].reverse().reduce((res, { feature, name }, idx) => {

        const { width, height } = reversSizes[idx];

        const texture = createElement('canvas', {
            width,
            height
        },
            {
                width: width + 'px',
                height: height + 'px'
            });
        const ctx = texture.getContext('2d');

        styles.forEach(style => {
            const currentLayer = head(transformedLayers.filter(layer => layer.table === style.source));
            if (style.source === 'bg') {
                const geometryType = feature.geometry && feature.geometry.type;
                if (geometryType === 'LineString') {
                    lineString(ctx, feature, style);
                } else if (geometryType === 'MultiLineString') {
                    multiLineString(ctx, feature, style);
                } else if (geometryType === 'Polygon') {
                    polygon(ctx, feature, style);
                } else if (geometryType === 'MultiPolygon') {
                    multiPolygon(ctx, feature, style);
                }
            } else if (currentLayer && currentLayer.transformedFeatures && style.type !== 'wind') {
                const features = currentLayer.transformedFeatures && currentLayer.transformedFeatures[name] || [];
                features.forEach(feat => {
                    const geometryType = feat.geometry && feat.geometry.type;
                    if (geometryType === 'Point') {
                        point(ctx, feat, style);
                    } else if (geometryType === 'LineString') {
                        lineString(ctx, feat, style);
                    } else if (geometryType === 'MultiLineString') {
                        multiLineString(ctx, feat, style);
                    } else if (geometryType === 'Polygon') {
                        polygon(ctx, feat, style);
                    } else if (geometryType === 'MultiPolygon') {
                        multiPolygon(ctx, feat, style);
                    }
                });
            }
        });

        return {
            ...res,
            [name]: {
                height,
                width,
                texture
            }
        };
    }, {});

    const windLayer = head(styles.map(style => {
        const styledLayer = head(transformedLayers.filter(layer => layer.table === style.source));
        return styledLayer && styledLayer.transformedFeatures && style.type === 'wind' && {...styledLayer, style} || null;
    }).filter(val => val));

    const windTextures = [...backgroundTiles].reverse()
        .reduce((res, { feature, name }, idx) => {

            const { width, height } = reversSizes[idx];


            const texture = createElement('canvas', {
                width,
                height
            },
                {
                    width: width + 'px',
                    height: height + 'px'
                });
            const ctx = texture.getContext('2d');

            const features = windLayer && windLayer.transformedFeatures && windLayer.transformedFeatures[name] || null;

            if (features) {
                const wind = new Wind({
                    ctx,
                    width,
                    height,
                    features,
                    name,
                    background: textures[name],
                    layerName: windLayer && `${windLayer.database}:${windLayer.table}`,
                    style: windLayer.style,
                    shapeType: type
                });

                wind.draw();

                ctx.save();
                ctx.drawImage(textures[name].texture, 0, 0);
                ctx.restore();

                return {
                    ...res,
                    [name]: {
                        maxTime: windLayer.style && windLayer.style['max-time'] || 5000,
                        height,
                        width,
                        texture,
                        canvas: {
                            texture,
                            wind
                        }
                    }
                };
            }

            ctx.save();
            ctx.drawImage(textures[name].texture, 0, 0);
            ctx.restore();

            return {
                ...res,
                [name]: {
                    height,
                    width,
                    texture
                }
            };
        }, {});

    return {
        textures: windTextures,
        tilesTransformations,
        sizes,
        layers,
        styles
    };
};

module.exports = {
    plotTiles,
    loadTiles,
    getCoordinates,
    getAngles,
    getCameraPosition
};
