const express = require("express"); /*express框架*/
const bodyParser = require("body-parser"); /*解析post*/
const cookieParser = require("cookie-parser"); /*解析cookie*/
const cookieSession = require("cookie-session"); /*session相关*/
const multer = require("multer"); /*上传post相关*/
const mysql = require('mysql');
const utils = require("./common/utils") /*工具集*/

var server = express();

server.use(bodyParser.urlencoded({ extended: false }));
server.use(cookieParser());
var keys = [];
for (var i = 0; i < 10000; i++) {
    keys.push('sc_' + Math.random());
}
server.use(cookieSession({
    name: 'sess_id',	/*cookie中显示这个名字*/
    keys: keys,
    maxAge: 20 * 60 * 1000,
}))

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'rssc1801',
    database: 'blog_vue'
});

// web路由 验证登录
server.use('/admin', (req, res, next) => {
    console.log(req.session)
    if (!req.session['sid']) {
        res.status(200).send({ ret_code: "001", ret_msg: "未登录" }).end()
    } else {
        res.status(200).send({ rest_code: "100", ret_msg: "已登录" }).end()
    }
})
// 登录
server.use('/login', (req, res, next) => {
    var username = req.body.username;
    var password = utils.md5(req.body.password + utils.MD5_SUFFIX);

    db.query(`SELECT * FROM user_list WHERE username='${username}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "用户不存在" }).end()
            } else {
                if (data[0].password === password) {
                    // 成功, 存session
                    req.session['sid'] = data[0].ID
                    res.status(200).send({ ret_code: "000", ret_msg: "登陆成功" }).end()
                } else {
                    res.status(200).send({ ret_code: "003", ret_msg: "密码错误" }).end()
                }
            }
        }
    })
})

//接口路由
server.use('/api', require(__dirname + '/router/api.js')());


server.use(express.static(__dirname + '/www'));

server.listen(8090);
