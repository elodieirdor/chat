const templateImg = document.querySelector("#img-message");
const templateLinkWithImg = document.querySelector("#img-link-message");
const templateLink = document.querySelector("#link-message");
const templateYoutube = document.querySelector("#youtube-message");
const templateAudio = document.querySelector("#audio-message");
const templateVideo = document.querySelector("#video-message");


const youtubeShortLink = "https://youtu.be/";
const youtubeWatchLink = "https://www.youtube.com/watch?v=";

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