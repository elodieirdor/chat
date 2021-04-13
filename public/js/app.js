// enable debug
// localStorage.debug = '*';

var socket = io();

const templateMessage = document.querySelector("#message");
const templateMyMessage = document.querySelector("#my-message");
const templateStatusMessage = document.querySelector("#status-message");
const templateRoomMenuItem = document.querySelector("#room-menu-item");
const templateRoomMessages = document.querySelector("#room-messages");
const templateUserMenuItem = document.querySelector("#user-menu-item");
const templateNotif = document.querySelector("#notif");

const loader = document.getElementById('loader');

const roomsMenuLink = document.getElementById('rooms-list');
const onlineUsersMenuLink = document.getElementById('users-list');
const privateMenuLink = document.getElementById('private-list');

const usernameInput = document.getElementById('username');
usernameInput.focus();

const messageInput = document.getElementById('input');

let isTyping = false;
const TYPING_TIMER_LENGTH = 500;
let typingUsers = [];

let currentRoom = null;

let appOnlineUsers = [];
let privateTalks = [];

const createChannelRoomObject = (roomId) => {
    return { type: 'channel', id: roomId };
};

const createUserRoomObject = (user) => {
    return { type: 'user', id: user.id };
};

const addMessageToList = (messageEl, room) => {
    const messages = document.querySelector(`[data-messages-room="${room.id}"]`);
    messages.appendChild(messageEl);
    messages.scrollTo(0, messages.scrollHeight);
};

const addMyMessage = (message) => {
    const date = new Date();
    const timeStr = `${date.getHours()}:${date.getMinutes()}`;

    const clone = document.importNode(templateMyMessage.content, true);
    clone.querySelector('[data-message]').innerHTML = message;
    clone.querySelector('[data-time]').textContent = timeStr;
    addMessageToList(clone, currentRoom);
};

const addOtherUserMessage = (user, message, room) => {
    var clone = document.importNode(templateMessage.content, true);
    if (room.type === 'user') {
        clone.querySelector('.img-wrapper').remove();
        clone.querySelector('[data-username]').remove();
    } else {
        clone.querySelector('img').setAttribute('src', user.image);
        clone.querySelector('[data-username]').textContent = user.username;
    }
    clone.querySelector('[data-message]').innerHTML = message.content;
    clone.querySelector('[data-time]').textContent = message.time;
    addMessageToList(clone, room);
};

const addUserStatusMessage = (message, room) => {
    const clone = document.importNode(templateStatusMessage.content, true);
    clone.querySelector('[data-message]').textContent = message;
    addMessageToList(clone, room);
};

const updateTypingNotification = (room) => {
    const currentRoomEl = document.querySelector(`#content-wrapper .active`);
    const sentenceEl = currentRoomEl.querySelector('[data-typing="sentence"]');
    if (room.type === 'user') {
        sentenceEl.textContent = " is typing";
        return;
    }

    const userTypingEl = document.querySelector('[data-typing="user"]');
    if (typingUsers.length === 1) {
        userTypingEl.textContent = typingUsers[0].username;
        sentenceEl.textContent = " is typing";

        return;
    }

    if (typingUsers.length > 3) {
        userTypingEl.textContent = `${typingUsers.length} users`;
    } else {
        const _usernames = typingUsers.map(user => user.username);
        userTypingEl.textContent = `${_usernames.join(', ')} `;
    }
    sentenceEl.textContent = " are typing";
}

const addTypingMessage = (user, room) => {
    if (getUserFromList(user.id, typingUsers) !== null) {
        return;
    }

    const currentRoomEl = document.querySelector(`#content-wrapper .active`);
    const typingContainer = currentRoomEl.querySelector('[data-typing-container]');
    if (typingUsers.length === 0) {
        toggleClasses(typingContainer, ['hidden', 'active']);
    }
    typingUsers.push(user);
    updateTypingNotification(room);
};

const removeTypingMessage = (user, room) => {

    const userIndex = typingUsers.findIndex(function (_user) {
        return _user.id === user.id;
    });

    if (userIndex === -1) {
        return;
    }

    typingUsers.splice(userIndex, 1);

    const currentRoomEl = document.querySelector(`#content-wrapper .active`);
    const typingContainer = currentRoomEl.querySelector('[data-typing-container]');
    if (typingUsers.length === 0) {
        toggleClasses(typingContainer, ['hidden', 'active']);
        return;
    }

    if (room) {
        updateTypingNotification(room);
    }
};

const switchToChat = () => {
    // hide login page
    const loginPage = document.getElementById('loginPage');
    toggleClasses(loginPage, ['block', 'hidden']);

    // display chat page
    const chatPage = document.getElementById('chatPage');
    toggleClasses(chatPage, ['block', 'hidden']);

    messageInput.focus();
};

const switchToRoom = (room) => {
    const toBeCurrentRoomItemMenu = document.querySelector(`[data-menu-room="${room.id}"]`);
    const itemsMenuToEdit = [toBeCurrentRoomItemMenu];

    const toBeCurrentRoomPanel = document.querySelector(`[data-room="${room.id}"]`);
    const roomPanelsToEdit = [toBeCurrentRoomPanel];

    if (currentRoom) {
        const currentRoomItemMenu = document.querySelector(`nav .active`);
        itemsMenuToEdit.push(currentRoomItemMenu);

        const currentRoomEl = document.querySelector(`#content-wrapper .active`);
        roomPanelsToEdit.push(currentRoomEl);
    }

    // remove "active" classes on previous items and add them to the room about to be current
    itemsMenuToEdit.map((_roomItem) => {
        toggleClasses(_roomItem, ['font-medium', 'text-yellow-500', 'active']);
    });

    // switch to new room panel
    roomPanelsToEdit.map((_roomEl) => {
        toggleClasses(_roomEl, ['hidden', 'active']);
    });

    // remove notif icon if exist
    const notif = document.querySelector(`[data-notif="${room.id}"]`);
    if (notif) {
        notif.remove();
    }

    typingUsers = [];
    currentRoom = room;
    messageInput.focus();
};

const createMessagesPanel = (room, title, image = null) => {
    var form = document.getElementById('form');
    var contentWrapper = document.getElementById('content-wrapper');

    const cloneRoomPanel = document.importNode(templateRoomMessages.content, true);
    cloneRoomPanel.querySelector('[data-room]').setAttribute('data-room', room.id);
    cloneRoomPanel.querySelector('[data-messages-room]').setAttribute('data-messages-room', room.id);
    cloneRoomPanel.querySelector('[data-title]').textContent = title;

    const img = cloneRoomPanel.querySelector('img');
    if (image) {
        img.setAttribute('src', image);
    } else {
        img.remove();
    }
    contentWrapper.insertBefore(cloneRoomPanel, form);
}

const createChannelRoom = (room) => {
    // Create item for menu
    const clone = document.importNode(templateRoomMenuItem.content, true);
    const linkEl = clone.querySelector('a');
    linkEl.setAttribute('href', `#${room.id}`);
    linkEl.setAttribute('data-menu-room', room.id);
    linkEl.textContent = room.id;
    roomsMenuLink.appendChild(clone);

    // Create room panel
    createMessagesPanel(room, room.id);
};


const addUserToLists = (user, listElement) => {
    const clone = document.importNode(templateUserMenuItem.content, true);

    const linkEl = clone.querySelector('a');
    linkEl.setAttribute('href', `#${slugify(user.username)}`);
    linkEl.setAttribute('data-menu-user', user.id);
    linkEl.setAttribute('data-menu-room', user.id);

    const imgEl = clone.querySelector('img');
    imgEl.setAttribute('src', user.image);

    const nameEl = clone.querySelector('[data-name]');
    nameEl.textContent = user.username;

    listElement.appendChild(clone);
};

const addUserToOnlineUsers = (user) => {
    appOnlineUsers = [...appOnlineUsers, user];
    addUserToLists(user, onlineUsersMenuLink);
};

const addUserToPrivateTalks = (user) => {
    privateTalks = [...privateTalks, user];
    addUserToLists(user, privateMenuLink);
};

const removeUserFromOnlineUsers = (user) => {
    const onlineUserLink = onlineUsersMenuLink.querySelector(`[data-menu-user="${user.id}"]`)
    if (onlineUserLink === null) {
        return;
    }
    onlineUserLink.parentElement.remove();

    // notify members who were private messenging
    const _user = getUserFromList(user.id, privateTalks);
    if (_user !== null) {
        const message = `${user.username} has left the chat.`;
        addUserStatusMessage(message, createUserRoomObject(user));
        addNotReadNotification(user);
    }

    removeTypingMessage(user);
};

const getUserFromList = (userId, list) => {
    const ret = list.filter(_user => _user.id == userId);
    if (ret.length === 0) {
        console.info(`User ${userId} could not be found in the online users`);
        return null;
    }

    return ret[0];
}

var usernameForm = document.getElementById('username-form');
usernameForm.addEventListener('submit', function (e) {
    var username = usernameInput.value;
    e.preventDefault();
    if (username) {
        socket.emit('user_joined', username);
        initSocketListener();
        switchToChat();
    }
});

var messageForm = document.getElementById('form');
messageForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (messageInput.value) {
        messageInput.disabled = true;
        toggleClasses(messageInput, ['w-full', 'w-11/12']);
        toggleClasses(loader, ['hidden']);

        const _message = await safelyTransformMessage(messageInput.value);

        socket.emit('message', _message, currentRoom);
        addMyMessage(_message);

        toggleClasses(loader, ['block', 'hidden']);
        toggleClasses(input, ['w-full', 'w-11/12']);
        messageInput.value = '';
        messageInput.disabled = false;
        messageInput.focus();
    }
});

messageInput.addEventListener("input", () => {
    if (isTyping === false) {
        isTyping = true;
        socket.emit('typing', currentRoom);
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && isTyping) {
            socket.emit('stop_typing', currentRoom);
            isTyping = false;
        }
    }, TYPING_TIMER_LENGTH);
});

roomsMenuLink.addEventListener('click', (event) => {
    const room = event.target.getAttribute('data-menu-room');
    if (room === null || room === currentRoom.id) {
        return;
    }
    switchToRoom(createChannelRoomObject(room));
});

privateMenuLink.addEventListener('click', (event) => {
    const menuRoom = event.target.closest('[data-menu-room]');
    const userId = menuRoom.getAttribute('data-menu-room');
    if (userId === null || userId === currentRoom.id) {
        return;
    }

    switchToRoom(createUserRoomObject({ id: userId }));
});

onlineUsersMenuLink.addEventListener('click', (event) => {
    const menuRoom = event.target.closest('[data-menu-room]');
    const userId = menuRoom.getAttribute('data-menu-room');
    if (userId === null || userId == currentRoom.id) {
        return;
    }

    const user = getUserFromList(userId, appOnlineUsers);
    if (user === null) {
        return;
    }

    // create the user room if does exist
    if (document.querySelector(`[data-room="${user.id}"]`) === null) {
        // add item to private menu
        addUserToPrivateTalks(user);
        createMessagesPanel(createUserRoomObject(user), user.username, user.image);
    }

    switchToRoom(createUserRoomObject(user));
});

const addNotReadNotification = (user) => {
    if (currentRoom.id === user.id) {
        return;
    }

    const notif = document.querySelector(`[data-notif="${user.id}"]`);
    if (notif !== null) {
        return;
    }
    const clone = document.importNode(templateNotif.content, true);
    clone.querySelector('[data-notif]').setAttribute('data-notif', user.id);

    document.querySelector(`#private-list a[data-menu-room="${user.id}"]`).appendChild(clone);
};

const initSocketListener = () => {
    socket.on('user_joined', function ({ user }) {
        console.log(`user ${user.username} joined`);
        addUserToOnlineUsers(user);
    });

    socket.on('user_left', function ({ user }) {
        removeUserFromOnlineUsers(user);
    });

    socket.on('private_message', function ({ user, message }) {
        // create the room if does not exist
        if (document.querySelector(`[data-room="${user.id}"]`) === null) {
            // add item to private menu
            addUserToPrivateTalks(user);
            createMessagesPanel(createUserRoomObject(user), user.username);
        }
        addOtherUserMessage(user, message, createUserRoomObject(user));

        // add a small notification
        addNotReadNotification(user);
    });

    socket.on('message', function ({ user, message, room }) {
        addOtherUserMessage(user, message, room);
    });

    socket.on('typing', function ({ user, room }) {
        if (room.id === currentRoom.id) {
            addTypingMessage(user, room);
        }
    });

    socket.on('stop_typing', function ({ user, room }) {
        if (room.id === currentRoom.id) {
            removeTypingMessage(user, room);
        }
    });

    socket.on('welcome', function ({ onlineUsers, channels }) {
        onlineUsers.map(user => addUserToOnlineUsers(user));

        const appRooms = [];
        channels.map(channel => {
            const room = createChannelRoomObject(channel);
            appRooms.push(room);
            createChannelRoom(room);
        });

        switchToRoom(appRooms[0]);
    });
};
