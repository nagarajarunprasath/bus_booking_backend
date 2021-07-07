const bcrypt = require('bcryptjs');
const crypto=require("crypto");
const jwt = require("jsonwebtoken");
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
        const salt = 10;
        const hashedPass = await bcrypt.hash(`${Password}`, salt);
        const query = `INSERT INTO booking.clients(clientid,firstname,lastname,email_or_telephone,gender,password,confirmationCode) VALUES('${id}','${Firstname}','${Lastname}','${Email_or_telephone}','${Gender}','${hashedPass}','${confirmationCode}')`;
        client.query(`${query}`, (error, result) => {
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
                    sendEmail({
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
        console.log(confirmationCode);
        client.query(`SELECT * FROM booking.clients WHERE confirmationcode='${confirmationCode}'`, (error, result) => {
            if (error) {
                console.log(error);
            } else if (result.rows.length == 0) {
                return res.status(400).json(`no account found with: ${confirmationCode}`);
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
    } catch (error) {
        console.log(error);
    }

}
exports.forgotPassword=async(req,res,next)=>{
    const {Email_or_telephone}=req.body;
    try {
        const user = await client.query(`select * from booking.clients where email_or_telephone='${Email_or_telephone}'`)
        if (user.rows.length < 1) {
            return res.json({ success: false, message: "No user with such Email" });
        }
        let resetToken = crypto.randomBytes(20).toString("hex");
        let resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        let resetPasswordExpire = Date.now() + 10 * (60 * 1000);
        client.query(`UPDATE booking.clients set resetpasswordexpires='${resetPasswordExpire}'where email_or_telephone='${Email_or_telephone}'`);
        const resetUrl = `https://bookinga.netlify.app/pwdreset/?txy=${resetToken}`;
        const message=`
        <h2>you have requested to reset your password</h2>
        <h4>Go to this link to reset your password</h4>
        <a href=${resetUrl}>${resetUrl}</a>
        `
        try {
            await sendEmail({
                to:Email_or_telephone,
                subject:"password reset token",
                message
            })
            res.json({success:true,message:"visit your E-mail to resetPassword"}).status(200)
            client.query(`UPDATE booking.clients set resetpasswordexpires=${null},resetpasswordtoken=${null}`);
        } catch (error) {
            console.log(error);
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
        client.query(`UPDATE booking.clients set resetpasswordexpires=${null},resetpasswordtoken=${null}`);
    }
}