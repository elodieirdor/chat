const axios = require('axios');
const HTMLParser = require('node-html-parser');

const getMediaType = (response) => {
    let type = 'html';
    const mediaTypes = ['image', 'audio', 'video'];
    for (mediaType of mediaTypes) {
        if (response.headers['content-type'].indexOf(mediaType) === 0) {
            type = mediaType;
            break;
        }
    }

    return type;
}

const getMedataForWebPage = (response) => {
    const root = HTMLParser.parse(response);
    let title = '';
    let image = null;

    // title
    let metaTitle = root.querySelector('meta[property="og:title"]');
    if (metaTitle) {
        title = metaTitle.getAttribute('content');
    } else {
        metaTitle = root.querySelector('title');
        if (metaTitle) {
            title = metaTitle.text;
        }
    }

    // image 
    var metaImage = root.querySelector('meta[property="og:image"]');
    if (metaImage) {
        image = metaImage.getAttribute('content');
    }

    return { title, image };
}

const getMetadataFromUrl = async (url) => {
    var regexUrl = /(http:\/\/|https:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    if (regexUrl.test(url) === false) {
        throw `${url} is not an url`;
    }

    let content = { type: 'html', title: url, image: null };
    try {
        const response = await axios.get(url);
        content.type = getMediaType(response);

        if (content.type === 'html') {
            const metadata = getMedataForWebPage(response.data);
            content = { ...content, ...metadata };
        }
    } catch (error) {
        console.log(error);
    }

    return content;
}

module.exports = {
    getMetadataFromUrl,    
};
