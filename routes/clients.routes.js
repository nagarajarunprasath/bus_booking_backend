const express = require('express');
const {
    gettingClients,
    postingClient,
    verifyClient,
    forgotPassword
} = require('../controllers/clients.controller.js');
const routers = express.Router();
routers.route("/")
    .get(gettingClients)
    .post(postingClient)
routers.route('/verify/:verificationToken')
.get(verifyClient)
routers.route("/forgotPassword").post(forgotPassword)
module.exports.clientRoutes = routers;