/* copyright 2018, stefano bovio @allyoucanmap. */

const fs = require('fs');

const shapefile = require('shapefile');
const uuidv1 = require('uuid/v1');
const jsts = require('jsts/dist/jsts.min.js');

const reader = new jsts.io.GeoJSONReader();
const writer = new jsts.io.GeoJSONWriter();

let store = {};

const formats = ['shp'];

const addStore = ({ path }) => {
    return new Promise((response, error) => {
        fs.readdir(path, (err, data) => {
            if (err) return error('No directory');
            if (data) {
                response(
                    data.reduce((newNames, file) => {
                        const splittedName = file.split(/\./g);
                        const format = splittedName[splittedName.length - 1];
                        const table = splittedName[0];
                        return formats.indexOf(format) !== -1
                            ? [...newNames, { path, format, file, table, id: uuidv1()}]
                            : [...newNames];
                    }, [])
                );
            }
        });
    });
};

const getTile = (data, {zoom, id, bbox, tileName, fullRes}) => {
    if (fullRes) return data;

    const complete = `${id}:${zoom}`;
    const key = `${id}:${zoom}:${tileName}`;

    if (!store[complete]) {
        store[complete] = data.features.map(({geometry, ...feature}) => {
            const geom = reader.read(JSON.stringify(geometry));
            const simply = jsts.simplify.TopologyPreservingSimplifier.simplify(geom, 0.4 / Math.pow(2, zoom));
            return {
                ...feature,
                geometry: writer.write(simply)
            };
        });
    }
    if (!store[key]) {
        store[key] = bbox.reduce((features, box) => {
            const [minx, miny, maxx, maxy] = box;
            const bounds = reader.read(JSON.stringify({
                type: 'Polygon',
                coordinates: [[[minx, miny], [minx, maxy], [maxx, maxy], [maxx, miny], [minx, miny]]]
            }));
            return [
                ...features,
                ...store[complete].map(({geometry, ...feature}) => {
                    const simply = reader.read(JSON.stringify(geometry));
                    const intersection = writer.write(simply.intersection(bounds));
                    return {
                        ...feature,
                        geometry: intersection
                    };
                })
            ];
        }, []);
    }

    const features = store[key];

    return {
        type: 'FeatureCollection',
        features
    };
};

const getFeatures = ({ file, path, zoom, bbox, tileName, fullRes }) => {
    const id = `${path}/${file}`;
    const params = { zoom, path, file, id, bbox, tileName, fullRes };
    return new Promise((response, error) => {
        if (!store[id]) {
            shapefile
                .read(id)
                .then(data => {
                    store[id] = data;
                    response(
                        getTile(
                            store[id],
                            params
                        )
                    );
                })
                .catch((err) => {
                    error(err);
                });
        } else {
            response(
                getTile(
                    store[id],
                    params
                )
            );
        }
    });
};

window.geofiles = {
    addStore,
    getFeatures
};
