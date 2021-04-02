var socket = io();

var templateMessage = document.querySelector("#message");
var templateMyMessage = document.querySelector("#my-message");
var templateStatusMessage = document.querySelector("#status-message");

var usernameInput = document.getElementById('username');
usernameInput.focus();

var messageInput = document.getElementById('input');

const addMessageToList = (messageEl) => {
    messages.appendChild(messageEl);
    window.scrollTo(0, document.body.scrollHeight);
};

const addMyMessage = (message) => {
    var clone = document.importNode(templateMyMessage.content, true);
    clone.querySelector('[data-message]').textContent = message;
    addMessageToList(clone);
};

const addOtherUserMessage = (user, message) => {
    var clone = document.importNode(templateMessage.content, true);
    clone.querySelector('img').setAttribute('src', user.image);
    clone.querySelector('[data-username]').textContent = user.username;
    clone.querySelector('[data-message]').textContent = message;
    addMessageToList(clone);
}

const addUserStatusMessage = (message) => {
    const clone = document.importNode(templateStatusMessage.content, true);
    clone.querySelector('[data-message]').textContent = message;
    addMessageToList(clone);
};

const switchToChat = () => {
    // hide login page
    const loginPage = document.getElementById('loginPage');
    loginPage.classList.remove('block');
    loginPage.classList.add('hidden');

    // display chat page
    const chatPage = document.getElementById('chatPage');
    chatPage.classList.add('block');
    chatPage.classList.remove('hidden');
    messageInput.focus();
};

var usernameForm = document.getElementById('username-form');
usernameForm.addEventListener('submit', function (e) {
    var username = usernameInput.value;
    e.preventDefault();
    if (username) {
        socket.emit('user joined', username);
        switchToChat();
    }
});

var form = document.getElementById('form');
form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (messageInput.value) {
        socket.emit('chat message', messageInput.value);
        addMyMessage(messageInput.value);
        messageInput.value = '';
    }
});

socket.on('user joined', function ({ user }) {
    var message = `${user.username} joined`;
    addUserStatusMessage(message);
});

socket.on('user left', function ({ user }) {
    var message = `${user.username} left`;
    addUserStatusMessage(message);
});

socket.on('chat message', function ({ user, message }) {
    addOtherUserMessage(user, message);
});
