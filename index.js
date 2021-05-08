const express = require('express');
const fs = require('fs');
const app = express();
const https = require('https').createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app);
const AppSockets = require('./utils/AppSockets');

// routes
const infoUrlRouter = require('./routes/infoUrl')
const homeRouter = require('./routes/home')

app.use(express.static(__dirname + '/public'));

/** for parsing application/json */
app.use(express.json())
app.use("/", homeRouter);
app.use("/info-url", infoUrlRouter);
/** catch 404 and forward to error handler */
app.use('*', (req, res) => {
    return res.status(404).json({
        success: false,
        message: 'API endpoint doesnt exist'
    });
});

global.io = require('socket.io')(https);
global.io.on('connection', (socket) => AppSockets.connection(socket));

https.listen(3000, () => {
    console.log('listening on *:3000');
});
