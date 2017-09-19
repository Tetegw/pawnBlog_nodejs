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
    httpOnly: false,    /* 允许前端获取，用来判断是否过期 */
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

//退出
server.use('/logout', (req, res, next) => {
    console.log(req.session['sid']);
    if (req.session['sid']) {
        req.session = null
        res.status(200).send({ ret_code: "000", ret_msg: "退出成功" }).end()
    } else {
        res.status(200).send({ ret_code: "001", ret_msg: "未登录，无需退出" }).end()
    }
})

//获取用户信息
server.use('/initUserInfo', (req, res, next) => {
    var sid = req.session['sid']
    db.query(`SELECT * FROM user_list WHERE ID='${sid}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "用户不存在" }).end()
            } else {
                delete data[0].ID
                delete data[0].username
                delete data[0].password
                res.send({ ret_code: "000", ret_msg: "用户信息获取成功", data: data[0] }).end()
            }
        }
    })
})

//获取登录用户文章
server.use('/articleList', (req, res, next) => {
    const prefix = 934817;
    const userIdPerfix = 24500;
    const sid = req.session['sid']
    db.query(`SELECT * FROM article_list WHERE userId='${sid}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "暂无文章" }).end()
            } else {
                data.forEach(function (item) {
                    var tags = item.tags.split('，');
                    item.tags = tags;
                    item.userId = userIdPerfix + item.userId
                    item.ID = prefix + item.ID;
                }, this);
                res.send({ ret_code: "000", ret_msg: "文章获取成功", data: data }).end()
            }
        }
    })
})

//获取登录用户文章
server.use('/draftList', (req, res, next) => {
    const prefix = 934817;
    const userIdPerfix = 24500;
    const sid = req.session['sid']
    db.query(`SELECT * FROM article_list_draft WHERE userId='${sid}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "暂无文章" }).end()
            } else {
                data.forEach(function (item) {
                    var tags = item.tags.split('，');
                    item.tags = tags;
                    item.userId = userIdPerfix + item.userId
                    item.ID = prefix + item.ID;
                }, this);
                res.send({ ret_code: "000", ret_msg: "文章获取成功", data: data }).end()
            }
        }
    })
})

//获取登录用户分类,用于文章选择
server.use('/cols', (req, res, next) => {
    const sid = req.session['sid']
    db.query(`SELECT * FROM article_categories WHERE userId=${sid}`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            data.forEach(function (item) {
                delete item.userId
            }, this);
            res.status(200).send({ ret_code: "000", ret_msg: "获取成功", data: data }).end()
        }
    })
})

server.use('/pushArticle', (req, res, next) => {
    const sid = req.session['sid']
    const articleInfo = req.body
    console.log(articleInfo);
    // 更新或添加分类
    if (articleInfo.columnId > -1) {
        // 如果存在column, 说明用户选择以前的，则更新
        articleInfo.columnNum = +articleInfo.columnNum + 1
        // update table1 set field1=value1 where 范围
        db.query('UPDATE `article_categories` SET num=' + articleInfo.columnNum + ' WHERE ID=' + articleInfo.columnId, (err, data) => {
            if (err) {
                res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
            } else {
                console.log('分类更新完成');
                intoTags()
                getColumId()
            }
        })
    } else {
        // INSERT INTO `article_categories` (`userId`, `column`, `num`) VALUES ('1', '撒旦法', '1')
        db.query('INSERT INTO `article_categories` (`userId`, `col`, `num`) VALUES (' + sid + ', "' + articleInfo.col + '", 1)', (err, data) => {
            if (err) {
                res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
            } else {
                console.log('分类添加完成');
                intoTags()
                getColumId()
            }
        })
    }
    // 添加标签
    function intoTags() {
        var tagsList = articleInfo.tags.split('，')
        tagsList.forEach(function (item) {
            // INSERT INTO `article_categories` (`userId`, `column`, `num`) VALUES ('1', '撒旦法', '1')
            db.query('INSERT INTO `article_tags` (`userId`, `tag`) VALUES (' + sid + ', "' + item + '")', (err, data) => {
                if (err) {
                    res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
                } else {
                    console.log('标签添加完成');
                }
            })
        }, this);
    }
    //获取分类ID
    function getColumId() {
        db.query('SELECT ID FROM article_categories WHERE `col`="' + articleInfo.col + '"', (err, data) => {
            if (err) {
                console.log('出错了');
                res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
            } else {
                console.log('获取分类ID完成');
                console.log(data[0]);
                articleInfo.columnId = data[0].ID
                selectAvatar()
            }
        })
    }
    // 查找头像
    function selectAvatar() {
        db.query(`SELECT avatar FROM user_list WHERE ID='${sid}'`, (err, data) => {
            if (err) {
                res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
            } else {
                articleInfo.avatar = data[0].avatar
                articleInfo.date = new Date().Format("yyyy-MM-dd hh:mm");
                // 添加文章了
                console.log('头像查找成功');
                pushArticle()
            }
        })
    }
    // 添加更新文章
    function pushArticle() {
        const sid = req.session['sid']
        console.log(articleInfo);
        db.query(`INSERT INTO article_list (userId,avatar,mainTitle,tags,intro,date,col,columnId,content,render,original) VALUES ("${sid}" ,"${articleInfo.avatar}","${articleInfo.mainTitle}","${articleInfo.tags}","${articleInfo.intro}","${articleInfo.date}","${articleInfo.col}","${articleInfo.columnId}","${articleInfo.content}","${articleInfo.contentRender}","${articleInfo.original}")`, (err, data) => {

            if (err) {
                res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
            } else {
                console.log('文章添加完成');
                res.status(200).send({ ret_code: "000", ret_msg: "发布成功" }).end()
            }
        })
    }

    Date.prototype.Format = function (fmt) {
        var o = {
            "M+": this.getMonth() + 1, //月份 
            "d+": this.getDate(), //日 
            "h+": this.getHours(), //小时 
            "m+": this.getMinutes(), //分 
            "s+": this.getSeconds(), //秒 
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
            "S": this.getMilliseconds() //毫秒 
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

})



//接口路由
server.use('/api', require(__dirname + '/router/api.js')());
server.use(express.static(__dirname + '/www'));

server.listen(8090);


