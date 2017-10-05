const utils = require('./utils');

var str = utils.md5('cllx321' + utils.MD5_SUFFIX);
console.log(str);
// forever start -l forever.log -o out.log -e err.log -a .\server.js