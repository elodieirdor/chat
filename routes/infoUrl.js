const express = require('express');
const infoUrlController = require('../controllers/infoUrl.js');

const router = express.Router();

router
  .post('/', infoUrlController.getInfo)

// export default router;
module.exports = router;
