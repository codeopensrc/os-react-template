"use strict";

const CONSUL_HOST = process.env.CONSUL_HOST || "172.17.0.1";

const consul = require('consul')({host: CONSUL_HOST});
const serverState = require("./serverState.js");
const mongoose = require('mongoose')
const ObjectID = mongoose.Types.ObjectId

const CONSUL_RETRY_INTERVAL = 1000 * 2
const DB_RETRY_INTERVAL = 1000 * 2

const SECRET_KEY = process.env.SAMPLE_SECRET || "dev";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "react";
const DEV_DB_URL = process.env.DEV_DATABASE_URL || "";

let connectionAttempts = 0

module.exports = {

    db: null,
    get isConnected() { return this.db !== null },

    // See routes.js for default init location
    init: function (enableDB) {
        if(enableDB !== true) { return }

        serverState.registerConnection("mongo")

        let mongoOpts = {}

        // If we're not providing a URL look for address in consul
        if(!DEV_DB_URL) {
            consul.catalog.service.nodes("mongo", (err, res) => {
                if (err) { console.log("ERR - db.js", err); }
                let addrStr = "";
                res && res.length > 0 && res.forEach((node, i) => {
                    let address = node.ServiceAddress != "" ? node.ServiceAddress : node.Address
                    addrStr += `${address}:${node.ServicePort}${i<res.length-1?",":""}`
                })
                let replOpts = res && res.length > 1 ? "?readPreference=primaryPreferred" : ""
                let connectionString = `mongodb://${addrStr}/${MONGO_DB_NAME}${replOpts}`
                if(!addrStr) {
                    console.log("No Mongo Host found for DB.js");
                    setTimeout(this.init.bind(this), CONSUL_RETRY_INTERVAL * ++connectionAttempts);
                    return console.log(`Search consul cluster again in ${CONSUL_RETRY_INTERVAL * connectionAttempts}ms`);
                }
                this.mongoConnect(connectionString, mongoOpts)
            })
        }
        else {
            this.mongoConnect(DEV_DB_URL, mongoOpts)
        }
    },

    mongoConnect: function(connectionString, mongoOpts) {
        mongoose.connect(connectionString,/* mongoOpts,*/ (err) => {
            if(err) {
                setTimeout(this.init.bind(this), DB_RETRY_INTERVAL * ++connectionAttempts);
                console.log("mongoConnect: MongoErr", err);
                return console.log(`Attempting Mongo connection for 30 seconds again in ${DB_RETRY_INTERVAL * connectionAttempts}ms`);
            }
            connectionAttempts = 0;
            this.db = mongoose.connection;
            this.attachMongoListeners()
            serverState.changeServerState("mongo", true)
            serverState.startIfAllReady()
        })
    },

    attachMongoListeners: function() {
        this.db.on("disconnected", (e) => {
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
        res.writeHead(500, {'Access-Control-Allow-Origin' : '*'} );
        res.end(JSON.stringify({status: "Error"}));
    },

    resWithNoAccess: function (res) {
        res.writeHead(403, {'Access-Control-Allow-Origin' : '*'} );
        res.end(JSON.stringify({authorized: false}));
    },


    // ================================================================
    // ================ Sample CRUD Operation for mongo =============== 
    // ================================================================ 
    retrieve: function (type, res) {
        let db = this.db
        if(!db) { return this.resWithErr("No DB Connection", res) }
        let collection = db.collection(type);

        collection.find({}).toArray((err, docs) => {
            if(err) { return this.resWithErr(err, res) }
            res.setHeader("Content-Type", "application/json")
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
            res.end(JSON.stringify(docs));
        });
    },

    // query = {mongoJsonQuery}
    retrieveOne: function (query, type, res) {
        let db = this.db
        if(!db) { return this.resWithErr("No DB Connection", res) }
        let collection = db.collection(type);

        collection.findOne(query, (err, doc) => {
            if(err) { return this.resWithErr(err, res) }
            res.setHeader("Content-Type", "application/json")
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
            res.end(JSON.stringify(doc));
        });
    },

    // clientJson: {secretKey: key, doc: {mongoJsonDoc}}
    submit: function (clientJson, type, res) {
        if(clientJson.secretKey !== SECRET_KEY) { return this.resWithNoAccess(res); }
        delete clientJson.secretKey

        let db = this.db
        if(!db) { return this.resWithErr("No DB Connection", res) }
        let collection = db.collection(type);

        let doc = clientJson.doc ? clientJson.doc : clientJson;
        //Update if id provided, otherwise creates new id and entry
        let id = doc.id ? ObjectID(doc.id) : ObjectID()
        delete doc.id

        collection.updateOne({"_id": id}, {$set: doc}, {upsert: true}, (err, docs) => {
            if(err) { return this.resWithErr(err, res) }
            doc._id = id
            res.setHeader("Content-Type", "application/json")
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
            res.end(JSON.stringify(doc));
        });
    },

    // clientJson: {secretKey: key, doc: {id: mongoObjectID}}
    remove: function (clientJson, type, res) {
        if(clientJson.secretKey !== SECRET_KEY) { return this.resWithNoAccess(res); }
        delete clientJson.secretKey

        let db = this.db
        if(!db) { return this.resWithErr("No DB Connection", res) }
        let collection = db.collection(type);

        let doc = clientJson.doc ? clientJson.doc : clientJson;
        let id = doc.id ? ObjectID(doc.id) : "";

        collection.findOneAndDelete({"_id": id}, (err, docs) => {
            if(err) { return this.resWithErr(err, res) }
            res.setHeader("Content-Type", "text/html")
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
            res.end(JSON.stringify("success"));
        });
    },
}
