const express = require('express');
const {
    gettingClients,
    postingClient,
    verifyClient,
    forgotPassword,
    resetPasssword,
    deleteClient,
    updateClient
} = require('../controllers/clients.controller.js');
const routers = express.Router();
routers.route("/")
    .get(gettingClients)
    .post(postingClient)
routers.route('/verify/:verificationToken')
.get(verifyClient)
routers.route("/forgotPassword").post(forgotPassword)
routers.route("/resetpassword/:resetToken").put(resetPasssword)
routers.route("/:id").delete(deleteClient)
routers.route("/:id").put(updateClient)
module.exports.clientRoutes = routers;