const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const twilio = require('twilio')(process.env.accountSid, process.env.authToken);
const {
    v4: uuidv4
} = require('uuid');
const sendEmail = require("../sendEmail")
const {
    client
} = require('../../models/database');
exports.gettingClients = (req, res) => {
    try {
        client.query('SELECT * FROM clients', (err, result) => {
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
            Email,
            phoneNumber,
            Password,
            Gender,
            confirmPassword
        } = req.body
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        const Emailpattern = /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/
        if (!Email && !phoneNumber) return res.status(400).json("Email or phone number must be provided");
        if (Email && !Email.match(Emailpattern)) return res.status(400).json("invalid email address")
        if (phoneNumber && !phoneNumber.match(Phonepattern)) return res.json("invalid telephone number")
        if (!Firstname || !Lastname || !Password || !confirmPassword || !Gender) return res.status(400).json("All fields are required");
        if (Firstname.length < 3 || Lastname.length < 3) return res.status(400).json("Both Firstname and lastname must be at least 3 characters long");
        if (Firstname.length > 30 || Lastname.length > 30) return res.status(400).json("Both Firstname and lastname must be less than 30 characters long");
        if (Password !== confirmPassword) return res.status(400).json("Password must match");
        if (Gender !== 'M' && Gender !== 'F') return res.status(400).json("Gender must be M or F");
        const salt = 10;
        const hashedPass = await bcrypt.hash(`${Password}`, salt);
        if ((Email && !phoneNumber) || (Email && phoneNumber)) {
            const query = `INSERT INTO clients(clientid,firstname,lastname,email,telephone,gender,password,confirmationcode) VALUES('${id}','${Firstname}','${Lastname}','${Email}','${phoneNumber}','${Gender}','${hashedPass}','${confirmationCode}')`;
            client.query(`${query}`, (error, result) => {
                if (error) {
                    return res.json("Email or telephone  is used");
                } else {
                    //
                    try {
                        // Step 3 - Email the user a unique verification link
                        const url = `https://bookinga.herokuapp.com/api/v1/client/verify/${verificationToken}`
                        const message = `
        <h1>Email verification</h1>
        <p> Thank you for joining.Please confirm your email by clicking on the following link </p>
        <a href=${url} clicktracking=off>Click here</a>
        `
                        sendEmail({
                            to: Email,
                            subject: "Verify account",
                            text: message
                        })
                        return res.status(201).json({
                            success: true,
                            message: `Verification link is sent to ${Email}`
                        })
                    } catch (error) {
                        console.log(error)
                    }
                    //
                }
            })
        } else {
            const query = `INSERT INTO clients(clientid,firstname,lastname,telephone,gender,password) VALUES('${id}','${Firstname}','${Lastname}','${phoneNumber}','${Gender}','${hashedPass}')`
            client.query(`${query}`, (error, result) => {
                if (error) {
                    return res.status(400).json('Telephone is used');
                } else {
                        twilio
                            .verify
                            .services(process.env.serviceID)
                            .verifications
                            .create({
                                to: phoneNumber,
                                channel: 'sms'
                            })
                            .then(() => {
                                return res.status(201).json({
                                    success: true,
                                    message: `Verification code is sent to ${phoneNumber}`
                                })
                            })
                            .catch(err => {
                                console.log(err.message);
                            })
                    }
            })
        }
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
        // console.log(confirmationCode);
        client.query(`SELECT * FROM clients WHERE confirmationcode='${confirmationCode}'`, (error, result) => {
            if (error) {
                console.log(error);
            } else if (result.rows.length == 0) {
                console.log(result.rows.length)
                return res.status(400).json(`no account found with: ${confirmationCode}`);
            } else {
                client.query(`UPDATE clients set verified=true,confirmationcode=null where confirmationcode='${confirmationCode}'`, (error, result) => {
                    if (error) {
                        console.log(error);
                    }
                    return res.status(200).redirect("https://bookinga.netlify.app/dashboard/bus");
                });
            }
        })
    } catch (error) {
        console.log(error);
    }

}
//verify phone if is used
exports.checkingPhone = async (req, res) => {
    const {
        phoneNumber,
        code
    } = req.body;
    const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
    if (!phoneNumber || !code) return res.status(400).json({
        message: "number and code are required"
    });
    if (!phoneNumber.match(Phonepattern)) return res.json("invalid email address or telephone")
    if (code.length !== 6) return res.status(400).json({
        message: "Code must be 6 characters long"
    });
    else {
        twilio
            .verify
            .services(process.env.serviceId)
            .verificationChecks
            .create({
                to: req.body.phoneNumber,
                code: req.body.code
            })
            .then(() => {
                client.query(`UPDATE clients set verified=true where telephone='${phoneNumber}'`, (error, result) => {
                    if (error) console.log(error.message)
                })
                return res.status(200).json({
                    message: "You can now login"
                })
            })
            .catch(err => {
                console.log(err.message);
                return res.status(400).json({
                    message: "Invalid code"
                });
            })
    }
}
exports.forgotPassword = async (req, res, next) => {
    const {
        Email_or_telephone
    } = req.body;
    try {
        const user = await client.query(`select * from clients where email_or_telephone='${Email_or_telephone}'`)
        if (user.rows.length < 1) {
            return res.json({
                success: false,
                message: "No user with such Email"
            }).status(404);
        }
        let resetToken = crypto.randomBytes(20).toString("hex");
        let resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        let resetPasswordExpire = Date.now() + 10 * (60 * 1000);
        let update = client.query(`UPDATE clients set resetpasswordtoken='${resetPasswordToken}',resetpasswordexpires=TO_TIMESTAMP('${resetPasswordExpire}') where email_or_telephone='${Email_or_telephone}'`, (err, resp) => {
            if (err) {
                console.log(err.message);
            }
            const resetUrl = `https://bookinga.netlify.app/pwdreset/?txy=${resetToken}`
            const message = `
         <h2>you have requested a password request</h2>
         <h5>follow this link to reset</h5>
         <a href=${resetUrl}>${resetUrl}</a>
         `
            res.json({
                success: true,
                message: "email sent"
            }).status(200);
            try {
                sendEmail({
                    to: Email_or_telephone,
                    subject: 'reset password Request',
                    text: message
                })
            } catch (error) {
                client.query("update clients set resetpasswordtoken='',resetpasswordexpires=''");
            }
        });

    } catch (error) {
        console.log(error);
    }
}
exports.resetPasssword = async (req, res, next) => {
    const {
        password,
        confirmPassword
    } = req.body;
    try {
        if (!password || !confirmPassword) return res.status(400).json({
            message: "All fields are required"
        })
        if (password.length < 6) return res.status(400).json({
            message: "Password must be at least 6 characters long"
        })
        if (password !== confirmPassword) return res.status(400).json({
            message: "password must match"
        })
        const resetPasswordToken = crypto.createHash("sha256").update(req.params.resetToken).digest("hex");
        const salt = 10;
        const hash = await bcrypt.hash(password, salt)
        await client.query(`select * from clients where resetpasswordtoken = '${resetPasswordToken}'`, (err, resp) => {
            if (resp.rows.length < 1) {
                res.json({
                    success: false,
                    message: "invalid token"
                }).status(404);
            } else {
                client.query(`update clients set password='${hash}',resetpasswordtoken=${null},resetpasswordexpires=${null}`, (err, result) => {
                    if (err) return res.json({
                        success: false,
                        message: err.message
                    }).status(400)
                    return res.json({
                        success: true,
                        message: "password updated succesfully"
                    }).status(201);
                })
            }
        })
    } catch (error) {
        console.log(error);
    }
}
//@desc delete client
//@routes get /api/v1/auth/client
exports.deleteClient = async (req, res, next) => {
    try {
        //checking if user with this id exist
        const query = `SELECT * FROM clients where clientid='${req.params.id}'`;
        client.query(`${query}`, async (err, result) => {
            if (err) console.log(err);
            else if (result.rows.length < 1) return res.status(404).json({
                message: 'User not found'
            });
            else {

                await client.query(`Delete from clients where clientId='${req.params.id}'`, (err, resp) => {
                    if (err) {
                        console.log(err);
                        return res.json({
                            success: false,
                            message: "unable to delete"
                        }).status(400);
                    }
                    res.json({
                        success: true,
                        message: "user deleted succesfully"
                    }).status(200);
                })
            }
        })
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        }).status(400);
    }
}
//@desc update your info
//@routes get /api/v1/auth/client/
//access private
exports.updateClient = async (req, res, next) => {
    try {
        //check if client exist or not
        const query = `SELECT * FROM clients where clientid='${req.params.id}'`;
        client.query(`${query}`, async (err, result) => {
            if (err) console.log(err);
            else if (result.rows.length < 1) return res.status(404).json({
                message: 'User not found'
            });
            else {
                const {
                    Firstname,
                    Lastname,
                    Email_or_telephone,
                    Gender,
                } = req.body
                //validating before updating
                const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
                const Emailpattern = /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/
                if (!Email_or_telephone.match(Emailpattern) && !Email_or_telephone.match(Phonepattern)) return res.json("invalid email address or telephone")
                if (Firstname.length < 3 || Lastname.length < 3) return res.status(400).json("Both Firstname and lastname must be at least 3 characters long");
                if (Firstname.length > 30 || Lastname.length > 30) return res.status(400).json("Both Firstname and lastname must be less than 30 characters long");
                if (Gender !== 'M' && Gender !== 'F') return res.status(400).json("Gender must be M or F");
                await client.query(`UPDATE clients set firstname='${Firstname}',lastname='${Lastname}',email_or_telephone='${Email_or_telephone}',Gender='${Gender}' where clientId='${req.params.id}'`, (err, resp) => {
                    if (err) {
                        return res.json({
                            success: false,
                            message: "Unable to update user"
                        }).status(400);
                    }
                    res.json({
                        success: true,
                        message: "client updated succesfully!"
                    }).status(201)
                })
            }
        })
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
}
exports.loginClient = async (req, res, next) => {
    try {
        const {
            phoneNumber,
            Email,
            Password
        } = req.body
        //validating email
        if (!Email && !phoneNumber) return res.status(401).json({
            message: "Email or telephone is required"
        })
        //finding if user exists
        if (Email) {
            client.query(`SELECT * FROM clients where email='${Email}'`, async (error, result) => {
                if (error) console.log(error.message);
                else if (result.rows.length == 0) return res.status(400).json({
                    message: "invalid email or password"
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
                        message: "invalid email or password"
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
                        // res.status(200).cookie('token', token, options).redirect('https://bookinga.netlify.app/dashboard')
                        res.status(200).cookie('token', token, options).json({
                            message: "logged in successfully"
                        })
                    }
                }
            })
        }
        if (phoneNumber) {
            client.query(`SELECT * FROM clients where telephone='${phoneNumber}'`, async (error, result) => {
                if (error) console.log(error.message);
                else if (result.rows.length == 0) return res.status(400).json({
                    message: "invalid phone number or password"
                });
                //checking if client is verified
                else if (result.rows[0].verified !== true) {
                    return res.status(400).json({
                        message: "Please verify your phone number first"
                    })
                } else {
                    //comparingPassword
                    const passMatch = await bcrypt.compare(Password, result.rows[0].password)
                    if (!passMatch) return res.status(401).json({
                        message: "invalid telephone or password"
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
                        // res.status(200).cookie('token', token, options).redirect('https://bookinga.netlify.app/dashboard')
                        res.status(200).cookie('token', token, options).json({
                            message: "logged in successfully",
                            token
                        })
                    }
                }
            })
        }
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
        client.query(`SELECT * FROM clients where clientid='${req.user[0].clientid}'`, async (error, result) => {
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
                        client.query(`UPDATE clients set password='${hash}' WHERE clientid='${req.user[0].clientid}'`, (error, result) => {
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
        client.query(`SELECT * FROM clients where clientid='${req.user[0].clientid}'`, async (error, result) => {
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
                            client.query(`UPDATE clients SET photo='${file.name}' WHERE clientid='${req.user[0].clientid}'`, (error, result) => {
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