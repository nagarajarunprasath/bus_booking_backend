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
            return res.json({ success: false, message: "No user with such Email" }).status(404);
        }
        let resetToken = crypto.randomBytes(20).toString("hex");
        let resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        let resetPasswordExpire = Date.now() + 10 * (60 * 1000);
        let update = client.query(`UPDATE booking.clients set resetpasswordtoken='${resetPasswordToken}',resetpasswordexpires=TO_TIMESTAMP('${resetPasswordExpire}') where email_or_telephone='${Email_or_telephone}'`,(err,resp)=>{
            if(err){
                console.log(err.message);
            }
            const resetUrl = `https://bookinga.netlify.app/pwdreset/?txy=${resetToken}`
            const message = `
         <h2>you have requested a password request</h2>
         <h5>follow this link to reset</h5>
         <a href=${resetUrl}>${resetUrl}</a>
         `
            res.json({ success: true, message: "email sent" }).status(200);
            try {
                sendEmail({
                    to: Email_or_telephone,
                    subject: 'reset password Request',
                    text: message
                })
            } catch (error) {
                client.query("update booking.clients set resetpasswordtoken='',resetpasswordexpires=''");
            }
         });
        
        }
         catch(error){
             console.log(error);
         }
}
exports.resetPasssword=async(req,res,next)=>{
    const {password,comfirmpassword}=req.body;
    try {
        const resetPasswordToken=crypto.createHash("sha256").update(req.params.resetToken).digest("hex");
        await client.query(`select * from booking.clients where resetpasswordtoken = '${resetPasswordToken}'`,(err,resp)=>{
            if(resp.rows.length<1){
             res.json({success:false,message:"invalid token"}).status(404);
            }
            else{
                client.query(`update booking.clients set password='${password}',resetpasswordtoken=${null},resetpasswordexpire=${null}`, (err, result) => {
                    if (err) res.json({ success: false, message: err.message }).status(400)
                    return res.json({ success: true, message: "password updated succesfully" }).status(201);
                })
            }
        })
    } catch (error) {
        console.log(error);
    }
}
//@desc delete client
//@routes get /api/v1/auth/client
exports.deleteClient=async(req,res,next)=>{
    try {
        await client.query(`Delete from booking.clients where clientId='${req.params.id}'`, (err, resp) => {
            if (err) {
                console.log(err);
                return res.json({ success: false, message: "unable to delete" }).status(400);
            }
            res.json({ success: true, message: "user deleted succesfully" }).status(200);
        })
    } catch (error) {
        res.json({success:false,message:error.message}).status(400);
    }
}
//@desc update your info
//@routes get /api/v1/auth/client/
//access private
exports.updateClient=async(req,res,next)=>{
    const {
        Firstname,
        Lastname,
        Email_or_telephone,
        Gender,
    } = req.body
    try {
        await client.query(`UPDATE booking.clients set firstname='${Firstname}',lastname='${Lastname}',email_or_telephone='${Email_or_telephone}',Gender='${Gender}' where clientId='${req.params.id}'`,(err,resp)=>{
            if(err){
                return res.json({success:false,message:"Unable to update user"}).status(400);
            }
            res.json({success:true,message:"client updated succesfully!!!"}).status(201)
        })
    } catch (error) {
        res.json({success:false,message:error.message});
    }
}