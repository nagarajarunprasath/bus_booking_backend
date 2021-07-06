const express = require('express');
const {
    gettingClients,
    postingClient,
    verifyClient
} = require('../controllers/clients.controller.js');
const routers = express.Router();
routers.route("/")
    .get(gettingClients)
    .post(postingClient)
routers.route('/verify/:verificationToken')
.get(verifyClient)
module.exports.clientRoutes = routers;