const compression = require('compression');
const express = require('express');
const path = require('path');

const app = express();

app.use(compression());
  
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/db/data.db');

var mongo = require('mongodb');

app.use(express.static(__dirname))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/map.html'));
});

app.get('/db', (req, res) => {
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/ungerryus";

    res.write('connecting to db\n');

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        console.log("Database created!");
        res.write('db created\n');
        res.end()
        db.close();
    });
});

app.get('/district/:state/:type', (req, res) => {

    var state = req.params.state;
    var type = req.params.type;
    var rows = 0;
    var sql = `SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
district.district_id as district_id, 
district.name as name, 
district.total as population,
district.white as white,
district.latino as latino,
district.black as black,
district.asian as asian,
district.native as native,
district_voting_2020.per_gop as gop, 
district_voting_2020.per_dem as dem, 
district_geo.coordinates as coordinates 
FROM
state, 
district, 
district_voting_2020, 
district_geo 
WHERE 
state.state_id = district.state_id and
district.state_id = district_geo.state_id and
district_geo.state_id = district_voting_2020.state_id and
district.district_id = district_geo.district_id and 
district_geo.district_id = district_voting_2020.district_id and 
state.abbreviation = ?;`

    console.log(sql);
    db.all(sql, state, function(err, data) {
        if (err) {
            console.log('error: ' + err);
        }
        else {

            res.write(`{ "type": "FeatureCollection", "features": [`);

            data.forEach(row =>  {

                if (rows > 0) {
                    res.write(',\n');
                }
                rows++;
                outputRow(row, res, type);
            });

            res.write(']}');
        }
        res.end();
    });
});

app.get('/county/:state/:type', (req, res) => {
  
  var state = req.params.state;
  var type = req.params.type;
  var rows = 0;
  var sql = `SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
county.county_id as county_id, 
county.name as name, 
county.total as population,
county.white as white,
county.latino as latino,
county.black as black,
county.asian as asian,
county.native as native,
county_voting_2020.per_gop as gop, 
county_voting_2020.per_dem as dem, 
county_geo.coordinates as coordinates 
FROM
state, 
county, 
county_voting_2020, 
county_geo 
WHERE 
state.state_id = county.state_id and
county.state_id = county_geo.state_id and
county_geo.state_id = county_voting_2020.state_id and
county.county_id = county_geo.county_id and
county_geo.county_id = county_voting_2020.county_id and
state.abbreviation = ?;`

  console.log(sql);
  db.all(sql, state, function(err, data) {
      if (err) {
        console.log('error: ' + err);
      }
      else {

        res.write(`{ "type": "FeatureCollection", "features": [`);
        
        data.forEach(row =>  {

          if (rows > 0) {
            res.write(',\n');
          }
          rows++;
          outputRow(row, res, type);
        });
        
        res.write(']}');
      }
      res.end();
  });
});

app.get('/tract/:state/:type', (req, res) => {

    var state = req.params.state;
    var type = req.params.type;
    var rows = 0;
    var sql = `SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
tract.tract_id as tract_id, 
tract.name as name, 
tract.total as population,
tract.white as white,
tract.black as black,
tract.native as native,
tract.asian as asian, 
tract.latino as latino,
tract_geo.coordinates as coordinates 
FROM
state, 
tract, 
tract_geo 
WHERE 
state.state_id = tract.state_id and
tract.state_id = tract_geo.state_id and
tract.county_id = tract_geo.county_id and
tract.tract_id = tract_geo.tract_id and 
state.abbreviation = ?;`

    console.log(sql);
    db.all(sql, state, function(err, data) {
        if (err) {
            console.log('error: ' + err);
        }
        else {

            res.write(`{ "type": "FeatureCollection", "features": [`);
            data.forEach(row =>  {

                if (rows > 0) {
                    res.write(',\n');
                }
                rows++;
                outputRow(row, res, type);
            });

            res.write(']}');
            res.end();
        }
    });
});

function outputRow(row, res, type, color='black') {

    if (type === "vote") {

        /* tract doesn't have vote data */
        if ('dem' in row) {
            let color = get_vote_color(row.gop, row.dem);
            res.write(`{ "type": "Feature", "properties": { "name": "${row.name}", "state": "${row.abbreviation}", "dem": ${row.dem}, "gop": ${row.gop}, "color": "${color}", "race": [${row.white}, ${row.latino}, ${row.black}, ${row.asian}, ${row.native}], "population": ${row.population} }, "geometry": ${row.coordinates} }`);
        }
        else {
            res.write(`{ "type": "Feature", "properties": { "name": "${row.name}", "state": "${row.abbreviation}", "race": [${row.white}, ${row.latino}, ${row.black}, ${row.asian}, ${row.native}], "population": ${row.population} }, "geometry": ${row.coordinates} }`);
        }
    }
    else {
        if (type === "race") {
            color = get_population_color(row);
        }
        res.write(`{ "type": "Feature", "properties": { "name": "${row.name}", "state": "${row.abbreviation}", "race": [${row.white}, ${row.latino}, ${row.black}, ${row.asian}, ${row.native}], "color": "${color}", "population": ${row.population} }, "geometry": ${row.coordinates} }`);
    }
}

function get_district_counties() {

    let sql = `SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
county.county_id as county_id, 
county.name as county_name, 
county.total as population,
county.white as white,
county.black as black,
county.native as native,
county.asian as asian, 
county.latino as latino,
county_geo.coordinates as coordinates 
FROM
state, 
county, 
county_geo 
WHERE 
state.state_id = county.state_id and
county.state_id = county_geo.state_id and 
county.county_id = county_geo.county_id and
county.total < 770000 and 
state.abbreviation = ?`;

    return sql;
}

function get_district_tracts(state) {

    let sql = `SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
county.county_id as county_id, 
county.name as county_name,
tract.tract_id  as tract_id,
tract.name as tract_name,
tract.total as population,
tract.white as white,
tract.black as black,
tract.native as native,
tract.asian as asian, 
tract.latino as latino,
tract_geo.coordinates as coordinates
FROM
state, 
county,
tract,
tract_geo
WHERE 
state.state_id = county.state_id and
county.state_id = tract.state_id and
county.county_id  = tract.county_id and
tract.state_id = tract_geo.state_id and
tract.county_id = tract_geo.county_id and 
tract.tract_id = tract_geo.tract_id and
county.total >= 770000 and 
state.abbreviation = ?`;

    return sql;
}

app.get('/hybrid/:state/:type', (req, res) => {

    var state = req.params.state;
    var type = req.params.type;
    var rows = 0;

    if (type === 'vote') {
        type = 'none';
    }

    db.serialize(function() {

        var sql = get_district_counties();
        console.log(sql);

        db.all(sql, state, function(err, data) {
            res.write(`{ "type": "FeatureCollection", "features": [`);

            if (err) {
                console.log('error: ' + err);
            }
            else {

                data.forEach(row =>  {

                    if (rows > 0) {
                    res.write(',\n');
                    }
                    rows++;
                    outputRow(row, res, type, "orange");
                });
            }
        });

        sql = get_district_tracts();
        console.log(sql);

        db.all(sql, state, function(err, data) {

            if (err) {
                console.log('error: ' + err);
            }
            else {

                data.forEach(row =>  {

                    if (rows > 0) {
                        res.write(',\n');
                    }
                    rows++;
                    outputRow(row, res, type, 'green');
                });

                res.write(']}');
            }
            res.end();
        });
    });
});

app.get('/counties/:max', (req, res) => {

    var max = parseInt(req.params.max);
    var rows = 0;
    var sql = `SELECT 
county.county_id as county_id, 
county.name as name, 
county.total as population,
county_voting_2020.per_gop as gop, 
county_voting_2020.per_dem as dem, 
county_geo.coordinates as coordinates 
FROM
county, 
county_voting_2020, 
county_geo 
WHERE 
county.county_id = county_geo.county_id and 
county_geo.county_id = county_voting_2020.county_id and 
county.state_id = county_geo.state_id and
county_geo.state_id = county_voting_2020.state_id and
county.total < ?;`

    console.log(sql);
    db.all(sql, max, function(err, data) {
        if (err) {
            console.log('error: ' + err);
        }
        else {

            res.write(`{ "type": "FeatureCollection", "features": [`);

            data.forEach(row =>  {

                if (rows > 0) {
                    res.write(',\n');
                }
                rows++;

                let color = get_vote_color(row.gop, row.dem);
                res.write(`{ "type": "Feature", "properties": { "name": "${row.name}", "state": "${row.abbreviation}", "dem": ${row.dem}, "gop": ${row.gop}, "color": "${color}", "population": ${row.population} }, "geometry": ${row.coordinates} }`);
            });

            res.write(']}');
        }
        res.end();
    });
});

app.get('/states', (req, res) => {

  db.all("SELECT state_id, abbreviation, name, lat, lng from state", function(err, data) {
      if (err) {
        console.log('error: ' + err);
      }
      else {
        res.write('var states = [\n');
        data.forEach(row =>  {
          res.write(`\t{"id":"${row.abbreviation}", "name":"${row.name}", "lat": "${row.lat}", "lng":"${row.lng}"},\n`);
          console.log(row);
        });
        res.write('];');
      }
      res.end();
  });
});

app.listen(3000, () => {
  console.log('server started');
})

function get_population_color(data) {

    let white = parseInt(data['white']);
    let black = parseInt(data['black']);
    let native = parseInt(data['native']);
    let asian = parseInt(data['asian']);
    let latino = parseInt(data['latino']);

    if (white > black && white > native && white > asian && white > latino) {
        return 'gray'
    }

    if (black > white && black > native && black > asian && black > latino) {
        return 'black'
    }

    if (native > white && native > black && native > asian && native > latino) {
        return 'red'
    }

    if (asian > white && asian > black && asian > native && asian > latino) {
        return 'yellow'
    }

    if (latino > white && latino > black && latino > native && latino > asian) {
        return 'blue'
    }

    //console.log(`no dominant color: white:${white} black:${black} native:${native} asian:${asian} latino:${latino}`);
    return 'purple'
}

function get_vote_color(gop, dem) {
  
    if (gop > 0.55) {
        return 'red';
    }

    if (dem > 0.55) {
        return 'blue';
    }

    return 'purple';
}
