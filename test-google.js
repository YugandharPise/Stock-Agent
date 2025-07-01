const { saveImagesToGoogleDoc } = require('./googleDoc');
const path = require('path');

const testImagePath = path.join(__dirname, 'screenshots', 'test.png');

saveImagesToGoogleDoc([testImagePath]);