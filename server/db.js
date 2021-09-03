"use strict";

const url = require("url");

const CONSUL_HOST = process.env.CONSUL_HOST || "172.17.0.1";

const consul = require('consul')({host: CONSUL_HOST});
const auth = require("./auth.js");
const serverState = require("./serverState.js");
const ObjectID = require("mongodb").ObjectID;
const mongo = require('mongodb').MongoClient

const CONSUL_RETRY_INTERVAL = 1000 * 2
const DB_RETRY_INTERVAL = 1000 * 2

const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "react";
const DEV_DB_URL = process.env.DEV_DATABASE_URL || "";

module.exports = {

    db: null,

    mongoinit: function () {
        let mongoOpts = {
             // Retry for a day, otherwise something real bad happened to the DB
             // Default is retry once a second
            reconnectTries: 60 * 60 * 24
        }

        // If we're not on localhost, we're gonna look for it in consul
        // Not many (if any) occasions where we would be using a dev_database_url
        //   in a production env/non-dev env
        if(!DEV_DB_URL) {
            consul.catalog.service.nodes("mongo", (err, res) => {
                if (err) { console.log("ERR - db.js", err); }
                let host = res && res[0] ? res[0].Address : ""
                let port = res && res[0] ? res[0].ServicePort : ""
                let connectionString = `mongodb://${host}:${port}/${MONGO_DB_NAME}`
                if(!host) {
                    console.log("No Mongo Host found for DB.js");
                    setTimeout(this.init.bind(this), CONSUL_RETRY_INTERVAL);
                    return console.log("Search consul cluster again in 30 seconds");
                }
                this.mongoConnect(connectionString, mongoOpts)
            })
        }
        else {
            this.mongoConnect(DEV_DB_URL, mongoOpts)
        }
    },

    mongoConnect: function(connectionString, mongoOpts) {
        mongo.connect(connectionString, mongoOpts, (err, db) => {
            if(err) {
                setTimeout(this.init.bind(this), DB_RETRY_INTERVAL);
                return console.log("mongoConnect: MongoErr", err);
            }
            this.db = db
            this.attachMongoListeners()
            serverState.changeServerState("mongo", true)
            serverState.startIfAllReady()
        })
    },

    attachMongoListeners: function() {
        this.db.on("close", (e) => {
            serverState.changeServerState("mongo", false)
            console.log("MongoClose")
        })
        this.db.on("error", (e) => {
            serverState.changeServerState("mongo", false)
            console.log("MongoErr")
        })

        this.db.on("reconnect", (e) => {
            serverState.changeServerState("mongo", true)
        })
        serverState.registerSigHandler(this.db, "mongo", false)
    },

    resWithErr: function(err, db, res) {
        console.error(err);
        res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
        res.end(JSON.stringify({status: "Error"}));
    },

    resWithNoAccess: function (res) {
        res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
        res.end(JSON.stringify({authorized: false}));
    },

    checkAccess: function (headers, accessReq, callback) {
        auth.checkAccess({headers, app: "base_react_app", accessReq: accessReq})
        .then(({ status, hasPermissions }) => {
            if(!status) {
                console.log("User has incorrect authentication credentials");
                return callback({status: false})
            }
            if(!hasPermissions) {
                console.log("User does not have required access for action");
                return callback({status: false})
            }
            callback({status: true})
        })
        .catch((e) => { console.log("ERR - DB.CHECKACCESS:", e); callback({status: "error", err: e}) })
    },

}
