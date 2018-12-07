/* copyright 2018, stefano bovio @allyoucanmap. */

const { Pool } = require('pg');
const { join, head, delay, range, isNil } = require('lodash');
const uuidv1 = require('uuid/v1');

let pools = {};

const axios = require('axios');
const fs = require('fs');

const getWindData = (path, name) => {
    return new Promise((response, error) => {
        axios.get(`${path}${name}.json`)
            .then(({ data }) => {
                const u = data.u;
                const v = data.v;
                const width = u.Ni;
                const height = u.Nj;

                let features = [];

                range(height).forEach((y) => {
                    range(width).forEach((x) => {
                        const loc = y * width + (x + width / 2) % width;
                        if (loc % 2 === 0) {
                            features.push({
                                type: 'Feature',
                                properties: {
                                    u: u.values[loc],
                                    v: v.values[loc],
                                    uMax: u.maximum,
                                    uMin: u.minimum,
                                    vMax: v.maximum,
                                    vMin: v.minimum
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [x - 180, 90 - y]
                                }
                            });
                        }
                    });
                });

                const featureCollection = {
                    type: 'FeatureCollection',
                    crs: {
                        type: 'name',
                        properties: {
                            name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
                        }
                    },
                    features
                };

                response(featureCollection);

                fs.writeFile(`${path}${name}.geojson`, JSON.stringify(featureCollection), (err) => {
                    error(err);
                });
            }).catch((err) => {
                error(err);
            });
    });
};

const getName = ({host, port, database}) => `${host}:${port}:${database}`;

const setPool = ({ count, tables: newTables, pool, poolData, resolve, reject }) => {
    if (count === 0 && newTables.length > 0 && poolData.database) {
        const tables = [...newTables].sort((a, b) => a.table > b.table ? 1 : -1);
        pools[getName(poolData)] = { pool, tables };
        delay(() => {
            resolve([...tables]);
        }, 750);
        return;
    } else if (count === 0) {
        pool.end();
        delay(() => {
            reject('No tables');
        }, 750);
        return;
    }
};

const removeStore = poolData => {
    const name = getName(poolData);
    if (pools[name]) {
        pools[name].pool.end();
        pools = Object.keys(pools)
            .filter(key => key !== name)
            .reduce((newPools, key) => ({
                ...newPools,
                [key]: pools[key]
            }), {});
    }
};

const addStore = poolData => {
    return new Promise((resolve, reject) => {
        if (pools[getName(poolData)]) {
            delay(() => {
                reject(`Just connected to '${poolData.database}'`);
            }, 750);
            return;
        }
        const pool = new Pool(poolData);
        pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema<>'pg_catalog' AND table_schema<>'information_schema'`, (err, res) => {
            if (err) {
                pool.end();
                return reject(err && err.message || `Could not connect to ${poolData.database} database`);
            }
            let count = res.rows.length;
            let tables = [];
            res.rows.forEach(({ table_schema: tableSchema, table_name: tableName }) => {
                pool.query(`SELECT * FROM information_schema.columns WHERE table_schema = '${tableSchema}' AND table_name = '${tableName}'`, (geomErr, geomRes) => {
                    if (geomErr) {
                        count--;
                        return setPool({ count, tables, pool, poolData, resolve, reject });
                    }
                    const geometryName = head(geomRes.rows.filter(({ udt_name: udtName }) => udtName === 'geometry').map(({ column_name: columnName }) => columnName));
                    if (geometryName && geometryName !== 'extent') {

                        pool.query(`SELECT DISTINCT(ST_GeometryType(${geometryName})), ST_SRID(${geometryName}) FROM ${tableSchema}.${tableName} LIMIT 100`, (typeErr, typeRes) => {
                            const {st_geometrytype: stGeometrytype, st_srid: stSrid} = typeRes && typeRes.rows && head(typeRes.rows) || {};
                            if (!typeErr && stSrid === 4326) {
                                const propertyKeys = geomRes.rows.filter(({ udt_name: udtName }) => udtName !== 'geometry').map(({ column_name: columnName }) => columnName);
                                tables = [...tables, {
                                    id: uuidv1(),
                                    table: tableName,
                                    schema: tableSchema,
                                    database: getName(poolData),
                                    geometryName,
                                    propertyKeys,
                                    type: (stGeometrytype === 'ST_Point' || stGeometrytype === 'ST_MultiPoint') && 'point'
                                    || (stGeometrytype === 'ST_LineString' || stGeometrytype === 'ST_MultiLineString') && 'line'
                                    || (stGeometrytype === 'ST_Polygon' || stGeometrytype === 'ST_MultiPolygon') && 'polygon'
                                }];
                            }
                            count--;
                            setPool({ count, tables, pool, poolData, resolve, reject });
                        });

                    } else {
                        count--;
                        setPool({ count, tables, pool, poolData, resolve, reject });
                    }
                });
            });
        });
    });
};

const ST = {
    _SimplifyPreserveTopology: (geom, precision) => `ST_SimplifyPreserveTopology(${geom}, ${precision})`,
    _Simplify: (geom, precision) => `ST_Simplify(${geom}, ${precision})`,
    _SetSRID: (geom, epsg) => `ST_SetSRID(${geom}, ${epsg})`,
    _Length: geom => `ST_Length(${geom})`,
    _Area: geom => `ST_Area(${geom})`,
    _MakeValid: geom => `ST_MakeValid(${geom})`,
    _GeomFromText: geom => `ST_GeomFromText('${geom}')`,
    _AsGeoJSON: geom => `ST_AsGeoJSON(${geom})`,
    _Intersection: (geomA, geomB) => `ST_Intersection(${geomA}, ${geomB})`,
    _Intersects: (geomA, geomB) => `ST_Intersects(${geomA}, ${geomB})`,
    _MakeEnvelope: (geom, epsg) => `ST_MakeEnvelope(${geom}, ${epsg})`
};

let features = {

};

const getFeatures = ({ propertyKeys, shapeType, type, database, bbox, wkt, zoom, geometryName, table, epsg = 4326, fullRes, tileName, printZoom }) => {

    const key = `${database}:${table}:${shapeType}:${tileName}`;
    const currentZoom = isNil(printZoom) && !fullRes
        ? zoom
        : !isNil(printZoom)
            ? printZoom
            : undefined;

    return new Promise((response, error) => {

        if (!fullRes && features[key]) return response(features[key]);

        if (pools && pools[database] && pools[database].pool) {

            pools[database].pool.connect((poolError, client, done) => {
                if (poolError) {
                    return error(poolError);
                }

                const geometry = ST._Simplify(
                    ST._SetSRID(geometryName, 4326),
                    0.4 / Math.pow(2, currentZoom)
                );

                let rows = [];
                let cnt = 0;

                wkt.forEach((str, idx) => {

                    const wktGeom = ST._SetSRID(
                        ST._MakeValid(
                            ST._GeomFromText(wkt[idx])
                        ),
                        4326
                    );

                    const velidGeom = ST._MakeValid(isNil(currentZoom) ? geometryName : geometry);

                    const geometryQuery = ST._AsGeoJSON(
                        ST._Intersection(
                            wktGeom,
                            velidGeom
                        )
                    );

                    const envelope = ST._MakeEnvelope(join(bbox[idx], ', '), epsg);

                    const size = {
                        polygon: ` AND ${ST._Area(geometryName)} > ${0.5 / Math.pow(2, currentZoom)}`,
                        line: ` AND ${ST._Length(geometryName)} > ${0.5 / Math.pow(2, currentZoom)}`
                    };

                    const checkSize = isNil(currentZoom) ? '' : size[type] || '';

                    client.query(`SELECT ${geometryQuery}, ${join(propertyKeys, ',')} FROM ${table} WHERE ${geometryName} && ${envelope}${checkSize}`, (err, res) => {

                        if (err) return error({wkt: str, err});

                        if (res && res.rows) {
                            rows = [...rows, ...res.rows];
                        }

                        cnt++;

                        if (cnt === wkt.length) {

                            const results = rows.reduce((featureCollection, feature) => {
                                const {st_asgeojson, ...properties} = feature;
                                const stAsgeojson = JSON.parse(st_asgeojson);

                                if (stAsgeojson && stAsgeojson.coordinates && stAsgeojson.coordinates.length > 0) {
                                    return {
                                        ...featureCollection,
                                        features: [
                                            ...featureCollection.features,
                                            { geometry: { ...stAsgeojson }, properties }
                                        ]
                                    };
                                }
                                return { ...featureCollection };
                            }, {
                                    type: 'FeatureCollection',
                                    features: []
                                });
                            if (!fullRes) {
                                features[key] = {...results};
                            }
                            response(results);
                            done();
                        }
                    });
                });

            });

        } else {
            return error();
        }
    });
};

const getPools = () => pools;

window.pg = {
    addStore,
    removeStore,
    getPools,
    getFeatures,
    getWindData
};
