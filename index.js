const express = require('express');
const app = express();
const schedule = require('node-schedule');
const https = require('https');
const moment = require('moment');

let wednesday = moment().day(3).format('L'); // this wednesday
const target = `https://www.previewsworld.com/NewReleases/Export?format=csv&releaseDate=${wednesday}`;
let content, jsonContent;

(function task() {
    getFile(target)
        .then(parseFile)
        .then(cacheFile)
        .catch((err) => {
            console.log(err);
        });
})();

schedule.scheduleJob('42 3 * * * *', function () {
    console.log('Begining task at ' . moment().format());
    wednesday = moment().day(3).format('L');
    task();
    console.log('Task finished at ' . moment().format());
});

function getFile(url) {
    console.log(`Getting file : ${url}`);
    return new Promise((resolve, reject) => {
        let file = [];
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(res.statusCode);
            }
            res.on('data', (chunk) => {
                file.push(chunk);
            }).on('end', () => {
                console.log('File downloaded');
                resolve(file.join(''));
            })
        }).on('error', () => {
            reject('request.error');
        });
    });
}

function parseFile(data) {
    return new Promise((resolve) => {
        let lines = data.split('\n');
        let price;

        lines = lines
            .map((line) => {
                return line.trim().replace(/\r?\n|\r/, '');
            })
            .filter((line, index) => {
                return line.length > 0 && index > 6;
            });

        let line, current;
        for (let i = 0; i < lines.length; i++) {
            line = lines[i].split(',');
            if (line.length === 1) {
                current = line[0];
                lines.splice(i, 1);
                i--;
                continue;
            }
            line.push(current);
            lines[i] = line;
        }

        lines = lines.map((line) => {
            price = line[2] === '$PI' ? 0.0 : parseFloat(line[2].replace(/\$/g, ''));
            return {
                id: line[0],
                name: line[1],
                price: price,
                type: line[3],
            }
        });

        console.log('File parsed');
        resolve(lines);
    });
}

function cacheFile(data) {
    content = data;
    jsonContent = JSON.stringify(data);
    console.log('File cached');
}

app.get('', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonContent);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});