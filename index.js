const app = require('express')();
const http = require('http').createServer(app);
// create a new instance of socket.io
const io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('user joined', (username) => {
        socket.username = username;
        io.emit('user joined', { username });
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', { message: msg, username: socket.username });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        io.emit('user left', { username: socket.username });
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});