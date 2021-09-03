'use strict';

const url = require("url");
const auth = require("./auth.js");

const routes = function (req, res) {

    const respond = (response) => {
        response = response || "";
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

        switch(requrl) {
            case "/api/get/menu": auth.getMenu(headers, respond) //username / key
            break;
            case "/api/get/username": getUser(headers, "user", respond) //username / key
            break;
            case "/api/post/logout": sendLogout(headers, respond) //username / key
            break;
            default: respond();
        }
    })

}

// TODO: Maybe start caching credentials for a minute at a time to prevent
// multiple consecutive and frequent calls
function checkAccess(headers, app, accessReq, callback) {
    auth.checkAccess({headers, app, accessReq})
    .then(({ status, hasPermissions }) => {
        if(!status) {
            console.log("checkAccess: User has incorrect authentication credentials");
            return callback({status: false, data: "Incorrect credentials"})
        }
        if(!hasPermissions) {
            console.log("checkAccess: User does not have required access for action");
            return callback({status: false, data: "Insufficient priveleges"})
        }
        callback({status: true})
    })
    .catch((e) => {
        console.log("ERR - ROUTES.CHECKACCESS:\n", e);
        callback({status: false, data: "Server error"})
    })
}

function sendLogout(headers, respond) {
    auth.logout({headers})
    .then(({ status }) => {
        if(!status) {
            console.log("User has incorrect authentication credentials");
            return respond({status: false, data: "Incorrect credentials"})
        }
        respond({status: true, data: "Success"})
    })
    .catch((e) => {
        console.log("Bad:", e);
        respond({status: false, data: "Server error"})
    })
}

function getUser(headers, accessReq, respond) {
    checkAccess(headers, "base_react_app", accessReq, ({status, data}) => {
        if(status) {
            let email = headers["auth-email"]
            respond({status: true, data: email})
        }
        else {
            respond({status: false, data})
        }
    })
}

module.exports = routes;
