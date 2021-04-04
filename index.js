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
const { exception } = require('console');

const getRandomInt = (max = 99) => {
    return Math.floor(Math.random() * max);
}

const uniqid = (prefix = "", random = false) => {
    const sec = Date.now() * 1000 + Math.random() * 1000;
    const id = sec.toString(16).replace(/\./g, "").padEnd(14, "0");

    return `${prefix}${id}${random ? `.${Math.trunc(Math.random() * 100000000)}`:""}`;
};

app.use(express.static(__dirname + '/public'));
app.use(express.json()) // for parsing application/json

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/info-url', async (req, res) => {
    const response = {};
    var urls = req.body.urls;

    for (let url of urls) {

        var regexUrl = /(http:\/\/|https:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
        if (regexUrl.test(url) === false) {
            throw `${url} is not an url`;
        }
        const content = { type: 'html', title: url, image: null };
        try {
            const metaResponse = await axios.get(url);
            const mediaTypes = ['image', 'audio', 'video'];
            let itemMedia = null;
            for (mediaType of mediaTypes) {
                if (metaResponse.headers['content-type'].indexOf(mediaType) === 0) {
                    itemMedia = mediaType;
                    break;
                }
            }

            if (itemMedia) {
                content.type = itemMedia;
            } else {
                var root = HTMLParser.parse(metaResponse.data);

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
        response[url] = content;
    }

    console.log(response);

    res.send(response);
});

// io.emit to send a message to all connected clients
// socket.broadcast.emit to send a message to all connected clients except the sender

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('user joined', (username) => {
        socket.user = { username, image: `https://randomuser.me/api/portraits/women/${getRandomInt()}.jpg`, id: uniqid() };
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

    socket.on('user typing', () => {
        socket.broadcast.emit('user typing', { user: socket.user });
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', { user: socket.user });
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});
