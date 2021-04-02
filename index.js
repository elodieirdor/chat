const express = require('express');
const fs = require('fs');
const app = express();
const https = require('https').createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app);
// create a new instance of socket.io
const io = require('socket.io')(https);
const axios = require('axios');
const HTMLParser = require('node-html-parser');

const getRandomInt = (max = 99) => {
    return Math.floor(Math.random() * max);
}

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/info-url', async (req, res) => {
    const content = {type: 'html', title: null, image: null};
    
    // TODO clean this
    console.log(req.query.url);
    try {
        const response = await axios.get(req.query.url);
        const isImage = response.headers['content-type'].indexOf('image') != -1;
        if (isImage) {
            content.type = 'img';
        } else {
            var root = HTMLParser.parse(response.data);
            
            // title
            var metaTitle = root.querySelector('meta[property="og:title"]');
            if (metaTitle) {
                content.title = metaTitle.getAttribute('content');
            } else {
                metaTitle = root.querySelector('title');
                if (metaTitle) {
                    content.title = metaTitle.text;
                }
            }

            // image 
            var metaImage = root.querySelector('meta[property="og:image"]');
            if (metaImage) {
                content.image = metaImage.getAttribute('content');
            }
        }
    } catch (error) {
        console.log(error);
    }

    res.send(content);
});

// io.emit to send a message to all connected clients
// socket.broadcast.emit to send a message to all connected clients except the sender

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('user joined', (username) => {
        socket.user = {username, image: `https://randomuser.me/api/portraits/women/${getRandomInt()}.jpg`};
        socket.broadcast.emit('user joined', { user: socket.user });
    });

    socket.on('chat message', (msg) => {
        socket.broadcast.emit('chat message', { message: msg, user: socket.user });
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('user disconnected');
            io.emit('user left', { user: socket.user });    
        }
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});