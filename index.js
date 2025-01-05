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
  // const count = await UserData.find().count();
  const userData = new UserData({
    username: postUserName,
    // count: count
  })

  const createAndSaveDocument = async (postUserName) => {
    // find user in DB
    const isUserExist = await UserData.findOne({ username: postUserName });
    // if user doesn't exist then insert new
    if (isUserExist == null) {
      try {
        console.log("Inserting new User into database: " + postUserName);
        userData.save();
        const username = userData.username;
        const _id = userData._id;
        const description = userData.description;
        const duration = userData.duration;
        const date = userData.date;
        // return respons as object with data
        return res.json({ username, _id, description, duration, date });
      } catch (error) {
        console.log(error.message);
      }
      // if user is exist then show a console log
    } else {
      console.log("User is already exist in database");
      return res.json({ "user": "User is alredy exist in DB" });
    }
  }

  createAndSaveDocument(postUserName);
})
  // get a list of all users. Returns an array.
  .get("/api/users", async (req, res) => {
    const users = await UserData.find();
    res.json(users);
  })

// EXERCISES
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

        // const count = await UserData.find().count();
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

      // if id does not exist then show a message
    } else {
      // return res.json({ "error": "Requested ID does NOT exist in database" })
      res.send("Requested ID does NOT exist in database")
    }
  }

  updateExerciseById(postUserId);
})
  // GET exercise by id for debugging
  // USAGE: http://localhost:3000/api/users/6474f9d7c18749bfc4d1e4ed/exercise
  // OUTPUT: {"username":"fcc_test_16854847331","description":"no no ","duration":2,"date":"Mon Feb 24 2020","_id":"647674bf90da111069d61c2f"}
  .get("/api/users/:_id/exercises", async (req, res) => {
    const userId = req.params._id;

    const findUsernameById = await UserData.findById({ "_id": userId });
    const username = findUsernameById.username;
    const description = findUsernameById.log[findUsernameById.log.length - 1].description;
    const duration = findUsernameById.log[findUsernameById.log.length - 1].duration;
    const date = findUsernameById.log[findUsernameById.log.length - 1].date;
    res.json({ username, description, duration, date, _id: userId });
  })
  // GET user by id for debugging
  // USAGE: http://localhost:3000/api/users/6474f9d7c18749bfc4d1e4ed
  // OUTPUT: {"username":"fcc_test_16854847331","description":"no no ","duration":2,"date":"Mon Feb 24 2020","_id":"647674bf90da111069d61c2f"}
  .get("/api/users/:_id", async (req, res) => {
    const userId = req.params._id;
    console.log("\"GET ./api/users/:_id\"");

    // find user by ID if exist
    const findUsernameById = await UserData.findById({ "_id": userId });
    console.log("\"User Data from DB found by id: " + findUsernameById.username + " " + findUsernameById._id + " " + findUsernameById.description + " " + findUsernameById.duration + " " + findUsernameById.date + "\"");
    const username = findUsernameById.username;
    const description = findUsernameById.log[findUsernameById.log.length - 1].description;
    const duration = findUsernameById.log[findUsernameById.log.length - 1].duration;
    const date = findUsernameById.log[findUsernameById.log.length - 1].date;
    res.json({ username, description, duration, date, _id: userId });
    console.log("\"duration is a: " + typeof findUsernameById.log.duration + "\"")
  })

// LOGS AND FILTERS
app.get("/api/users/:_id/logs", async (req, res) => {
  let from = new Date(req.query.from).getTime();
  let to = new Date(req.query.to).getTime();
  const limit = req.query.limit;

  const userData = await UserData.findById(req.params._id);
  // DEBUG
  // console.log({log: userData.log[userData.log.length - 1].date});
  // console.log("Date from log: "+userData.log[userData.log.length - 1].date);
  // if (Array.isArray(userData.log)) {
  // console.log(userData.log[0].date)
  //   console.log(Array.from(userData.log)) // array from log
  // }

  if (req.query.from || req.query.to) {
    userData.log = userData.log.filter((session) => {
      let sessionDate = new Date(session.date).getTime();
      return sessionDate >= from && sessionDate <= to;
    });
  }
  // DEBUG
  // console.log(userData.log.data)
  // console.log(userData.log)
  // console.log(req.query)
  // console.log(req.params._id)

  // res.send(from)
  res.json({
    username: userData.username,
    count: userData.log.length,
    _id: req.params._id,
    log: (userData.log).slice(0, limit)
  });
})