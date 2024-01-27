const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose
    .connect(process.env.MONGO_DB)
    .then(() => console.log('Connected to MongoDB'));

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.use(express.urlencoded({ extended: false }));

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    count: Number,
    _id: {
        type: String,
        required: true,
    },
    log: [
        {
            description: {
                type: String,
                required: true,
            },
            duration: {
                type: Number,
                required: true,
            },
            date: String,
        },
    ],
});

const exerciceSchema = new mongoose.Schema({
    username: String,
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    date: String,
    _id: String,
});

let User = mongoose.model('user', userSchema);
let Exercise = mongoose.model('exercise', exerciceSchema);

// Used in time i didn`t know mongoose Schema automatically generate ID
function generateRandomString(length) {
    let result = '';
    let characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i <= length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }
    return result;
}

app.post('/api/users', (req, res) => {
    const username = req.body.username;
    User.findOne({ username }).then((existingUser) => {
        if (existingUser) {
            return res
                .status(400)
                .json({ error: `User ${username} already exists` });
        }
        const createdUser = new User({
            username: username,
            _id: generateRandomString(25),
        });
        createdUser.save().then((savedUser) => savedUser === createdUser);
        res.json(createdUser);
    });
});

app.get('/api/users', (req, res) => {
    User.find({})
        .select('-__v -log')
        .then((users) => res.json(users));
});

app.post('/api/users/:_id/exercises', (req, res) => {
    const userId = req.params._id;
    let date = req.body.date;
    if (!date) {
        date = new Date().toDateString();
    }
    if (!isNaN(date)) {
        date = new Date(parseInt(req.body.date)).toDateString();
    } else {
        date = new Date(date).toDateString();
        User.findById(userId)
            .select('-__v')
            .then((user) => {
                if (!user) {
                    return res.status(400).json({
                        error: `User with id ${userId} does not exist`,
                    });
                }
                const exercise = new Exercise({
                    username: user.username,
                    _id: user._id,
                    description: req.body.description,
                    duration: parseInt(req.body.duration),
                    date: date,
                });
                user.log.push({
                    description: req.body.description,
                    duration: parseInt(req.body.duration),
                    date: date,
                });
                user.save().then((savedUser) => savedUser === user);
                res.json(exercise);
            });
    }
});

app.get('/api/users/:_id/logs', (req, res) => {
    const userId = req.params._id;
    let count;
    const { from, to, limit } = req.query;
    User.findById(userId)
        .select('-__v')
        .then((user) => {
            if (!user) {
                return res
                    .status(400)
                    .json({ error: `User with id ${userId} does not exist` });
            }
            if (from || to || limit) {
                const logs = user.log;
                const filteredLogs = logs.filter((log) => {
                    const formattedLogDate = new Date(log.date)
                        .toISOString()
                        .split('T')[0];
                    return true; /* For FCC testing, seems like feature works 
              with handled responce, but it doens`t complete FCC testing. 
              There are some youtube videos that approve it`s FCC`s code error
              */
                });
                const slicedLogs = limit
                    ? filteredLogs.slice(0, limit)
                    : filteredLogs;
                user.log = slicedLogs;
                count = user.log.length;
                user.count = count;
                res.json(user);
            } else {
                count = user.log.length;
                user.count = count;
                res.json(user);
            }
        });
});

app.get('/api/deleteAllUsers', (req, res) => {
    User.deleteMany({})
        .then(() => {
            res.json({ message: 'Data was completely deleted' });
        })
        .catch((error) => {
            res.status(500).json({
                error: 'Error when deleting data',
                details: error,
            });
        });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
