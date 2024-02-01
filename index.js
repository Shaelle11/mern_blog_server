const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const blob = require('@vercel/blob');
const { put } = blob;
const fs = require('fs/promises'); // Using fs.promises for async file operations

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = "ggderrryh";
const allowedOrigins = [
  'https://mern-blog-client-3hixtvrc7-the-shaelles-projects.vercel.app',
  'https://mern-blog-client-azure.vercel.app',
  'http://localhost:3000'
];
const corsOptions = {
  origin: allowedOrigins,
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect('mongodb+srv://my_blog:48GWvQYHbT0ETxYL@cluster0.g8ila1e.mongodb.net/test?retryWrites=true&w=majority');

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userDoc = await User.create({ username, email, password: bcrypt.hashSync(password, salt) });
    res.json(userDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({ username: userDoc.username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('Incorrect email or password');
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('OK');
});


app.post('/post', multer({ dest: 'uploads/' }).single('file'), async (req, res) => {
  try {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;

    await fs.rename(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;

      const { title, summary, content } = req.body;

      // Store the file using @vercel/blob
      const fileBuffer = await fs.readFile(newPath);
      const blobResponse = await put(fileBuffer, { contentType: `image/${ext}` });

      // Remove the local file after storing in blob
      await fs.unlink(newPath);

      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: { url: blobResponse.url }, // Set the cover property with the blob URL
        author: info.id,
      });

      res.json(postDoc);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/post', async (req, res) => {
  res.json(await Post.find()
    .populate('author', ['username'])
    .sort({ createdAt: -1 })
    .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
});

const port = 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
