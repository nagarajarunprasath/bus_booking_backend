const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
require('../../middleware/auth')
const {
    v4: uuidv4
} = require('uuid');
const sendEmail = require("../sendEmail")
const {
    client
} = require('../../models/database');
exports.gettingClients = (req, res) => {
    try {
        client.query('SELECT * FROM booking.clients', (err, result) => {
            if (err) console.log(err.message);
            return res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            })
        })
    } catch (error) {
        console.log(error);
    }
}

//registering clients
exports.postingClient = async (req, res) => {
    try {
        //gereting token
        const verificationToken = await jwt.sign({
            email: req.body.Email_or_telephone
        }, process.env.EMAIL_VERIFICATION_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE
        })
        const confirmationCode = verificationToken;

        //generating random id
        const id = uuidv4();
        const {
            Firstname,
            Lastname,
            Email_or_telephone,
            Password,
            Gender,
            confirmPassword
        } = req.body
        if (!Firstname || !Lastname || !Email_or_telephone || !Password || !confirmPassword || !Gender) {
            return res.status(400).json("All fields are required");
        }
        if (Password !== confirmPassword) {
            return res.status(400).json("Password must match");
        }
        //hashingPassword
        const salt = 10;
        const hashedPass = await bcrypt.hash(`${Password}`, salt);
        const query = `INSERT INTO booking.clients(clientid,firstname,lastname,email_or_telephone,gender,password,confirmationCode) VALUES('${id}','${Firstname}','${Lastname}','${Email_or_telephone}','${Gender}','${hashedPass}','${confirmationCode}')`;
        client.query(`${query}`, (error, result) => {
            if (error) {
                return res.json({
                    message: "email or telephone  is used"
                });
            } else {
                // Step 3 - Email the user a unique verification link
                const url = `http://localhost:2500/api/v1/client/verify/${verificationToken}`
                const message = `
        <h1>Email verification</h1>
        <p> Thank you for joining.Please confirm your email by clicking on the following link </p>
        <a href=${url} clicktracking=off>Click here</a>
        `
                sendEmail({
                    to: req.body.Email_or_telephone,
                    subject: "Verify account",
                    text: message
                })
                return res.status(201).json({
                    success: true,
                    message: "Client registered successfully. Please check your email or telephone"
                })
            }
        })
    } catch (error) {
        console.log(error)
    }
}
//@desc verify client
//@routes get /api/v1/auth/client/verify/:confirmationCode
//access public

exports.verifyClient = async (req, res, next) => {
    try {
        const confirmationCode = req.params.verificationToken
        console.log(confirmationCode);
        client.query(`SELECT * FROM booking.clients WHERE confirmationcode='${confirmationCode}'`, (error, result) => {
            if (error) {
                console.log(error);
            } else if (result.rows.length == 0) {
                return res.status(404).json({
                    message: `no account found`
                });
            } else {
                console.log(result.rows.length);
                client.query(`UPDATE booking.clients set verified=true,confirmationcode=null where confirmationcode='${confirmationCode}'`, (error, result) => {
                    if (error) {
                        console.log(error);
                    }
                });
                return res.status(200).redirect('https://bookinga.netlify.app/');
            }
        })
    } catch (error) {
        console.log(error);
    }

}
exports.forgotPassword = async (req, res, next) => {
    const {
        Email_or_telephone
    } = req.body;
    try {
        const user = await client.query(`select * from booking.clients where email_or_telephone='${Email_or_telephone}'`)
        if (user.rows.length < 1) {
            return res.json({
                success: false,
                message: "No user with such Email"
            });
        }
        let resetToken = crypto.randomBytes(20).toString("hex");
        let resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        let resetPasswordExpire = Date.now() + 10 * (60 * 1000);
        client.query(`UPDATE booking.clients set resetpasswordexpires='${resetPasswordExpire}'where email_or_telephone='${Email_or_telephone}'`);
        const resetUrl = `https://bookinga.netlify.app/pwdreset/?txy=${resetToken}`;
        const message = `
        <h2>you have requested to reset your password</h2>
        <h4>Go to this link to reset your password</h4>
        <a href=${resetUrl}>${resetUrl}</a>
        `
        try {
            await sendEmail({
                to: Email_or_telephone,
                subject: "password reset token",
                message
            })
            res.json({
                success: true,
                message: "visit your E-mail to resetPassword"
            }).status(200)
            client.query(`UPDATE booking.clients set resetpasswordexpires=${null},resetpasswordtoken=${null}`);
        } catch (error) {
            console.log(error);
        }
    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
        client.query(`UPDATE booking.clients set resetpasswordexpires=${null},resetpasswordtoken=${null}`);
    }
}

//@desc login client
//@routes POST /api/v1/auth/login
//access public
exports.loginClient = async (req, res, next) => {
    try {
        const {
            Email_or_telephone,
            Password
        } = req.body
        //validating email
        if (!Email_or_telephone || !Password) return res.status(401).json({
            message: "email or telephone and password are required"
        })
        //finding if user exists
        client.query(`SELECT * FROM booking.clients where email_or_telephone='${Email_or_telephone}'`, async (error, result) => {
            if (error) console.log(error.message);
            else if (result.rows.length == 0) return res.status(400).json({
                message: "invalid email/telephone or password"
            });
            //checking if client is verified
            else if (result.rows[0].verified !== true) {
                return res.status(400).json({
                    message: "Please verify your email first"
                })
            } else {
                //comparingPassword
                const passMatch = await bcrypt.compare(Password, result.rows[0].password)
                if (!passMatch) return res.status(401).json({
                    message: "invalid email/telephone or password"
                });
                else {
                    //generating token
                    const token = jwt.sign({
                        id: result.rows[0].clientid
                    }, process.env.JWT_SECRET, {
                        expiresIn: Date.now() + "12h"
                    })
                    const options = {
                        expires: new Date(Date.now() + "12h"),
                        httpOnly: true,
                    };
                    res.status(200).cookie('token', token, options).json({
                        success: true,
                        token: token,
                        message: "logged in successfully"
                    }).redirect('https://bookinga.netlify.app/')
                }
            }
        })
    } catch (error) {
        console.log(error)
    }
}

exports.updatePassword = async (req, res) => {
    // console.log(req.user);
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body
        //checking if user exists
        client.query(`SELECT * FROM booking.clients where clientid='${req.user[0].clientid}'`, async (error, result) => {
            if (error) console.log(error.message);
            else {
                if (result.rows.length == 0) {
                    return res.status(404).json({
                        message: `user with id: ${req.user[0].id} not found`
                    })
                } else {
                    if (newPassword.length < 6) return res.json({
                        message: "password must be at least 6 characters"
                    })
                    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({
                        message: "currrent password, newPassword and confirm password are required"
                    })
                    //checking if new password===confirm password
                    if (newPassword !== confirmPassword) return res.json({
                        message: "new password and confirm password must match"
                    })
                    //checking if current password is correct
                    const passMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
                    if (!passMatch) {
                        return res.status(401).json({
                            message: `current password is incorrect`
                        })
                    } else {
                        //hashing newPassword
                        const salt = 10;
                        const hash = await bcrypt.hash(newPassword, salt);
                        client.query(`UPDATE booking.clients set password='${hash}' WHERE clientid='${req.user[0].clientid}'`, (error, result) => {
                            if (error) console.log(error.message)
                            return res.status(200).json({
                                message: "password updated"
                            })
                        });

                    }
                }
            }
        })

    } catch (error) {
        console.log(error)
    }
}

exports.clientPhotoUpload = async (req, res) => {
    try {
        //checking if user exists
        client.query(`SELECT * FROM booking.clients where clientid='${req.user[0].clientid}'`, async (error, result) => {
            if (error) console.log(error.message);
            else {
                if (result.rows.length == 0) {
                    return res.status(404).json({
                        message: `user with id: ${req.user[0].clientid} not found`
                    })
                } else {
                    console.log(req.files);
                    if (!req.files) return res.status(400).send({
                        message: "Please upload a photo"
                    });
                    else {
                        const file = req.files.file;
                        //make sure that uploaded file is an image
                        if (!file.mimetype.startsWith("image")) return res.status(400).send({
                            message: "please upload an image file"
                        });
                        //checking photo size
                        if (file.size > process.env.MAX_FILE_SIZE) return res.status(400).send({
                            message: `please upload an image less than ${process.env.MAX_FILE_SIZE}`
                        });
                        //customizing image name to avoid overwriting
                        file.name = `photo_${req.user[0].clientid}${path.parse(file.name).ext}`;
                        //moving file
                        file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
                            if (err) {
                                console.log(err);
                                return res.status(400).send({
                                    message: "Problem with image upload"
                                });
                            }
                            client.query(`UPDATE booking.clients SET photo='${file.name}' WHERE clientid='${req.user[0].clientid}'`, (error, result) => {
                                if (error) console.log(error.message)
                                res.status(200).json({
                                    success: true,
                                    data: file.name,
                                    message: "image updated"
                                })
                            });
                        });
                    }
                }
            }
        })
    } catch (error) {
        console.log(error);
    }
}