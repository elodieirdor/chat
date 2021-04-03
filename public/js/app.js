var socket = io();

var templateMessage = document.querySelector("#message");
var templateMyMessage = document.querySelector("#my-message");
var templateStatusMessage = document.querySelector("#status-message");
var templateImg = document.querySelector("#img-message");
var templateLinkWithImg = document.querySelector("#img-link-message");
var templateLink = document.querySelector("#link-message");
var templateYoutube = document.querySelector("#youtube-message");
var templateAudio = document.querySelector("#audio-message");
var templateVideo = document.querySelector("#video-message");

var loader = document.getElementById('loader');

var usernameInput = document.getElementById('username');
usernameInput.focus();

var messageInput = document.getElementById('input');

const youtubeShortLink = "https://youtu.be/";
const youtubeWatchLink = "https://www.youtube.com/watch?v=";

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
        input.disabled = true;
        loader.classList.add('block');
        loader.classList.remove('hidden');
        var _message = await safelyTransformMessage(messageInput.value);
        loader.classList.remove('block');
        loader.classList.add('hidden');
        socket.emit('chat message', _message);
        addMyMessage(_message);
        messageInput.value = '';
        input.disabled = false;
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
