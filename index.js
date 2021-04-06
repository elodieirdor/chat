const express = require('express');
const fs = require('fs');
const app = express();
const https = require('https').createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app);
// create a new instance of socket.io
const io = require('socket.io')(https);

const { uniqid, getRandomInt } = require('./utils/string')
const { getMetadataFromUrl } = require('./utils/metadata-url')

app.use(express.static(__dirname + '/public'));
app.use(express.json()) // for parsing application/json

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/info-url', async (req, res) => {
    const response = {};
    const urls = req.body.urls;

    for (let url of urls) {
        response[url] = await getMetadataFromUrl(url);
    }

    res.send(response);
});

// cheatsheet https://socket.io/docs/v4/emit-cheatsheet/
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.join('community');
    socket.join('other');

    socket.on('user joined', (username) => {
        socket.user = { username, image: `https://randomuser.me/api/portraits/women/${getRandomInt()}.jpg`, id: uniqid() };
        socket.broadcast.emit('user joined', { user: socket.user });
    });

    socket.on('chat message', (msg, room) => {
        if (room === undefined) {
            return;
        }
        socket.to(room).emit('chat message', { message: msg, user: socket.user, room });
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('user disconnected');
            io.emit('user left', { user: socket.user });
        }
    });

    socket.on('user typing', (room) => {
        console.log(room);
        socket.to(room).emit('user typing', { user: socket.user, room });
    });

    socket.on('stop typing', (room) => {
        socket.to(room).emit('stop typing', { user: socket.user, room });
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});
