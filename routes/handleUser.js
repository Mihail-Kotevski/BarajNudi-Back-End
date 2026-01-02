import express from "express";
const HandleUser = express.Router();

//MongoDB user model
import User from "../models/Users.js";
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
    return res.status(422).json({error: "Password must be at least 6 characters!"});
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
            dateOfBirth
          });
          user.save().then((user) => {
            res.status(201).json({status:"Success!",message: "User created successfully!"}).catch((err) => {
              console.log(err)
              res.json({
                status:"Failed!",
                message:"An error occurred while creating user!"
              })
            });
      }).catch((err) => {
        res.json({
          status:"Failed!",
          message:"An error occurred while hashing password!"
        })
      })
  }).catch((err) => {
    console.log(err)
    res.json({
      status:"Failed!",
      message:"An error occurred while checking if user exists!"
    })
      })
    }
  })
  }       
});

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
        if(data.length){
          //User found
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
      })}else{
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

export default HandleUser;