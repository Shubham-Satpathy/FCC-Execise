require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
// Set up mongoose
const mongoose = require('mongoose');
// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
// To handle POST
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const bodyParser = require('body-parser');

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
})

// Connect to database
mongoose.connect(process.env.MONGO_URI);

// Create a Model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: String
  },
  count: {
    type: Number
  },
  log: {
    type: [],
  }
});

const UserData = mongoose.model('UserData', userSchema);

// USERS
app.post("/api/users", async (req, res) => {
  const postUserName = req.body.username;
  const userData = new UserData({
    username: postUserName,

  })

  const createAndSaveDocument = async (postUserName) => {

    const isUserExist = await UserData.findOne({ username: postUserName });
    if (isUserExist == null) {
      try {
        console.log("Inserting new User into database: " + postUserName);
        userData.save();
        const username = userData.username;
        const _id = userData._id;
        const description = userData.description;
        const duration = userData.duration;
        const date = userData.date;

        return res.json({ username, _id, description, duration, date });
      } catch (error) {
        console.log(error.message);
      }
    } else {
      console.log("User is already exist in database");
      return res.json({ "user": "User is alredy exist in DB" });
    }
  }

  createAndSaveDocument(postUserName);
})
  .get("/api/users", async (req, res) => {
    const users = await UserData.find();
    res.json(users);
  })

app.post("/api/users/:_id/exercises", async (req, res) => {
  const postUserId = req.params._id;

  const findExerciseById = await UserData.findById({ _id: postUserId });
  const updateExerciseById = async (postUserId) => {
    if (findExerciseById != null) {

      if (
        req.body.description === "" ||
        req.body.duration === "" ||
        req.body.userId === ""
      ) {
        res.send("please enter required fields")
      }

      if (req.body.date === "" || req.body.date === null) {
        req.body.date = new Date().toDateString();
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) {
          res.send('Incorrect date format')
        }
      }

      if (isNaN(req.body.duration)) {
        res.send("Duration should be a typeOf Number")
      }

      try {
        console.log("User Data from DB: " +
          findExerciseById.username + " " +
          findExerciseById._id + " " +
          findExerciseById.description + " " +
          findExerciseById.duration + " " +
          findExerciseById.date);
        const duration = parseInt(req.body.duration);

        await findExerciseById.updateOne({
          $push: {
            log: {
              description: req.body.description,
              duration: duration,
              date: (req.body.date) ? new Date(req.body.date).toDateString() : new Date().toDateString(),
            }
          }
        })

        return res.json({
          username: findExerciseById.username,
          description: req.body.description,
          duration: duration,
          date: new Date(req.body.date).toDateString(),
          _id: postUserId,
        });

      } catch (error) {
        console.log(error.message);
      }
    } else {
      res.send("Requested ID does NOT exist in database")
    }
  }

  updateExerciseById(postUserId);
})
  .get("/api/users/:_id/exercises", async (req, res) => {
    const userId = req.params._id;

    const findUsernameById = await UserData.findById({ "_id": userId });
    const username = findUsernameById.username;
    const description = findUsernameById.log[findUsernameById.log.length - 1].description;
    const duration = findUsernameById.log[findUsernameById.log.length - 1].duration;
    const date = findUsernameById.log[findUsernameById.log.length - 1].date;
    res.json({ username, description, duration, date, _id: userId });
  })
  .get("/api/users/:_id", async (req, res) => {
    const userId = req.params._id;
    console.log("\"GET ./api/users/:_id\"");
    const findUsernameById = await UserData.findById({ "_id": userId });
    console.log("\"User Data from DB found by id: " + findUsernameById.username + " " + findUsernameById._id + " " + findUsernameById.description + " " + findUsernameById.duration + " " + findUsernameById.date + "\"");
    const username = findUsernameById.username;
    const description = findUsernameById.log[findUsernameById.log.length - 1].description;
    const duration = findUsernameById.log[findUsernameById.log.length - 1].duration;
    const date = findUsernameById.log[findUsernameById.log.length - 1].date;
    res.json({ username, description, duration, date, _id: userId });
    console.log("\"duration is a: " + typeof findUsernameById.log.duration + "\"")
  })
app.get("/api/users/:_id/logs", async (req, res) => {
  let from = new Date(req.query.from).getTime();
  let to = new Date(req.query.to).getTime();
  const limit = req.query.limit;

  const userData = await UserData.findById(req.params._id);

  if (req.query.from || req.query.to) {
    userData.log = userData.log.filter((session) => {
      let sessionDate = new Date(session.date).getTime();
      return sessionDate >= from && sessionDate <= to;
    });
  }
  res.json({
    username: userData.username,
    count: userData.log.length,
    _id: req.params._id,
    log: (userData.log).slice(0, limit)
  });
})
