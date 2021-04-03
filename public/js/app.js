var socket = io();

var templateMessage = document.querySelector("#message");
var templateMyMessage = document.querySelector("#my-message");
var templateStatusMessage = document.querySelector("#status-message");

var usernameInput = document.getElementById('username');
usernameInput.focus();

var messageInput = document.getElementById('input');

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

const renderHtmlForLink = async (url) => {
    if (url.indexOf('http', 0) === -1) {
        url = `https://${url}`;
    }

    try {

        // get info from url
        var response = await fetch(`/info-url?url=${url}`);
        var json = await response.json();

        // TODO use templates

        if (json.type === 'img') {
            return `<a target="_blank" class="underline" href="${url}">
                    <img src="${url}" width="200" height="200"/>
                </a>`

        } else {
            if (json.type === 'html') {

                if (json.image) {
                    return `<div class="my-5">
                            <a target="_blank" class="underline" href="${url}">
                                <div>${json.title ?? url}</div>
                                <img src="${json.image}" width="200" height="200"/>
                            </a>
                        </div>`
                }

                return `<a target="_blank" class="underline" href="${url}">${json.title ?? url}</a>`;
            }
        }
    } catch (error) {
        console.log(`Request failed ${error}`);
    }

    return `<a target="_blank" class="underline" href="${url}">${url}</a>`;
};

const transformUrls = async (message) => {
    var words = message.split(' ');
    for (let i in words) {
        //  don't know why but had to declare the regex inside the loop to have the test working after the 1st iteration
        var regexUrl = /(http:\/\/|https:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
        var word = words[i];
        if (regexUrl.test(word)) {
            words[i] = await renderHtmlForLink(word);
        }
    }

    return words.join(' ');
};

const safelyTransformMessage = (message) => {
    var sanitizedMsg = sanitizeHTML(message);
    var updatedMessage = transformUrls(sanitizedMsg);

    return updatedMessage;
};

const addMessageToList = (messageEl) => {
    messages.appendChild(messageEl);
    window.scrollTo(0, document.body.scrollHeight);
};

const addMyMessage = (message) => {
    var clone = document.importNode(templateMyMessage.content, true);
    clone.querySelector('[data-message]').innerHTML = message;
    addMessageToList(clone);
};

const addOtherUserMessage = (user, message) => {
    var clone = document.importNode(templateMessage.content, true);
    clone.querySelector('img').setAttribute('src', user.image);
    clone.querySelector('[data-username]').textContent = user.username;
    clone.querySelector('[data-message]').innerHTML = message;
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
form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (messageInput.value) {
        var _message = await safelyTransformMessage(messageInput.value);
        socket.emit('chat message', _message);
        addMyMessage(_message);
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
