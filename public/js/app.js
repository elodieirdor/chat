var socket = io();

const templateMessage = document.querySelector("#message");
const templateMyMessage = document.querySelector("#my-message");
const templateStatusMessage = document.querySelector("#status-message");
const templateImg = document.querySelector("#img-message");
const templateLinkWithImg = document.querySelector("#img-link-message");
const templateLink = document.querySelector("#link-message");
const templateYoutube = document.querySelector("#youtube-message");
const templateAudio = document.querySelector("#audio-message");
const templateVideo = document.querySelector("#video-message");
const templateRoomMenuItem = document.querySelector("#room-menu-item");
const templateRoomMessages = document.querySelector("#room-messages");
const loader = document.getElementById('loader');
const roomMenuLink = document.getElementById('rooms-list');
const usernameInput = document.getElementById('username');
usernameInput.focus();

const messageInput = document.getElementById('input');


const youtubeShortLink = "https://youtu.be/";
const youtubeWatchLink = "https://www.youtube.com/watch?v=";

let isTyping = false;
const TYPING_TIMER_LENGTH = 500;
const rooms = ['community', 'other'];
let currentRoom = null;

//#region utils
/*!
 * Sanitize and encode all HTML in a user-submitted string
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {String} str  The user-submitted string
 * @return {String} str  The sanitized string
 */
const sanitizeHTML = (str) => {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

const toggleClasses = (element, classes) => {
    const currentClasses = element.classList.value.split(' ');
    for (_class of classes) {
        if (currentClasses.indexOf(_class) === -1) {
            element.classList.add(_class);
        } else {
            element.classList.remove(_class);
        }
    }
}
//#endregion

//#region message formatter
const renderYoutubeVideo = (url) => {
    let src = "https://www.youtube.com/embed/";

    if (url.indexOf(youtubeShortLink) === 0) {
        src += url.substring(youtubeShortLink.length);
    } else {
        if (url.indexOf(youtubeWatchLink) === 0) {
            src += url.substring(youtubeWatchLink.length);
        }
    }

    const clone = document.importNode(templateYoutube.content, true);
    clone.querySelector('iframe').setAttribute('src', src);

    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
}

const getFileExtension = (url) => {
    const pathname = new URL(url).pathname;

    return pathname.substring(pathname.length - 3);
}

const renderImgElement = (url) => {
    const clone = document.importNode(templateImg.content, true);
    clone.querySelector('a').setAttribute('href', url);
    clone.querySelector('img').setAttribute('src', url);

    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
};

const renderAudioElement = (url) => {
    const clone = document.importNode(templateAudio.content, true);
    const extension = getFileExtension(url);
    const type = getFileExtension(url) === 'mp3' ? 'mpeg' : extension;

    clone.querySelector('source').setAttribute('src', url);
    clone.querySelector('source').setAttribute('type', `audio/${type}`);
    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
};

const renderVideoElement = (url) => {
    const clone = document.importNode(templateVideo.content, true);
    const type = getFileExtension(url);

    clone.querySelector('source').setAttribute('src', url);
    clone.querySelector('source').setAttribute('type', `video/${type}`);
    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
};

const renderLinkWithImage = (title, image, url) => {
    const clone = document.importNode(templateLinkWithImg.content, true);
    clone.querySelector('a').setAttribute('href', url);
    clone.querySelector('img').setAttribute('src', image);
    clone.querySelector('[data-title]').textContent = title;

    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
};

const renderLink = (title, url) => {
    const clone = document.importNode(templateLink.content, true);
    clone.querySelector('a').setAttribute('href', url);
    clone.querySelector('a').textContent = title;

    // meed this because we are not appending the element directly to the dom
    var temp = document.createElement('div');
    temp.appendChild(clone);

    return temp.innerHTML;
};

const renderHtmlForLink = (url, urlData) => {
    // prevent wrong clickable link in the browser
    if (url.indexOf('http', 0) === -1) {
        url = `https://${url}`;
    }

    if (urlData.type === 'image') {
        return renderImgElement(url);
    }

    if (urlData.type === 'audio') {
        return renderAudioElement(url);
    }

    if (urlData.type === 'video') {
        return renderVideoElement(url);
    }

    const isYoutubeLink = url.indexOf(youtubeShortLink) === 0
        || url.indexOf(youtubeWatchLink) === 0;
    if (isYoutubeLink) {
        return renderYoutubeVideo(url);
    }

    if (urlData.type === 'html' && urlData.image) {
        return renderLinkWithImage(urlData.title, urlData.image, url);
    }

    return renderLink(urlData.title, url);
};

const transformUrls = async (message) => {
    var regexUrl = /(http:\/\/|https:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    var matches = message.match(regexUrl);

    if (matches === null) {
        return message;
    }

    // call api to get url data
    var response = await fetch(`/info-url`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls: matches })
    });

    // return an array like ["matchString1":{type:'html',title:'title', image:'image_url'}]
    var urlData = await response.json();

    var words = message.split(' ');
    for (let i in words) {
        var word = words[i];
        if (urlData[word]) {
            words[i] = renderHtmlForLink(word, urlData[word]);
        }
    }

    return words.join(' ');
};

const safelyTransformMessage = (message) => {
    var sanitizedMsg = sanitizeHTML(message);

    return transformUrls(sanitizedMsg);
};
//#endregion

const addMessageToList = (messageEl, room) => {
    const messages = document.querySelector(`[data-messages-room="${room}"]`);
    messages.appendChild(messageEl);
    messages.scrollTo(0, messages.scrollHeight);
};

const addMyMessage = (message) => {
    var clone = document.importNode(templateMyMessage.content, true);
    clone.querySelector('[data-message]').innerHTML = message;
    addMessageToList(clone, currentRoom);
};

const addOtherUserMessage = (user, message, room) => {
    var clone = document.importNode(templateMessage.content, true);
    clone.querySelector('img').setAttribute('src', user.image);
    clone.querySelector('[data-username]').textContent = user.username;
    clone.querySelector('[data-message]').innerHTML = message;
    addMessageToList(clone, room);
};

const addUserStatusMessage = (message, room) => {
    const clone = document.importNode(templateStatusMessage.content, true);
    clone.querySelector('[data-message]').textContent = message;
    addMessageToList(clone, room);
};

const addTypingMessage = (user, room) => {
    const clone = document.importNode(templateStatusMessage.content, true);
    const messageEl = clone.querySelector('[data-message]');
    messageEl.textContent = `${user.username} is typing ...`;
    toggleClasses(messageEl, 'animate-pulse');
    messageEl.setAttribute('data-typing', user.id);
    addMessageToList(clone, room);
};

const removeTypingMessage = (user) => {
    document.querySelector(`[data-typing="${user.id}"]`).remove();
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
    const toBeCurrentRoomItemMenu = document.querySelector(`[data-menu-room=${room}]`);
    const itemsMenuToEdit = [toBeCurrentRoomItemMenu];

    const toBeCurrentRoomPanel = document.querySelector(`[data-room=${room}]`);
    const roomPanelsToEdit = [toBeCurrentRoomPanel];

    if (currentRoom) {
        const currentRoomItemMenu = document.querySelector(`[data-menu-room=${currentRoom}]`);
        itemsMenuToEdit.push(currentRoomItemMenu);

        const currentRoomEl = document.querySelector(`[data-room=${currentRoom}]`);
        roomPanelsToEdit.push(currentRoomEl);
    }

    // remove "active" classes on previous items and add them to the room about to be current
    itemsMenuToEdit.map((_roomItem) => {
        toggleClasses(_roomItem, ['font-medium', 'text-yellow-500']);
    });

    // switch to new room panel
    roomPanelsToEdit.map((_roomEl) => {
        toggleClasses(_roomEl, ['hidden']);
    });

    currentRoom = room;
};

const createRoom = (room) => {
    // Create item for menu
    const clone = document.importNode(templateRoomMenuItem.content, true);
    const linkEl = clone.querySelector('a');
    linkEl.setAttribute('href', `#${room}`);
    linkEl.setAttribute('data-menu-room', room);
    // TODO use an object for the room
    linkEl.textContent = room;
    roomMenuLink.appendChild(clone);
    // End

    // Create room panel
    var form = document.getElementById('form');
    var contentWrapper = document.getElementById('content-wrapper');

    const cloneRoomPanel = document.importNode(templateRoomMessages.content, true);
    cloneRoomPanel.querySelector('[data-room]').setAttribute('data-room', room);
    cloneRoomPanel.querySelector('[data-title]').textContent = room;
    cloneRoomPanel.querySelector('[data-messages-room]').setAttribute('data-messages-room', room);

    contentWrapper.insertBefore(cloneRoomPanel, form);
}

const initChat = () => {
    rooms.map(room => createRoom(room));
    switchToRoom(rooms[0]);
};

var usernameForm = document.getElementById('username-form');
usernameForm.addEventListener('submit', function (e) {
    var username = usernameInput.value;
    e.preventDefault();
    if (username) {
        socket.emit('user joined', username);
        initChat();
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

        var _message = await safelyTransformMessage(messageInput.value);
        socket.emit('chat message', _message, currentRoom);
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
        socket.emit('user typing', currentRoom);
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && isTyping) {
            socket.emit('stop typing', currentRoom);
            isTyping = false;
        }
    }, TYPING_TIMER_LENGTH);
});

roomMenuLink.addEventListener('click', (event) => {
    const room = event.target.getAttribute('data-menu-room');
    if (room === null || room === currentRoom) {
        return;
    }
    switchToRoom(room);
});

//#region socket
socket.on('user joined', function ({ user }) {
    var message = `${user.username} joined`;
    rooms.map(room => {
        addUserStatusMessage(message, room);
    })
});

socket.on('user left', function ({ user }) {
    var message = `${user.username} left`;
    rooms.map(room => {
        addUserStatusMessage(message, room);
    })
});

socket.on('chat message', function ({ user, message, room }) {
    addOtherUserMessage(user, message, room);
});

socket.on('user typing', function ({ user, room }) {
    if (room === currentRoom) {
        addTypingMessage(user, room);
    }
});

socket.on('stop typing', function ({ user, room }) {
    if (room === currentRoom) {
        removeTypingMessage(user, room);
    }
});
//#endregion
