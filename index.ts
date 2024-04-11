import express from 'express';
import mongoose, { Schema, Document, Collection, mongo } from 'mongoose';
require('dotenv').config()

const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT
const cors = require('cors')
const cookieParser = require("cookie-parser")

app.use(cors())
app.use(express.json())
app.use(cookieParser())

const uri: string = process.env.MONGODB as string;

const UserSchema = new mongoose.Schema({
    name: String,
    password: String,
    patternMemory: Number
})
const user = mongoose.model("user", UserSchema)


interface User {
  name: string,
  password: string,
  id: string
  patternMemory: number
}

app.post('/register', async (req, res) => {

  try {
    await mongoose.connect(uri)
    const { username, password } = req.body as { username: string, password: string }

    const normalUsername = username.toLowerCase()
    const normalPassword = password.toLowerCase()
    const usernameQuery = { name: normalUsername }
  
    let person: User | null = await user.findOne(usernameQuery)
  
    if (person?.name) {
      res.json({status: "Username taken"})
    } else {
      const newUser = new user({
        name: normalUsername,
        password: normalPassword
      })
      await newUser.save();
  
      res.json({status: "Account created, redirecting...", username: username})
    }
  } catch (e) {
    console.log(e)
  } finally {
    await mongoose.disconnect()
  }


})

app.post('/login', async (req, res) => {
  try {
    await mongoose.connect(uri)

    const { username, password } = req.body as { username: string, password: string }
    
    const normalUsername = username.toLowerCase()
    const normalPassword = password.toLowerCase()
  
    const usernameQuery = {name: normalUsername}
  
    let person: User | null = await user.findOne(usernameQuery)
  
    if (person?.name === normalUsername) {
      if (person?.password === normalPassword) {
        const token = jwt.sign({ username: person?.name }, 'secret_key', { expiresIn: '10h' });
        res.cookie('jwt', token, { httpOnly: true, sameSite: 'none' })
        res.json({ token: token, username: person.name })
      } else {
        res.status(203).json({status: "Incorrect password"})
      }
    } else {
      res.status(203).json({status: "Incorrect username"})
    }
  } catch (e) {
    console.log(e)
  } finally {
    await mongoose.disconnect()
  }

})

app.post('/userscore', async (req, res) => {

  try {
    await mongoose.connect(uri)
    const { gameName } = req.body as { gameName: string }
    let users = await user.find({ [gameName]: { $exists: true } }, { name: 1, [gameName]: 1 })

    const sendUser = (userss: object) => {
      if (userss) {
        res.json(users)
      } else {
        res.json({ status: "Incorrect username" })
      }
    }
    sendUser(users)
  } catch (e) {
    console.log(e)
  } finally {
    await mongoose.disconnect()
  }
});

app.post('/updateHighscore', async (req, res) => {
  try {
    await mongoose.connect(uri)

    const { token, gameName, score } = req.body as { token: string, gameName: string, score: number }

    jwt.verify(token, 'secret_key', async (err: any, decoded: any) => {
      if (err) {
        res.status(203).json({error: "token expired"})
      } else {
        console.log('Decoded token:', decoded);

        const usernameQuery = { name: decoded.username }
        console.log(decoded.username)
        let person = await user.findOne(usernameQuery)

        if (!person) {
          res.status(404).json({status: "user not found"})
        } else {
          (person as any)[gameName] = score
          await person.save()
          res.json({ [gameName]: (person as any)[gameName]})
        }
      }
    });
  } catch (e) {
    console.error(e)
  }
})

app.post('/checkToken', (req, res) => {
  const { token } = req.body as { token: string }

  jwt.verify(token, 'secret_key', (err: any, decoded: any) => {
    if (err) {
      res.status(203).json({error: "token expired"})
    } else {
      console.log('Decoded token:', decoded);
      res.json(decoded)
    }
  });
  
})

app.listen(process.env.PORT || port, () => {
    console.log(`Listening on port ${port}`)
})