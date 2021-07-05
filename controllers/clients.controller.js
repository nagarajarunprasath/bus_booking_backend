const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const {
    v4: uuidv4
} = require('uuid');
const sendEmail = require("./sendEmail")
const {
    client
} = require('../models/database');
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
    //gereting token
    const verificationToken = await jwt.sign({
        email: req.body.Email_or_telephone
    }, process.env.EMAIL_VERIFICATION_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_LIFE
    })
    const confirmationCode = verificationToken;

    //generating random id
    const id = uuidv4();
    try {
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
        const salt = 10;
        const hashedPass = await bcrypt.hash(`${Password}`, salt);
        const query = `INSERT INTO booking.clients(clientid,firstname,lastname,email_or_telephone,gender,password,confirmationCode) VALUES('${id}','${Firstname}','${Lastname}','${Email_or_telephone}','${Gender}','${hashedPass}','${confirmationCode}')`;
        client.query(`${query}`, async (error, result) => {
            if (error) {
                return res.json("email or telephone  is used");
            } else {
                try {
                    // Step 3 - Email the user a unique verification link
                    const url = `http://localhost:2500/api/v1/client/verify/${verificationToken}`
                    const message = `
        <h1>Email verification</h1>
        <p> Thank you for joining.Please confirm your email by clicking on the following link </p>
        <a href=${url} clicktracking=off>Click here</a>
        `
                    await sendEmail({
                        to: req.body.Email_or_telephone,
                        subject: "Verify account",
                        text: message
                    })
                    return res.status(201).json({
                        success: true,
                        message: "Client registered successfully. Please check your email or telephone"
                    })
                } catch (error) {
                    console.log(error)
                }
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
        client.query(`SELECT * FROM booking.clients WHERE confirmationcode='${confirmationCode}'`, (error, result) => {
            if (error) {
                console.log(error);
            } else if (result.rows.length == 0) {
                return res.status(400).json("no account found");
            } else {
                console.log(result.rows.length);
                client.query(`UPDATE booking.clients set verified=true,confirmationcode=null where confirmationcode='${confirmationCode}'`, (error, result) => {
                    if (error) {
                        console.log(error);
                    }
                });
                return res.json("You can now login");
            }
        })
    } catch (err) {
        console.log(err);
    }

}
exports.forgotPassword=async(req,res,next)=>{
    const {Email_or_telephone}=req.body;
    client.query(`select * from booking.clients where Email_or_telephone=${Email_or_telephone}`,(err,result)=>{
        if(err) console.log(err.message)
        res.json(client)
    })
}