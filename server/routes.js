'use strict';

const url = require("url");
//const fs = require("fs");
//const https = require("https");
const db = require("./mongo.js");
//const mongoose = require('mongoose')
//const ObjectID = mongoose.Types.ObjectId
//const auth = require("./auth.js");

// Toggle initializing DB
const enableDB = process.env.ENABLE_DB == "true"
db.init(enableDB)

const routes = function (req, res) {

    const respond = (response) => {
        response = response || "";
        typeof(response) == "object" && res.setHeader("Content-Type", "application/json");
        res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
        "err" === response && res.end("err") // TODO: We should really send a more explicit msg in future
        "err" !== response && res.end(JSON.stringify(response));
    }

    //Convert post data to string
    let input = '';
    req.on('data', (buffer) => { input += buffer.toString(); })

    req.on('end', () => {
        let parsed = input ? JSON.parse(input) : "";

        let requrl = url.parse(req.url).pathname
        let headers = req.headers;

        let path = req.url.split("/")
        let fileName = path[path.length-1]

        switch(requrl) {
            // TODO: Review ping/pong
            case "/api/get/ping": respond("pong");
            break;
            //case "/api/get/menu": auth.getMenu(headers, respond) //username / key
            //break;
            //case "/api/get/username": auth.getUser(headers, respond) //username / key
            //break;
            //case "/api/post/logout": auth.sendLogout(headers, respond) //username / key
            //break;
            case "/api/get/sampletest": respond("I am a test response from the server")
            break;
            case "/api/get/mongoquery": sampleQuery("sample", res)
            break;
            case "/api/post/mongoupdate": sampleUpdate(parsed, "sample", headers, res)
            break;
            case "/api/delete/mongodelete": sampleDelete(parsed, "sample", headers, res)
            break;
            default: respond();
        }
    })
}

//  See docker-compose.yml and top of this file to enable mongo
//  Requires db.init(true) to be run once before using these sample methods
//  See db.js
//db.retrieve: function (type, res)
//db.retrieveOne: function (query, type, res)
//db.submit: function (clientJson, type, headers, res)
//db.remove: function (clientJson, type, headers, res)

function sampleQuery(mongocollection, res) {
    console.log("Server received sample GET from client")
    !db.isConnected && res.end(JSON.stringify("Received GET for mongoquery! See routes.sampleQuery for enabling DB"))
    db.isConnected && db.retrieve(mongocollection, res)
}

function sampleUpdate(clientJson, mongocollection, headers, res) {
    console.log("Server received sample POST from client: ", clientJson)
    !db.isConnected && res.end(JSON.stringify("Recieved POST for mongoupdate! See routes.sampleUpdate for enabling DB"))
    db.isConnected && db.submit(clientJson, mongocollection, headers, res)
}

function sampleDelete(clientJson, mongocollection, headers, res) {
    console.log("Server received sample DELETE from client: ", clientJson)
    !db.isConnected && res.end(JSON.stringify("Recieved DELETE for mongodelete! See routes.sampleDelete for enabling DB"))
    db.isConnected && db.remove(clientJson, mongocollection, headers, res)
}

module.exports = routes;
