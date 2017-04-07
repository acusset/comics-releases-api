var express = require('express');
var schedule = require('node-schedule');
var https = require('https');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var cache = require('memory-cache');

var slug, date;
var filePath = path.join(__dirname, 'newreleases.txt');

var dateRegex = /(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}/g;
var regex = /(^[A-Z]{3}[0-9]{6})\s(.+)\s\$(([0-9]+\.[0-9]{2})|PI)/i;

var app = express();

app.get('/api', function (req, res) {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.send(cache.get('content'));
});

app.get('/api/menu', function (req, res) {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.send(cache.get('menu'));
});

schedule.scheduleJob('42 3 * * * *', function () {
    getFile();
});

/**
 * Get txt file from previewsworld and save it
 */
function getFile() {
    var target = 'https://www.previewsworld.com/shipping/newreleases.txt';
    var file = fs.createWriteStream(filePath);
    https.get(target, function (response) {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', function () {
                parseFile();
            });
        }
    });
}

/**
 * Parse newreleases.txt file and create json files
 */
function parseFile() {
    fs.readFile(filePath, 'utf-8', function (err, data) {
        var content = {};
        var types = [];
        if (err) throw err;
        var lines = data.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line || line.length <= 1) {
                continue;
            }
            if (i == 0) { // parse date
                date = line.match(dateRegex)[0];
                date = moment(Date.parse(date)).format('L'); // to prevent momentjs deprecation warning
                content['date'] = date;
                continue;
            }
            var values = line.match(regex);
            if (values) {
                var obj = {
                    id: values[1],
                    title: values[2],
                    price: parseFloat(values[3])
                };
                content[slug].push(obj);
            } else if (i > 7) { // skip first lines
                var title = line.trim();
                slug = slugify(title);
                var type = {
                    name: title,
                    slug: slug
                };
                types.push(type);
                content[slug] = [];
            }
        }
        cache.put('menu',JSON.stringify(types));
        cache.put('content',JSON.stringify(content));
    });
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

app.listen(26100, function () {
    console.log('Listening on port 26100!');
    getFile();
});
