const crypto = require("crypto"); /*加密相关*/

module.exports = {
	MD5_SUFFIX: 'sdfw3rfdw4t345sdfsdg?sdfsd4/dfg',
	md5(str){
		var obj = crypto.createHash('md5');
		obj.update(str);
		return obj.digest('hex');
	}
}

