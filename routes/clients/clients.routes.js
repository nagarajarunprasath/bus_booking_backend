const express = require("express");
const {
  gettingClients,
  postingClient,
  checkingPhone,
  loginClient,
  forgotPassword,
  verifyResetPassCode,
  resetPasssword,
  deleteClient,
  updateClient,
  updatePassword,
  clientPhotoUpload,
  resendCode,
} = require("../../controllers/clients/clients.controller.js");
const { protect } = require("../../middleware/auth.js");
const routers = express.Router();
routers
  .route("/resetPassword")
  /**
   * @swagger
   * /api/v1/client/resetPassword:
   *   put:
   *     tags:
   *       - Client
   *     description: Resetting password
   *     parameters:
   *       - name: body
   *         description: required fields
   *         in: body
   *         schema:
   *           properties:
   *             password:
   *               type: string
   *             confirmPassword:
   *               type: string
   *             Telephone:
   *               type: string
   *     responses:
   *       200:
   *         description: We have updated your password
   */
  .put(resetPasssword);
routers
  .route("/")
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
   *             Telephone:
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
   *         description: We have send verification code to your phone number
   */
  .post(postingClient)
  /**
   * @swagger
   * /api/v1/client:
   *   put:
   *     tags:
   *       - Client
   *     description: updating information of client
   *     parameters:
   *       - name: body
   *         description: password fields
   *         in: body
   *         schema:
   *           properties:
   *             Firstname:
   *               type: string
   *             Lastname:
   *               type: string
   *             Telephone:
   *               type: string
   *     responses:
   *       200:
   *         description: we have updated your info
   */
  .put(protect, updateClient)
  /**
   * @swagger
   * /api/v1/client:
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
  .delete(protect, deleteClient);
routers
  .route("/phoneVerification")
  /**
   * @swagger
   * /api/v1/client/phoneVerification:
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
   *             phoneNumber:
   *               type: string
   *             code:
   *               type: string
   *     responses:
   *       200:
   *         description: You can now login
   */
  .post(checkingPhone);
routers
  .route("/login")
  /**
   * @swagger
   * /api/v1/client/login:
   *   post:
   *     tags:
   *       - Client
   *     description: Login client
   *     parameters:
   *       - name: body
   *         description: Credentials
   *         in: body
   *         schema:
   *           properties:
   *             Telephone:
   *               type: string
   *             Password:
   *               type: string
   *     responses:
   *       200:
   *         description: Logged in successfully
   */
  .post(loginClient);
routers
  .route("/resendCode")
  /**
   * @swagger
   * /api/v1/client/resendCode:
   *   post:
   *     tags:
   *       - Client
   *     description: Re-send code
   *     parameters:
   *       - name: body
   *         description: Phone field
   *         in: body
   *         schema:
   *           properties:
   *             Telephone:
   *               type: string
   *     responses:
   *       200:
   *         description: We have sent code to this number
   */
  .post(resendCode);
routers
  .route("/forgotPassword")
  /**
   * @swagger
   * /api/v1/client/forgotPassword:
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
   *             Telephone:
   *               type: string
   *     responses:
   *       200:
   *         description: we have sent you a reset code
   */
  .post(forgotPassword);
routers
  .route("/verifyResetPassCode")
  /**
   * @swagger
   * /api/v1/client/verifyResetPassCode:
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
   *             Telephone:
   *               type: string
   *             code:
   *               type: string
   *     responses:
   *       200:
   *         description: You can now proceed and reset your password
   */
  .post(verifyResetPassCode);
routers
  .route("/updatePassword")
  /**
   * @swagger
   * /api/v1/client/updatePassword:
   *   put:
   *     tags:
   *       - Client
   *     description: Change password
   *     parameters:
   *       - name: body
   *         description: Body Field
   *         in: body
   *         schema:
   *           properties:
   *             currentPassword:
   *               type: string
   *             newPassword:
   *               type: string
   *             confirmPassword:
   *               type: string
   *     responses:
   *       200:
   *         description: Password updated
   */
  .put(protect, updatePassword);
routers
  .route("/photo")
  /**
   * @swagger
   * /api/v1/client/photo:
   *   put:
   *     tags:
   *       - Client
   *     description: Upload profile picture
   *     consumes:
   *       - multipart/form-data
   *     parameters:
   *       - name: photo
   *         description: Upload a photo
   *         in: formData
   *         type: file
   *     responses:
   *       200:
   *         description: Profile updated
   */
  .put(protect, clientPhotoUpload);
module.exports.clientRoutes = routers;
