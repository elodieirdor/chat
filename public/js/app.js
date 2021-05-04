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
const templateUserCheckboxItem = document.querySelector("#user-checkbox-item");

const channelsMenuLink = document.getElementById('rooms-list');
const onlineUsersMenuLink = document.getElementById('users-list');
const privateMenuLink = document.getElementById('private-list');
const groupRoomForm = document.getElementById('group-room');
const checkboxListEl = document.getElementById('checkbox-list');

let isTyping = false;
const TYPING_TIMER_LENGTH = 500;
let typingUsers = [];

let currentRoom = null;

let appUser = {};
let appOnlineUsers = [];
let privateTalks = [];
let nbUnreadNotif = 0;
const groupIdSeparator = '___';

const createChannelRoomObject = (roomId) => {
    return { type: 'channel', id: roomId };
};

const createPrivateRoomObject = (roomId/*, title*/) => {
    return { type: 'private_room', id: roomId, image: '/images/favicon-32x32.png' };
};

const createUserRoomObject = (user) => {
    return { type: 'user', id: user.id, title: user.username, image: user.image };
};

const getPrivateRoomTitle = (roomId) => {
    const participantIds = roomId.split(groupIdSeparator);
    const participants = appOnlineUsers.filter(user => participantIds.indexOf(user.id) > -1);
    const names = participants.map(user => user.username);

    return names.sort().join(', ');
}

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

const deactivateMessageInputRoom = (room) => {
    const messageInput = document.querySelector(`[data-room="${room.id}"] [data-form="message"] input`);
    messageInput.disabled = true;
    messageInput.style['opacity'] = 0.5;

    handleRoomListeners(room, false);
}

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
};

const handleSubmitMessage = async function (e, messageForm) {
    e.preventDefault();

    const loader = messageForm.querySelector('[data-form="loader"]');
    const messageInput = messageForm.querySelector('input');

    if (messageInput.value) {
        messageInput.disabled = true;
        toggleClasses(messageInput, ['w-full', 'w-11/12']);
        toggleClasses(loader, ['hidden']);

        const _message = await safelyTransformMessage(messageInput.value);

        socket.emit('message', _message, currentRoom);
        addMyMessage(_message);

        toggleClasses(loader, ['block', 'hidden']);
        toggleClasses(messageInput, ['w-full', 'w-11/12']);
        messageInput.value = '';
        messageInput.disabled = false;
        messageInput.focus();
    }
};

const handleTypingMessage = () => {
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
};

const handleRoomListeners = (room, addListener = true) => {
    const messageForm = document.querySelector(`[data-room="${room.id}"] [data-form="message"]`);
    const messageInput = messageForm.querySelector('input');

    const functionName = addListener ? 'addEventListener' : 'removeEventListener';
    messageForm[functionName]('submit', (e) => handleSubmitMessage(e, messageForm));
    messageInput[functionName]("input", handleTypingMessage);
};

const switchToUserRoom = (userId) => {

    if (userId === null || userId == currentRoom.id) {
        return;
    }

    const user = getUserFromList(userId, appOnlineUsers);
    if (user === null) {
        return;
    }

    // change this, no need to create a room each time we are clicking on a link, should add the attribute to the item
    const room = createUserRoomObject(user);

    // create the user room if does exist
    if (document.querySelector(`[data-room="${user.id}"]`) === null) {
        console.log("create the private message room");
        createPrivateRoom(room, user.username, user.image);
    }

    console.log("switch to user room object", user)
    switchToRoom(room);
};

const switchToRoom = (room) => {
    // should only send an id
    console.log('switch to ')
    console.log(room);

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

    console.log(`[data-menu-room="${room.id}"]`);
    console.log(itemsMenuToEdit);

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
        nbUnreadNotif--;
        updatePageTitle();
    }

    typingUsers = [];
    currentRoom = room;
    document.querySelector('.active [data-form="message"] input').focus();
};

const createMessagesPanel = (room, title, image = null) => {
    var form = document.getElementById('form');
    var contentWrapper = document.getElementById('content-wrapper');

    const cloneRoomPanel = document.importNode(templateRoomMessages.content, true);
    cloneRoomPanel.querySelector('[data-room]').setAttribute('data-room', room.id);
    cloneRoomPanel.querySelector('[data-messages-room]').setAttribute('data-messages-room', room.id);
    cloneRoomPanel.querySelector('[data-room-type]').setAttribute('data-messages-room-type', room.type);
    cloneRoomPanel.querySelector('[data-title]').textContent = title;

    const img = cloneRoomPanel.querySelector('img');
    if (image) {
        img.setAttribute('src', image);
    } else {
        img.remove();
    }
    contentWrapper.insertBefore(cloneRoomPanel, form);

    handleRoomListeners(room);
}

const createChannelRoom = (room) => {
    // Create item for menu
    const clone = document.importNode(templateRoomMenuItem.content, true);
    const linkEl = clone.querySelector('a');
    linkEl.setAttribute('href', `#${room.id}`);
    linkEl.setAttribute('data-menu-room', room.id);
    linkEl.textContent = room.id;
    channelsMenuLink.appendChild(clone);

    // Create room panel
    createMessagesPanel(room, room.id);
};

const createPrivateRoom = (room, title, image = null) => {
    addPrivateRooms(room, title);
    createMessagesPanel(room, title, image);
};

// item cqn be a room or a user
const addRoomToMenuLists = (room, title, listElement) => {
    const clone = document.importNode(templateUserMenuItem.content, true);

    const linkEl = clone.querySelector('a');
    linkEl.setAttribute('href', `#${slugify(title)}`);
    // linkEl.setAttribute('data-menu-user', room.id);
    linkEl.setAttribute('data-menu-room', room.id);
    linkEl.setAttribute('room-type', room.type);

    const imgEl = clone.querySelector('img');
    imgEl.setAttribute('src', room.image);

    const nameEl = clone.querySelector('[data-name]');
    nameEl.textContent = title;

    listElement.appendChild(clone);
};

const addUserToModal = (user) => {
    var clone = document.importNode(templateUserCheckboxItem.content, true);
    clone.querySelector('input').setAttribute('id', user.id);
    clone.querySelector('input').setAttribute('value', JSON.stringify(user));
    clone.querySelector('label').setAttribute('for', user.id);
    clone.querySelector('[data-user-checkbox-item]').setAttribute('data-user-checkbox-item', user.id);
    clone.querySelector('label').textContent = user.username;
    checkboxListEl.appendChild(clone);
};

const addUserToOnlineUsers = (user) => {
    appOnlineUsers = [...appOnlineUsers, user];
    const room = createUserRoomObject(user);
    addRoomToMenuLists(room, user.username, onlineUsersMenuLink);
    addUserToModal(user);
};

const addPrivateRooms = (room, title) => {
    privateTalks = [...privateTalks, room];
    addRoomToMenuLists(room, title, privateMenuLink);
};

const removeUserFromOnlineUsers = (user) => {
    const onlineUserLink = onlineUsersMenuLink.querySelector(`[data-menu-room="${user.id}"]`)
    if (onlineUserLink === null) {
        return;
    }
    onlineUserLink.parentElement.remove();

    const userCheckboxItem = checkboxListEl.querySelector(`[data-user-checkbox-item="${user.id}"]`);
    if (userCheckboxItem) {
        userCheckboxItem.remove();
    }

    // notify members who were private messenging
    const _user = getUserFromList(user.id, privateTalks);
    if (_user !== null) {
        const message = `${user.username} has left the chat.`;
        const room = createUserRoomObject(user);
        addUserStatusMessage(message, room);
        deactivateMessageInputRoom(room);
        addUnreadNotification(user);
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

channelsMenuLink.addEventListener('click', (event) => {
    const room = event.target.getAttribute('data-menu-room');
    if (room === null || room === currentRoom.id) {
        return;
    }
    switchToRoom(createChannelRoomObject(room));
});

privateMenuLink.addEventListener('click', (event) => {
    const menuRoom = event.target.closest('[data-menu-room]');
    const userId = menuRoom.getAttribute('data-menu-room');
    const roomType = menuRoom.getAttribute('room-type');
    if (userId === null || userId === currentRoom.id) {
        return;
    }

    // change this, no need to create a room each time we are clicking on a link, should add the attribute to the item
    const room = roomType === 'user' ? createUserRoomObject({ id: userId }) : createPrivateRoomObject(userId, 'mon title');

    switchToRoom(room);
});

onlineUsersMenuLink.addEventListener('click', (event) => {
    const menuRoom = event.target.closest('[data-menu-room]');
    const userId = menuRoom.getAttribute('data-menu-room');

    switchToUserRoom(userId);
});

const addUnreadNotification = (user) => {
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

    nbUnreadNotif++;
    updatePageTitle();
};

const updatePageTitle = () => {
    const defaultTitle = document.title.substr(document.title.indexOf('-') + 1);
    if (nbUnreadNotif === 0) {
        document.title = defaultTitle;
    } else {
        document.title = `(${nbUnreadNotif}) - ${defaultTitle}`;
    }
}

const onReceiveMessage = (room, message, user) => {
    // TODO HANDLE CREATE CHANNEL

    if (document.querySelector(`[data-room="${room.id}"]`) === null) {
        // add item to private menu
        var title = '';
        var image = null;
        if (room.type === 'user') {
            title = user.username;
            image = user.image;
        } else {
            if (room.type === 'private_room') {
                title = getPrivateRoomTitle(room.id);
            } else {
                title = room.id;
            }
        }
        createPrivateRoom(room, title, image);
    }

    addOtherUserMessage(user, message, room);

    addUnreadNotification(room);
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
        const room = createUserRoomObject(user);
        onReceiveMessage(room, message, user);
    });

    socket.on('message', function ({ user, message, room }) {
        onReceiveMessage(room, message, user);
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

    socket.on('welcome', function ({ onlineUsers, channels, user }) {
        appUser = user;

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

//#region UsernameForm
const initUsernamePage = () => {
    const usernameForm = document.getElementById('username-form');
    const usernameInput = usernameForm.querySelector('#username')
    usernameInput.focus();

    usernameForm.addEventListener('submit', function (e) {
        var username = usernameInput.value;
        e.preventDefault();
        if (username) {
            socket.emit('user_joined', username);
            initSocketListener();
            switchToChat();
        }
    });

    // debug
    usernameInput.value = `User ${Math.floor(Math.random() * 10)}`;
    usernameForm.dispatchEvent(new Event('submit'));
    // end debug
};
initUsernamePage();
//#endregion

const toggleGroupRoomModal = (resetCheckbox = true) => {
    toggleClasses(document.getElementById('groupRoomModal'), ['hidden', 'active']);
    if (resetCheckbox) {
        const selectedCheckboxes = groupRoomForm.querySelectorAll('input[type=checkbox]:checked');
        for (let selectedCheckbox of selectedCheckboxes) {
            selectedCheckbox.checked = false;
        }
    }
}


const initCreateGroupRoom = () => {
    groupRoomForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedCheckboxes = groupRoomForm.querySelectorAll('input[type=checkbox]:checked');
        const users = [];
        for (let selectedCheckbox of selectedCheckboxes) {
            users.push(JSON.parse(selectedCheckbox.value));
        }

        if (users.length === 1) {
            switchToUserRoom(users[0].id);
            toggleGroupRoomModal();
            return;
        }

        const userIds = users.map(user => user.id);
        userIds.push(appUser.id);
        const userUsernames = users.map(user => user.username);

        const privateRoomId = userIds.sort().join('___');
        const roomTitle = getPrivateRoomTitle(privateRoomId);
        const privateRoom = createPrivateRoomObject(privateRoomId, roomTitle);

        if (document.querySelector(`[data-room="${privateRoomId}"]`) === null) {
            // add item to private menu
            createPrivateRoom(privateRoom, roomTitle);
        }
        switchToRoom(privateRoom);

        toggleGroupRoomModal();
    });


};
initCreateGroupRoom();
