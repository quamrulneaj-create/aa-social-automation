// Builds each task's code from src/ (the same code the n8n workflows use).
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const common = read('common.js');
const renderLib = read('render_lib.js');
module.exports = {
  generator: common + '\n' + read('generator.js'),
  prerender: common + '\n' + renderLib + '\n' + read('prerender.js'),
  publisher: common + '\n' + renderLib + '\n' + read('publisher.js'),
  drive_ingest: common + '\n' + read('drive_ingest.js'),
};
