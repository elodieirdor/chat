const express = require('express');
const fs = require('fs');
const app = express();
const https = require('https').createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app);
// create a new instance of socket.io
const io = require('socket.io')(https);

const { getRandomInt } = require('./utils/string')
const { getMetadataFromUrl } = require('./utils/metadata-url');
const e = require('express');

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
const privateRooms = [];
const groupIdSeparator = '___';

// cheatsheet https://socket.io/docs/v4/emit-cheatsheet/
io.on('connection', (socket) => {
    console.log('user connected');

    socket.join(channels);

    socket.on('user_joined', (username) => {
        socket.user = {
            username,
            image: `https://randomuser.me/api/portraits/lego/${getRandomInt(9)}.jpg`,
            id: socket.id
        };

        socket.emit('welcome', { onlineUsers, channels, user: socket.user });

        onlineUsers = [...onlineUsers, socket.user];

        socket.broadcast.emit('user_joined', { user: socket.user });
    });

    socket.on('message', async (msg, recipient) => {
        if (recipient === undefined) {
            return;
        }

        // this is a private group message, join the room if not already done
        if (recipient.type === 'private_room' && privateRooms.indexOf(recipient.id) === -1) {
            const privateRoomId = recipient.id;
            const socketetIds = privateRoomId.split(groupIdSeparator);

            for (let socketId of socketetIds) {
                const sockets = await io.in(socketId).fetchSockets();
                if (sockets.length === 1) {
                    sockets[0].join(privateRoomId);
                }
            }
            privateRooms.push(privateRoomId);
        }

        const date = new Date();
        const timeStr = `${date.getHours()}:${date.getMinutes()}`;
        const message = { content: msg, time: timeStr };

        if (recipient.type === "channel" || recipient.type === "private_room") {
            socket.to(recipient.id).emit('message', {
                message,
                user: socket.user,
                room: recipient,
            });
            return;
        }

        if (recipient.type === "user") {
            io.to(recipient.id).emit("private_message", {
                message,
                user: socket.user,
            });
            return;
        }

        console.error(`Message from recipient ${recipient.type} not handled`);
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('user disconnected');
            onlineUsers = onlineUsers.filter(_user => socket.user.id !== _user.id);
            io.emit('user_left', { user: socket.user });
        }
        socket.disconnect(true);
    });

    socket.on('typing', (room) => {
        if (room.type === "channel") {
            socket.to(room.id).emit('typing', { user: socket.user, room });
        } else {
            const _targetRoom = { ...room, ...{ id: socket.user.id } };
            io.to(room.id).emit('typing', { user: socket.user, room: _targetRoom });
        }
    });

    socket.on('stop_typing', (room) => {
        if (room.type === "channel") {
            socket.to(room.id).emit('stop_typing', { user: socket.user, room });
        } else {
            const _targetRoom = { ...room, ...{ id: socket.user.id } };
            io.to(room.id).emit('stop_typing', { user: socket.user, room: _targetRoom });
        }
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});
