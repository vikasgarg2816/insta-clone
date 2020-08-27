const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const crypto = require('crypto')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../config/keys');
const requireLogin = require('../middleware/requireLogin');
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const {SENDGRID_API,EMAIL} = require('../config/keys')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth:{
        api_key : SENDGRID_API
    }
}))

// router.get('/protected',requireLogin,(req,res)=>{
//     res.send("Hello user");
// })

router.post('/signup',(req,res)=>{
    const{name,email,password,pic} = req.body;
    if(!name || !password || !email){
        return res.status(422).json({
            error:"Please fill all the fields"
        });
    }
    User.findOne({email:email})
    .then((savedUser)=>{
        if(savedUser){
            return res.status(422).json({
                "error":"User already exists with this email"
            })
        }

        bcrypt.hash(password,12)
        .then(hashpassword=>{
            const user = new User({
                email,
                password:hashpassword,
                name,
                pic
            });
            user.save()
            .then(user=>{
                transporter.sendMail({
                    to:user.email,
                    from:"noreply201202@gmail.com",
                    subject : "Sign Up successfully",
                    html : "<h1>Welcome to Instagram</h1>"
                })
                res.json({
                    "message" : "Signed Up Successfully"
                })
            })
            .catch(err=>{
                console.log(err);
            })
        })
    })

    .catch(err=>{
        console.log(err);
    })
})

router.post('/signin',(req,res)=>{
    const{email,password} = req.body;
    if(!email || !password){
        return res.status(422).json({
            error:"Please add email or password"
        })
    }
    User.findOne({email:email})
    .then(savedUser=>{
        if(!savedUser){
            res.status(422).json({
                error:"Invalid email or password"
            })
        }
        bcrypt.compare(password,savedUser.password)
        .then(domatch=>{
            if(domatch){
                // res.json({
                //     message:"successfully signed in"
                // })
                const token = jwt.sign({_id:savedUser._id},JWT_SECRET)
                const {_id,name,email,followers,following,pic} = savedUser
                res.json({token,user:{_id,name,email,followers,following,pic}});
            }
            else{
                res.status(422).json({
                    error:"Invalid email or password"
                })
            }
        })
        .catch(err=>{
            console.log(err);
        })
    })

})


router.post('/reset-password',(req,res)=>{
    crypto.randomBytes(32,(err,buffer)=>{
        if(err){
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({email:req.body.email})
        .then(user=>{
            if(!user){
                return res.status(422).json({error:"User doesn't exist with this email"})
            }
            user.resetToken = token
            user.expireToken = Date.now()+3600000
            user.save().then((result)=>{
                transporter.sendMail({
                    to:user.email,
                    from:"noreply201202@gmail.com",
                    subject:"Reset Password",
                    html:`
                    <p>You requested for password reset</p>
                    <h5>Click on this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                    `
                })
                res.json({message:"Check your Email"})
            })
        })
    })
})

router.post('/new-password',(req,res)=>{
    const newPassword =req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again Session Expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedpassword=>{
            user.password = hashedpassword
            user.resetToken = undefined
            user.expireToken = undefined
            user.save().then((savedUser)=>{
                res.json({message:"Password Updated Successfully"})
            })
        })
    }).catch(err=>{
        console.log(err)
    })
})

module.exports = router;