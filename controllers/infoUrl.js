const { getMetadataFromUrl } = require('./../utils/metadata-url');

module.exports = {
    getInfo: async (req, res) => {
        const response = {};
        const urls = req.body.urls;

        for (let url of urls) {
            response[url] = await getMetadataFromUrl(url);
        }

        return res.send(response);
    }
}
