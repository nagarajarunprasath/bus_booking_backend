const express = require('express');
const {
    gettingClients,
    postingClient,
    verifyClient,
    forgotPassword,
    resetPasssword,
    updateClient,
    deleteClient
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
    /**
         * @swagger
         * /api/v1/client/forgotpassword:
         *   post:
         *     tags:
         *       - Client
         *     description: getting password resetToken
         *     parameters:
         *       - name: body
         *         description: Client fields
         *         in: body
         *         schema:
         *           properties:
         *             Email_or_telephone:
         *               type: string
         *     responses:
         *       200:
         *         description: we have sent you a reset token
         */
    .post(forgotPassword)
    routers.route('resetPassword/:resetToken')
        /**
         * @swagger
         * /api/v1/client/resetPassword/{resetToken}:
         *   put:
         *     tags:
         *       - Client
         *     description: resetting password for client
         *     parameters:
         *       - name: resetToken
         *         description: resetPasswordToken
         *         in: path
         *       - name: body
         *         description: password fields
         *         in: body
         *         schema:
         *           properties:
         *             password:
         *               type: string
         *             confirmpassword:
         *               type: string
         *     responses:
         *       200:
         *         description: we have updated your password
         */
    .put(resetPasssword);
    routers.route("/:id")
        /**
             * @swagger
             * /api/v1/client/{id}:
             *   put:
             *     tags:
             *       - Client
             *     description: updating information of client
             *     parameters:
             *       - name: id
             *         description: clientId
             *         in: path
             *       - name: body
             *         description: password fields
             *         in: body
             *         schema:
             *           properties:
             *             Firstname:
             *               type: string
             *             Lastname:
             *               type: string
             *             Email_or_Telephone:
             *               type: string
             *             Gender:
             *               type: string
             *     responses:
             *       200:
             *         description: we have updated your info
             */
            .put(updateClient)
/**
* @swagger
* /api/v1/client/{id}:
*   delete:
*     tags:
*       - Client
*     description: deleting client
*     parameters:
*       - name: id
*         description: clientId
*         in: path
*     responses:
*       200:
*        description: client deleted
*/
.delete(deleteClient)
module.exports.clientRoutes = routers