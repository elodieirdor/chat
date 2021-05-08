const path = require('path');

module.exports = {
    get: async (req, res) => {
        return res.sendFile(path.resolve(__dirname + '/../index.html'));
    }
}
