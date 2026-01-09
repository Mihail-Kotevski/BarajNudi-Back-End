import express, { Router } from "express";
const HandleUser = express.Router();

//MongoDB user model
import User from "../models/Users.js";

//MongoDB user verification model
import UserVerification from "../models/UserVerification.js";

//MongoDB Password reset model
import PasswordReset from "../models/PasswordReset.js";

//Email handler
import nodemailer from "nodemailer";

const mailTransporter=nodemailer.createTransport({
 service:"gmail",
 auth:{
 user:process.env.AUTH_EMAIL,
 pass:process.env.AUTH_PASSWORD
  }
});

//Unique string generator
import { v4 as uuidv4 } from 'uuid';

//env variables
import dotenv from "dotenv";
dotenv.config();

//Password hashing
import bcrypt from "bcryptjs";

// User sign up
HandleUser.post("/signup", async (req, res) => {
  let { name, email, password ,dateOfBirth} = req.body;
  name = name.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if(!name || !email || !password || !dateOfBirth){
    return res.status(422).json({error: "Please fill all the fields!"});
  }else if(!/^[a-zA-Z]+$/.test(name)){
    return res.status(422).json({error: "Please enter a valid name!"});
  }else if(!/^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$/.test(email)){
    return res.status(422).json({error: "Please enter a valid email!!"});
  }else if(password.length < 8){
    return res.status(422).json({error: "Password must be at least 8 characters!"});
  } else if(!new Date(dateOfBirth).getTime()){
    return res.status(422).json({error: "Please enter a valid date of birth!"});
  }else{
    User.find({email}).then((result) => {
      if(result.length){
        return res.status(422).json({error: "User with that email already exists!"});
      }else{
        //Hash password and signup new user
        bcrypt.hash(password, 12).then((hashedPassword) => {
          const user = new User({
            name,
            email,
            password: hashedPassword,
            dateOfBirth,
            verified: false
          });
          user.save().then((data) => {
            sendVerification(data,res);
      }).catch((err) => {
        console.log(err)
        res.json({
          status:"Failed!",
          message:"An error occurred while hashing password!"
        })
      })
  }).catch((error) => {
    console.log(error)
    res.json({
      status:"Failed!",
      message:"An error occurred while checking if user exists!"
    })
      })
    }
  })
  }       
});

//Function to send verification email
const sendVerification=({_id,email},res) =>{
  //url 
  const currentUrl="http://localhost:3000/";
  //Generate unique string
  const uniqueString = uuidv4() + _id;
  //mail transporter
  const mailOptions={
  from:process.env.AUTH_EMAIL,
  to:email,
  subject:"Please verify your email.",
  html: `<p>Click <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}>here</a> to verify your email.</p>`
  }
  //hash the unique string
  bcrypt
  .hash(uniqueString, 10)
  .then((hashedUniqueString) => {
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000,
    })
    newVerification.save()
    .then((data) => {
      mailTransporter.sendMail(mailOptions)
      .then(() => {
        res.json({
          status:"Pending",
          message:"Verification email sent!"
        })
      }).catch((err) => {
        console.log(err)
        res.json({
          status:"Failed!",
          message:"Verification email could not be sent!"
        })
      })
    }).catch((err) => {
      console.log(err)
      res.json({
        status:"Failed!",
        message:"Could not save verification email data!"
      })
    })
}).catch((err) => {
  console.log(err)
  res.json({
    status:"Failed!",
    message:"An error occurred while generating unique string!"
  })
})
};

//verify email
HandleUser.get("/verify/:userId/:uniqueString", (req, res) => {
  let {userId,uniqueString}=req.params
  UserVerification.find({userId}).then((data)=>{
    //Checking if verification id is expired
    if(data.length>0){
      const {expiresAt}=data[0]
      const hashedUniqueString=data[0].uniqueString
      if(expiresAt<Date.now()){
        UserVerification.deleteOne({_id: userId}).then(data=>{
          User.deleteOne({_id:userId}).then((data)=>{
            let message="Link has expired please sign up again!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
          }).catch(error=>{
            console.log(error)
             let message="Clearing user with failed verification string has failed!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
          })
        }).catch(error=>{
          console.log(error)
            let message="An error occured while clearing user verification record!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
        })
      }else{
        //Valid user record
        bcrypt.compare(uniqueString,hashedUniqueString).then((data)=>{
        if(data){ 
          User.updateOne({_id:userId},{verified:true}).then((data)=>{
            UserVerification.deleteOne({userId}).then((data)=>{
              res.json({
                status:"Success!",
                message:"Successful verification"
              })
            }).catch(error=>{
              console.log(error)
              let message="An error occured while finalizing successful user verification!";
              res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
            })
          }).catch(()=>{
            console.log(error)
            let message="An error occured while updating user verification record!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
          })
        }else{
            let message="Invalid verification details passed. Please check your inbox!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
        }
        }).catch(error=>{
          console.log(error)
           let message="An error occured while comparing unique strings!";
            res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
        })
      }
    }else{
      let message="Account does not exist or has been already verified. Please Sign up or log in.";
      res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
    }
  }).catch((error)=>{
    console.log(error)
      let message="An error occurred while checking existing user verification record";
      res.redirect(`/user/verification?error=true&message=${encodeURIComponent(message)}`)
  })
})

//Verified page route
HandleUser.get("/verified",(req,res)=>{
  res.json({
    status:"Success"
  })
})

//User sign in
HandleUser.post("/signin",async(req,res)=>{
  let {email, password} = req.body;
  email = email.trim();
  password = password.trim();

  if(!email || !password){
    return res.status(422).json({status:"Failed!",message:"Please fill all the fields!"})}
    else{
      //Check if user exist
      User.find({email}).then((data)=>{
        if(!data[0].length){
          //User exists

          //Check if user is verified
          if(!data.verified){
            res.status(401).json({
             status:"Failed!",
             message:"Email has not been verified!"
           })
          }else{
            const hashedPassword = data[0].password;
            bcrypt.compare(password, hashedPassword).then(result=>{
              if(result){
                //Password Match
                res.json({
                 status:"Succes!",
                 message:"Signin succesful!",
                 data
           })
            }else{
          //Password does not match
           res.status(401).json({
             status:"Failed!",
             message:"Invalid password!"
           })
         }
         }).catch((err)=>{
        console.log(err)
        res.json({
          status:"Failed!",
          message:"An error occurred while signing in!"
        })
      });
          }
     }else{
        res.status(404).json({
          status:"Failed!",
          message:"Invalid credentials!"
        })
      }
}).catch(err=>{
  res.status(404).json({status:"Failed!",
  message:"An error occurred while checking user existence!",
  error: err.message})
})}});

//Password reset request
HandleUser.post("/requestPasswordReset", async (req, res) => {
  let { email ,redirectUrl} = req.body;

  User.find({email})
  .then((data)=>{
    if(data.length){
      //User exists // Checking if user is verified
      if(!data[0].verified){
        resizeTo.status(401).json({
         status:"Failed!",
         message:"Email has not been verified!"
       })
      }else{
        //Email is verified // Send password reset email
        sendResetEmail(data[0],redirectUrl,res);
      }
    }else{
      res.status(404).json({
        status:"Failed!",
        message:"User with given email does not exist!"
      })
    }
  })
  .catch((err) => {
    console.log(err)
    res.json({
      status:"Failed!",
      message:"An error occurred while checking user existence!"
    })
  })
})

//Function to send password reset email
const sendResetEmail = ({_id,email}, redirectUrl, res) => {
  const resetString= uuidv4() + _id;
  PasswordReset
  //clearing existing password reset records
  .deleteMany({userId: _id})
  .then((data)=>{
    //Handling reset password email
     const mailOptions={
     from:process.env.AUTH_EMAIL,
     to:email,
     subject:"Password reset.",
     html: `<p>Click here to reset your password (Link will expire in 60 minutes) <a href=${redirectUrl + "/" + _id + "/" + resetString}>.</p>`
  }
  bcrypt.hash(resetString, 10)
  .then((hashedResetString) => {
    const newPasswordReset = new PasswordReset({
      userId: _id,
      resetString: hashedResetString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    })
    newPasswordReset
    .save()
    .then((data) => {
      mailTransporter
      .sendMail(mailOptions)
      .then(() => {
        //Password reset email sent
        res.json({
          status:"Pending",
          message:"Password reset email sent!"
        })
      })
      .catch((err) => {
        console.log(err)
        res.json({
          status:"Failed!",
          message:"Password reset email could not be sent!"
        })
      })
})
    })
    .catch((err) => {
      console.log(err)
      res.json({
        status:"Failed!",
        message:"Could not save password reset data!"
      })
    })
  })
  .catch((err) => {
    console.log(err)
    res.json({
      status:"Failed!",
      message:"An error occurred while hashing reset string!"
    })
  })
  .catch(error=>{
    console.log(error)
    res.json({
      status:"Failed!",
      message:"An error occurred while clearing existing password reset records!"
    })
  })
}

//Password reset 
HandleUser.post("/resetPassword", (req, res) => {
  let {userId,resetString,newPassword}=req.body

  PasswordReset.find({userId})
  .then((data)=>{
  if(data.length>0){
    const {expiresAt}=result[0]
    const{hashedResetString}=result[0]
    if (expiresAt<Date.now()){
      PasswordReset.deleteOne(userId)
      .then(()=>{
          res.json({
        status:"Failed!",
        message:"Password reset link has expired!"
    })
      })
      .catch((err)=>{
        console.log(err)
        res.json({
        status:"Failed!",
        message:"Failed to delete password reset request record!"
    })
      })
    }else{
      bcrypt.compare(resetString,hashedResetString)
      .then((data)=>{
        if(data){
          bcrypt.hash(newPassword,10)
          .then((newHashedPassword)=>{
            User.updateOne({_id: userId},{password: newHashedPassword})
            .then((data)=>{
              PasswordReset.deleteOne({userId})
              .then(()=>{
                 res.json({
                  status:"Succes!",
                  message:"Password update succesful!"
                })
              })
              .catch((err)=>{
                  console.log(err)
                  res.json({
                  status:"Failed!",
                  message:"An error occured while deleting password delete request record!"
                })
              })
            })
            .catch((err)=>{
                console.log(err)
            res.json({
            status:"Failed!",
            message:"An error occured while updating the old password!"
              })
            })
          })
          .catch((err)=>{
            console.log(err)
            res.json({
            status:"Failed!",
            message:"An error occured while hasing the new password!"
    })
          })
        }else{
          res.json({
          status:"Failed!",
          message:"Invalid password reset details!"
    })
        }
      })
      .catch((err)=>{
        console.log(err)
        res.json({
        status:"Failed!",
        message:"Comparing password reset strings has failed!"
    })
      })
    }
  }else{
    res.json({
      status:"Failed!",
      message:"Checking for existing password reset record failed!"
    })
  }
  })
  .catch((err)=>{
    console.log(err)
    res.json({
      status:"Failed!",
      message:"An error occurred while checking password reset record!"
    })
  })
})

export default HandleUser;