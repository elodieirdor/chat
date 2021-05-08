const { getRandomInt } = require('./string');

class AppSockets {
    constructor() {
        this.onlineUsers = [];
        this.channels = ['community', 'other'];
        this.privateRooms = [];
        this.groupIdSeparator = '___';
    }

    connection(socket) {
        console.log('user connected');

        socket.join(this.channels);

        socket.on('user_joined', (username) => {
            socket.user = {
                username,
                image: `https://randomuser.me/api/portraits/lego/${getRandomInt(9)}.jpg`,
                id: socket.id
            };

            socket.emit('welcome', {
                onlineUsers: this.onlineUsers,
                channels: this.channels,
                user: socket.user
            });

            console.log(this.onlineUsers);
            this.onlineUsers = [...this.onlineUsers, socket.user];

            socket.broadcast.emit('user_joined', { user: socket.user });
        });

        socket.on('message', async (msg, recipient) => {
            if (recipient === undefined) {
                return;
            }

            // this is a private group message, join the room if not already done
            if (recipient.type === 'private_room' && this.privateRooms.indexOf(recipient.id) === -1) {
                const privateRoomId = recipient.id;
                const socketetIds = privateRoomId.split(this.groupIdSeparator);

                for (let socketId of socketetIds) {
                    const sockets = await global.io.in(socketId).fetchSockets();
                    if (sockets.length === 1) {
                        sockets[0].join(privateRoomId);
                    }
                }
                this.privateRooms.push(privateRoomId);
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
                global.io.to(recipient.id).emit("private_message", {
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
                this.onlineUsers = this.onlineUsers.filter(_user => socket.user.id !== _user.id);
                global.io.emit('user_left', { user: socket.user });
            }
            socket.disconnect(true);
        });

        socket.on('typing', (room) => {
            if (room.type === "channel") {
                socket.to(room.id).emit('typing', { user: socket.user, room });
            } else {
                const _targetRoom = { ...room, ...{ id: socket.user.id } };
                global.io.to(room.id).emit('typing', { user: socket.user, room: _targetRoom });
            }
        });

        socket.on('stop_typing', (room) => {
            if (room.type === "channel") {
                socket.to(room.id).emit('stop_typing', { user: socket.user, room });
            } else {
                const _targetRoom = { ...room, ...{ id: socket.user.id } };
                global.io.to(room.id).emit('stop_typing', { user: socket.user, room: _targetRoom });
            }
        });
    }
}

module.exports = new AppSockets();
