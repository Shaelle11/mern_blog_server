const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const multer = require('multer');

const uploadMiddleware = multer({dest: 'uploads/'});
const fs = require('fs');
const { Module } = require('module');
const app = express();


const salt = bcrypt.genSaltSync(10);
const secret = "ggderrryh"

const corsOptions = {
    origin: ['https://mern-blog-client-azure.vercel.app'], 
   methods: ["POST", "GET"],
   credentials: true// some legacy browsers (IE11, various SmartTVs) choke on 204
  };
  
  app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); 
app.use('/uploads', express.static(__dirname + '/uploads'));


mongoose.connect('mongodb+srv://my_blog:48GWvQYHbT0ETxYL@cluster0.g8ila1e.mongodb.net/test?retryWrites=true&w=majority');

app.post('/register', async (req, res) => {
 const {username, email, password} = req.body;
 try{
    const UserDoc = await User.create({username, email, password:bcrypt.hashSync(password, salt)});
    res.json(UserDoc);
 } catch(e){
    res.status(400).json(e); 
 }
});  

app.post('/login', async (req, res ) => {
    const {username, password} = req.body;
    const UserDoc = await User.findOne({username});
   const passOk = bcrypt.compareSync(password, UserDoc.password);
    if(passOk){
        // loggedin
jwt.sign({username:UserDoc.username, id:UserDoc._id}, secret, {}, (err,token) => {
if (err) throw err;
res.cookie('token', token).json({
    id:UserDoc._id,
    username,
});
});
        // res.json();
    } else {
        res.status(400).json('incorrect email, password')
    }
});

app.get('/profile', (req, res) => {
    const{token} = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        if(err) throw err;
        res.json(info);
    })
})
 app.post('/logout',(req, res) =>{
res.cookie('token', '').json('ok');
 })


 app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
    const {originalname, path} = req.file;
   const parts = originalname.split('.');
    const ext = parts[parts.length-1];
    const newPath = path+ '.'+ext;
    fs.renameSync(path, newPath);


const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if(err) throw err;
const{title, summary, content} = req.body;
const postDoc = await Post.create({
title, 
summary, 
content,
cover: newPath,
author:info.id, 
});  
res.json(postDoc);
 });


});

 app.get('/post', async (req,res) => {
  res.json(await Post.find()
  .populate('author', ['username'])
  .sort({createdAt: -1})
  .limit(20)
  );
 })
 
    app.listen(4000);

module.exports = app;