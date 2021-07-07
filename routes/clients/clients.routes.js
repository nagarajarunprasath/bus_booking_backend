const express = require('express');
const {
    gettingClients,
    postingClient,
    verifyClient,
    forgotPassword
} = require('../../controllers/clients/clients.controller.js');
const routers = express.Router();
routers.route("/")
    /**
     * @swagger
     * /api/v1/client:
     *   get:
     *     tags:
     *       - Client
     *     description: Returns all clients
     *     responses:
     *       200:
     *        description: Success
     */
    .get(gettingClients)
    /**
     * @swagger
     * /api/v1/client:
     *   post:
     *     tags:
     *       - Client
     *     description: Registering client
     *     parameters:
     *       - name: body
     *         description: Client fields
     *         in: body
     *         schema:
     *           properties:
     *             Email_or_telephone:
     *               type: string 
     *             Firstname:
     *               type: string
     *             Lastname:
     *               type: string
     *             Gender:
     *               type: string
     *             Password:
     *               type: string
     *             confirmPassword:
     *               type: string
     *     responses:
     *       200:
     *         description: We have send email verification code to your email
     */
    .post(postingClient)
routers.route('/verify/:verificationToken')
    /**
     * @swagger
     * /api/v1/client/verify/{verificationToken}:
     *   get:
     *     tags:
     *       - Client
     *     description: Verify email
     *     parameters:
     *       - name: verificationToken
     *         description: Email verification
     *         in: path
     *     responses:
     *       200:
     *        description: Email verified
     */
    .get(verifyClient)
routers.route("/forgotPassword")
    .post(forgotPassword)
module.exports.clientRoutes = routers;