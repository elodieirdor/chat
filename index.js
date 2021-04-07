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

let onlineUsers = [];
const channels = ['community', 'other'];

// cheatsheet https://socket.io/docs/v4/emit-cheatsheet/
io.on('connection', (socket) => {
    console.log('a user connected');

    channels.map(channel => socket.join(channel));

    socket.on('user joined', (username) => {
        socket.emit('welcome', { onlineUsers, channels });

        socket.user = {
            username,
            image: `https://randomuser.me/api/portraits/lego/${getRandomInt(9)}.jpg`,
            id: socket.id
        };
        onlineUsers = [...onlineUsers, socket.user];

        socket.broadcast.emit('user joined', { user: socket.user });
    });

    socket.on('message', (msg, recipient) => {
        if (recipient === undefined) {
            return;
        }

        const date = new Date();
        const timeStr = `${date.getHours()}:${date.getMinutes()}`;
        const message = { content: msg, time: timeStr };
        if (recipient.type === "channel") {
            socket.to(recipient.id).emit('message', {
                message,
                user: socket.user,
                room: recipient,
            });
        } else {
            io.to(recipient.id).emit("private_message", {
                message,
                user: socket.user,
            });
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('user disconnected');
            onlineUsers = onlineUsers.filter(_user => socket.user.id !== _user.id);
            io.emit('user left', { user: socket.user });
        }
    });

    socket.on('user typing', (room) => {
        socket.to(room).emit('user typing', { user: socket.user, room });
    });

    socket.on('stop typing', (room) => {
        socket.to(room).emit('stop typing', { user: socket.user, room });
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});
