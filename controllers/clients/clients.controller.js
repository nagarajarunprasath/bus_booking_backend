const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();
const twilio = require('twilio')(process.env.accountSid, process.env.authToken, {
    lazyLoading: true
});
const {
    v4: uuidv4
} = require('uuid');
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
        //generating random id
        const id = uuidv4();
        const {
            Firstname,
            Lastname,
            Telephone,
            Password,
            Gender,
            confirmPassword
        } = req.body
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        if (!Firstname || !Lastname || !Password || !confirmPassword || !Gender || !Telephone) return res.status(400).json("All fieds must be filled");
        if (!Telephone.match(Phonepattern)) return res.json("Invalid telephone number")
        if (Firstname.length < 3 || Lastname.length < 3) return res.status(400).json("Both Firstname and lastname must be at least 3 characters long");
        if (Firstname.length > 30 || Lastname.length > 30) return res.status(400).json("Both Firstname and lastname must be less than 30 characters long");
        if (Password !== confirmPassword) return res.status(400).json("Password must match");
        if (Gender !== 'M' && Gender !== 'F') return res.status(400).json("Gender must be M or F");
        const salt = 10;
        const hashedPass = await bcrypt.hash(`${Password}`, salt);
        const query = `INSERT INTO clients(clientid,firstname,lastname,telephone,gender,password) VALUES('${id}','${Firstname}','${Lastname}','${Telephone}','${Gender}','${hashedPass}')`
        client.query(`${query}`, (error, result) => {
            if (error) {
                return res.status(400).json('Telephone alread exist');
            } else {
                twilio
                    .verify
                    .services(process.env.serviceId)
                    .verifications
                    .create({
                        to: Telephone,
                        channel: 'sms'
                    })
                    .then(() => {
                        return res.status(201).json({
                            success: true,
                            message: `Please help us to know that the phone number provided belongs to you by entering code sent to: ${Telephone}`
                        })
                    })
                    .catch(err => {
                        console.log(err.message);
                        return res.status(500).json({
                            err
                        });
                    })
            }
        })
    } catch (error) {
        console.log(error)
    }
}
//verify phone number after sign up
exports.checkingPhone = async (req, res) => {
    try {
        const {
            phoneNumber,
            code
        } = req.body;
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        if (!phoneNumber || !code) return res.status(400).json({
            message: "Phone number and code are required"
        });
        if (!phoneNumber.match(Phonepattern)) return res.json("invalid telephone number")
        if (code.length !== 6) return res.status(400).json({
            message: "Code must be 6 characters long"
        });
        else {
            twilio
                .verify
                .services(process.env.serviceId)
                .verificationChecks
                .create({
                    to: phoneNumber,
                    code
                })
                .then((data) => {
                    if (data.status == "approved") {
                        client.query(`UPDATE clients set verified=true where telephone='${phoneNumber}'`, (error, result) => {
                            if (error) console.log(error.message)
                        })
                        client.query(`SELECT * FROM clients where telephone='${phoneNumber}'`, async (error, result) => {
                            if (error) console.log(error)
                            else {
                                console.log(result.rows[0].clientid)
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
                                    message: "Registered successfully",
                                    token
                                })
                            }
                        })
                    }
                })
                .catch(err => {
                    console.log(err.message);
                    return res.status(400).json({
                        success: false,
                        message: "incorect code"
                    });
                })
        }
    } catch (error) {
        console.log(error)
    }
}

exports.forgotPassword = async (req, res, next) => {
    const {
        Telephone
    } = req.body;
    try {
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        if (!Telephone) return res.status(400).json("Phone number must be provided");
        if (!Telephone.match(Phonepattern)) return res.status(400).json("Invalid phone number")
        const user = await client.query(`select * from clients where telephone='${Telephone}'`)
        if (user.rows.length < 1) {
            return res.json({
                success: false,
                message: "No user with such  telephone number"
            }).status(404);
        } else {
            twilio
                .verify
                .services(process.env.serviceId)
                .verifications
                .create({
                    to: Telephone,
                    channel: 'sms'
                })
                .then(() => {
                    return res.status(201).json({
                        success: true,
                        message: `Reset password code is sent to ${Telephone}`
                    })
                })
                .catch(err => {
                    console.log(err.message);
                })
        }
    } catch (error) {
        console.log(error);
    }
}
//checking if code provided is valid before pass reset
exports.verifyResetPassCode = (req, res) => {
    const {
        Telephone,
        code
    } = req.body
    if(!code) return res.status(400).json({message:"code is required"})
    const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
    if (!Telephone.match(Phonepattern)) return res.status(400).json("invalid telephone number")
    twilio
        .verify
        .services(process.env.serviceId)
        .verificationChecks
        .create({
            to: Telephone,
            code
        })
        .then((data) => {
            if (data.status === "pending") return res.status(401).json({
                message: "Incorect code"
            })
            else {
                return res.status(200).json({
                    success: true,
                    message: "You are free to reset your password"
                })
            }
        })
        .catch(err => {
            console.log(err.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid code'
            })
        })
}
//resetting password after verifying code
exports.resetPasssword = async (req, res, next) => {
    const {
        password,
        confirmPassword,
        Telephone
    } = req.body;
    try {
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        if (!Telephone) return res.status(400).json({
            message: "First provide phone number and verify it."
        })
        if (!password || !confirmPassword) return res.status(400).json({
            message: "All fields are required"
        })
    if (!Telephone.match(Phonepattern)) return res.status(400).json("invalid telephone number")
        if (password.length < 6) return res.status(400).json({
            message: "Password must be at least 6 characters long"
        })
        if (password !== confirmPassword) return res.status(400).json({
            message: "password must match"
        })
        const salt = 10;
        const hash = await bcrypt.hash(password, salt)
        client.query(`update clients set password='${hash}' where telephone='${Telephone}'`, (err, result) => {
            if (err) return res.status(400).json({
                success: false,
                message: err.message
            })
            return res.json({
                success: true,
                message: "password updated succesfully"
            }).status(201);
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json("Server error")
    }
}
//@desc update your info
//@routes get /api/v1//client/
//access private
exports.updateClient = async (req, res, next) => {
    try {
        //check if client exist or not
        const query = `SELECT * FROM clients where clientid='${req.user[0].clientid}'`;
        client.query(`${query}`, async (err, result) => {
            if (err) console.log(err);
            else if (result.rows.length < 1) return res.status(404).json({
                message: 'User not found'
            });
            else {
                const {
                    Firstname,
                    Lastname,
                    Telephone
                } = req.body
                //validating before updating
                const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
                if (!Telephone.match(Phonepattern)) return res.json("Invalid telephone number")
                if (Firstname.length < 3 || Lastname.length < 3) return res.status(400).json("Both Firstname and lastname must be at least 3 characters long");
                if (Firstname.length > 30 || Lastname.length > 30) return res.status(400).json("Both Firstname and lastname must be less than 30 characters long")
                await client.query(`UPDATE clients set firstname='${Firstname}',lastname='${Lastname}',telephone='${Telephone}' where clientid='${req.user[0].clientid}'`, (err, resp) => {
                    if (err) {
                        console.log(err)
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
            Telephone,
            Password
        } = req.body
        //validating email
        if (!Telephone || !Password) return res.status(401).json({
            success: false,
            message: "Telephone and password are required"
        })
        const Phonepattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
        if (!Telephone.match(Phonepattern)) return res.status(400).json("invalid telephone number")
        //finding if user exists
        client.query(`SELECT * FROM clients where telephone='${Telephone}'`, async (error, result) => {
            if (error) console.log(error.message);
            else if (result.rows.length == 0) return res.status(400).json({
                message: "Incorect phone number"
            });
            //checking if client is verified
            else if (result.rows[0].verified !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Please verify your phone number first"
                })
            } else {
                //comparingPassword
                const passMatch = await bcrypt.compare(Password, result.rows[0].password)
                if (!passMatch) return res.status(401).json({
                    message: "Incorrect password"
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
                        success: true,
                        message: "logged in successfully",
                        token
                    })
                }
            }
        })
    } catch (error) {
        console.log(error)
    }
}
//@desc delete client
//@routes get /api/v1/auth/client
exports.deleteClient = async (req, res, next) => {
    try {
        //checking if user with this id exist
        const query = `SELECT * FROM clients where clientid='${req.user[0].clientid}'`;
        client.query(`${query}`, async (err, result) => {
            if (err) console.log(err);
            else if (result.rows.length < 1) return res.status(404).json({
                message: 'User not found'
            });
            else {
                await client.query(`Delete from clients where clientId='${req.user[0].clientid}'`, (err, resp) => {
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
                            success: false,
                            message: `current password is incorrect`
                        })
                    } else {
                        //hashing newPassword
                        const salt = 10;
                        const hash = await bcrypt.hash(newPassword, salt);
                        client.query(`UPDATE clients set password='${hash}' WHERE clientid='${req.user[0].clientid}'`, (error, result) => {
                            if (error) console.log(error.message)
                            return res.status(200).json({
                                success: true,
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
                    if (!req.files) return res.status(400).send({
                        message: "Please upload a photo"
                    });
                    else {
                        const file = req.files.photo;
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