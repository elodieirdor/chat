const express = require('express');
const app = express();
const http = require('http').createServer(app);
// create a new instance of socket.io
const io = require('socket.io')(http);

const getRandomInt = (max = 99) => {
    return Math.floor(Math.random() * max);
}

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('user joined', (username) => {
        socket.user = {username, image: `https://randomuser.me/api/portraits/women/${getRandomInt()}.jpg`};
        socket.broadcast.emit('user joined', { user: socket.user });
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', { message: msg, user: socket.user });
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('user disconnected');
            io.emit('user left', { user: socket.user });    
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});