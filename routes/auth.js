const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../config/keys');
const requireLogin = require('../middleware/requireLogin');

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
                res.json({
                    "message" : "saved successfully"
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

module.exports = router;