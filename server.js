const express = require("express"); /*express框架*/
const bodyParser = require("body-parser"); /*解析post*/
const cookieParser = require("cookie-parser"); /*解析cookie*/
const cookieSession = require("cookie-session"); /*session相关*/
const multer = require("multer"); /*上传post相关*/
const mysql = require('mysql');
const utils = require("./common/utils") /*工具集*/
const fs = require('fs')
const pathLib = require('path')
const url = require('url')


var server = express();

server.use(bodyParser.urlencoded({ extended: false }));
server.use(cookieParser());
var multerArticle = multer({ dest: './www/upload/article', limits: { fileSize: 2 * 1000 * 1000 } }).any()
var multerAvatar = multer({ dest: './www/upload/avatar', limits: { fileSize: 2 * 1000 * 1000 } }).any()


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
                delete data[0].activate
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
    db.query(`SELECT * FROM article_list WHERE userId='${sid}' order by id desc`, (err, data) => {
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

//获取登录用户草稿箱文章
server.use('/draftList', (req, res, next) => {
    const prefix = 934817;
    const userIdPerfix = 24500;
    const sid = req.session['sid']
    db.query(`SELECT * FROM article_list_draft WHERE userId='${sid}' order by id desc`, (err, data) => {
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

//获取草稿箱文章详细
server.use('/draftDetail', (req, res, next) => {
    const prefix = 934817;
    const userIdPerfix = 24500;
    const sid = req.session['sid']
    const draftId = req.query.draftId - prefix;
    if (!sid) {
        return;
    }
    db.query(`SELECT * FROM article_list_draft WHERE ID='${draftId}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "暂无文章" }).end()
            } else {
                var tags = data[0].tags.split('，');
                data[0].tags = tags;
                data[0].ID = prefix + data[0].ID;
                data[0].userId = userIdPerfix + data[0].userId
                res.send({ ret_code: "000", ret_msg: "文章获取成功", data: data[0] }).end()
            }
        }
    })
})

//获取发表的文章详细
server.use('/articleDetail', (req, res, next) => {
    const prefix = 934817;
    const userIdPerfix = 24500;
    const sid = req.session['sid']
    const articleId = req.query.articleId - prefix;
    if (!sid) {
        return;
    }
    db.query(`SELECT * FROM article_list WHERE ID='${articleId}'`, (err, data) => {
        if (err) {
            res.status(500).send({ ret_code: "001", ret_msg: "服务器错误" }).end()
        } else {
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "暂无文章" }).end()
            } else {
                var tags = data[0].tags.split('，');
                data[0].tags = tags;
                data[0].ID = prefix + data[0].ID;
                data[0].userId = userIdPerfix + data[0].userId
                res.send({ ret_code: "000", ret_msg: "文章获取成功", data: data[0] }).end()
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
            if (data.length === 0) {
                res.status(200).send({ ret_code: "002", ret_msg: "暂无标签" }).end()
            } else {
                data.forEach(function (item) {
                    delete item.userId
                }, this);
                res.status(200).send({ ret_code: "000", ret_msg: "获取成功", data: data }).end()
            }
        }
    })
})

// 发表文章
server.use('/pushArticle', (req, res, next) => {
    const sid = req.session['sid']
    const articleInfo = req.body
    // 更新或添加分类
    if (articleInfo.columnId === "-1") {
        console.log('object');
        db.query('INSERT INTO `article_categories` (`userId`, `col`) VALUES (' + sid + ', "' + articleInfo.col + '")', (err, data) => {
            if (err) {
                res.status(500).send({ ret_code: "001", ret_msg: "添加分类错误" }).end()
            } else {
                console.log('分类添加完成');
                getColumId()
            }
        })
    } else {
        console.log('object2');
        getColumId()
    }
    //获取分类ID
    function getColumId() {
        db.query('SELECT ID FROM article_categories WHERE `col`="' + articleInfo.col + '"', (err, data) => {
            if (err) {
                console.log('出错了');
                res.status(500).send({ ret_code: "001", ret_msg: "获取分类ID错误" }).end()
            } else {
                console.log('获取分类ID完成');
                console.log(data[0]);
                articleInfo.columnId = data[0].ID
                pushArticle()
            }
        })
    }

    // 添加更新文章
    function pushArticle() {
        const prefix = 934817;
        const sid = req.session['sid']
        articleInfo.date = new Date().Format("yyyy-MM-dd hh:mm")
        if (articleInfo.articleId === '0') {
            // 新文章
            console.log('准备添加文章');
            db.query(`INSERT INTO article_list (userId,mainTitle,tags,intro,date,col,columnId,content,render,original) VALUES ("${sid}" ,"${articleInfo.mainTitle}","${articleInfo.tags}","${articleInfo.intro}","${articleInfo.date}","${articleInfo.col}","${articleInfo.columnId}","${articleInfo.content}","${articleInfo.contentRender}","${articleInfo.original}")`, (err, data) => {
                if (err) {
                    console.log(err);
                    res.status(500).send({ ret_code: "001", ret_msg: "添加文章错误" }).end()
                } else {
                    if (articleInfo.draftId > 0) {
                        articleInfo.draftId = articleInfo.draftId - prefix
                        console.log(articleInfo.draftId);
                        // 删除草稿箱文章
                        // DELETE FROM Person WHERE LastName = 'Wilson' 
                        db.query(`DELETE FROM article_list_draft WHERE ID="${articleInfo.draftId}"`, (err, data) => {
                            if (err) {
                                res.status(500).send({ ret_code: "001", ret_msg: "删除草稿箱错误" }).end()
                            } else {
                                console.log('从草稿箱发表文章完成');
                                res.status(200).send({ ret_code: "000", ret_msg: "发布成功，删除草稿箱成功" }).end()
                            }
                        })
                    } else {
                        console.log('添加文章完成');
                        res.status(200).send({ ret_code: "000", ret_msg: "发布成功" }).end()
                    }
                }
            })
        } else {
            // 从发布的文章来
            console.log('准备更新文章');
            articleInfo.articleId = articleInfo.articleId * 1 - prefix
            console.log(sid, articleInfo.columnId, articleInfo.articleId);
            // 更新文章
            db.query(`UPDATE article_list SET userId="${sid}",mainTitle="${articleInfo.mainTitle}",tags="${articleInfo.tags}",intro="${articleInfo.intro}",date="${articleInfo.date}",col="${articleInfo.col}",columnId="${articleInfo.columnId}",content="${articleInfo.content}",render="${articleInfo.contentRender}",original="${articleInfo.original}" WHERE ID="${articleInfo.articleId}"`, (err, data) => {
                if (err) {
                    console.log(err);
                    res.status(500).send({ ret_code: "001", ret_msg: "更新文章错误" }).end()
                } else {
                    console.log('更新文章完成');
                    if (articleInfo.draftId > 0) {
                        articleInfo.draftId = articleInfo.draftId - prefix
                        console.log(articleInfo.draftId);
                        // 删除草稿箱文章
                        // DELETE FROM Person WHERE LastName = 'Wilson' 
                        db.query(`DELETE FROM article_list_draft WHERE ID="${articleInfo.draftId}"`, (err, data) => {
                            if (err) {
                                res.status(500).send({ ret_code: "001", ret_msg: "删除草稿箱错误" }).end()
                            } else {
                                console.log('添加文章完成');
                                res.status(200).send({ ret_code: "000", ret_msg: "发布成功，删除草稿箱成功" }).end()
                            }
                        })
                    } else {
                        res.status(200).send({ ret_code: "000", ret_msg: "发布成功" }).end()
                    }
                }
            })
        }
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

//保存草稿
server.use('/pushDraft', (req, res, next) => {
    const sid = req.session['sid']
    const draftInfo = req.body
    const prefix = 934817
    function pushDraft() {
        draftInfo.date = new Date().Format("yyyy-MM-dd hh:mm")
        // 添加草稿
        if (draftInfo.draftId === '0') {
            // 从发布的文章来或者新草稿
            console.log('准备添加草稿');
            db.query(`INSERT INTO article_list_draft (userId,mainTitle,tags,intro,date,col,columnId,content,render,original,articleId) VALUES ("${sid}" ,"${draftInfo.mainTitle}","${draftInfo.tags}","${draftInfo.intro}","${draftInfo.date}","${draftInfo.col}","${draftInfo.columnId}","${draftInfo.content}","${draftInfo.contentRender}","${draftInfo.original}", "${draftInfo.articleId}")`, (err, data) => {
                if (err) {
                    res.status(500).send({ ret_code: "001", ret_msg: "保存草稿错误" }).end()
                } else {
                    res.status(200).send({ ret_code: "000", ret_msg: "保存草稿成功" }).end()
                }
            })
        } else {
            // 从草稿箱来
            console.log('准备更新草稿');
            draftInfo.draftId = draftInfo.draftId * 1 - prefix
            console.log(sid, draftInfo.columnId, draftInfo.draftId);
            // 更新草稿
            /// 'UPDATE `article_categories` SET num=' + articleInfo.columnNum + ' WHERE ID=' + articleInfo.columnId
            db.query(`UPDATE article_list_draft SET userId="${sid}",mainTitle="${draftInfo.mainTitle}",tags="${draftInfo.tags}",intro="${draftInfo.intro}",date="${draftInfo.date}",col="${draftInfo.col}",columnId="${draftInfo.columnId}",content="${draftInfo.content}",render="${draftInfo.contentRender}",original="${draftInfo.original}" WHERE ID="${draftInfo.draftId}"`, (err, data) => {
                if (err) {
                    console.log(err);
                    res.status(500).send({ ret_code: "001", ret_msg: "更新草稿错误" }).end()
                } else {
                    console.log('更新草稿完成');
                    res.status(200).send({ ret_code: "000", ret_msg: "保存草稿成功" }).end()
                }
            })
        }
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
    pushDraft()
})

//上传文章图片
server.post('/uploadArticle', (req, res, next) => {
    multerArticle(req, res, function (err) {
        if (err) {
            var errObj = JSON.parse(JSON.stringify(err));
            if (errObj.code === 'LIMIT_FILE_SIZE') {
                res.status(200).send({ ret_code: "001", ret_msg: "上传文件大小不允许超过2M" }).end()
            } else {
                res.status(200).send({ ret_code: "001", ret_msg: errObj.code }).end()
            }
        } else {
            // 拼接文件名，返回给前端
            var originalName = req.files[0].originalname
            var extNmae = pathLib.parse(originalName).ext
            var pathName = req.files[0].path
            var newName = pathName + extNmae;
            var tempname = pathName.substring(3) + extNmae;
            var resultName = url.resolve('http://127.0.0.1:8090', tempname);
            fs.rename(pathName, newName, function (err) {
                if (err) {
                    res.status(500).send({ ret_code: "000", ret_msg: '上传失败' }).end()
                    console.log(err);
                } else {
                    res.status(200).send({ ret_code: "000", ret_msg: '上传成功', path: resultName }).end()
                }
            })
        }
    })
})

// 删除文章
server.use('/deleteArticle', (req, res, next) => {
    const prefix = 934817
    let itemId = req.body.itemId * 1 - prefix
    db.query(`DELETE FROM article_list WHERE ID=${itemId}`, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send({ ret_code: "001", ret_msg: "删除文章未成功，请稍后再试" }).end()
        } else {
            console.log('删除文章' + itemId);
            res.status(200).send({ ret_code: "000", ret_msg: "删除文章成功" }).end()
        }
    })
})

// 删除草稿
server.use('/deleteDraft', (req, res, next) => {
    const prefix = 934817
    let itemId = req.body.itemId * 1 - prefix
    db.query(`DELETE FROM article_list_draft WHERE ID=${itemId}`, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send({ ret_code: "001", ret_msg: "删除草稿未成功，请稍后再试" }).end()
        } else {
            console.log('删除草稿' + itemId);
            res.status(200).send({ ret_code: "000", ret_msg: "删除草稿成功" }).end()
        }
    })
})

//上传头像
server.post('/uploadAvatar', (req, res, next) => {
    const sid = req.session['sid']
    const userIdPerfix = 24500;
    const userId = userIdPerfix + sid
    multerAvatar(req, res, function (err) {
        if (err) {
            var errObj = JSON.parse(JSON.stringify(err));
            if (errObj.code === 'LIMIT_FILE_SIZE') {
                res.status(200).send({ ret_code: "001", ret_msg: "上传文件大小不允许超过2M" }).end()
            } else {
                res.status(200).send({ ret_code: "001", ret_msg: errObj.code }).end()
            }
        } else {
            // 拼接文件名，返回给前端
            var originalName = req.files[0].originalname
            var extNmae = pathLib.parse(originalName).ext
            var pathName = req.files[0].path
            var newName = pathName + '_' + userId + extNmae;
            var tempname = pathName.substring(3) + '_' + userId + extNmae;
            var resultName = url.resolve('http://localhost:8090', tempname);
            fs.rename(pathName, newName, function (err) {
                if (err) {
                    res.status(500).send({ ret_code: "000", ret_msg: '上传失败' }).end()
                    console.log(err);
                } else {
                    res.status(200).send({ ret_code: "000", ret_msg: '上传成功', path: resultName }).end()
                }
            })
        }
    })
})

//更新个人信息
server.use('/updateSelfInfo', (req, res, next) => {
    const sid = req.session['sid']
    // 新文章
    console.log('准备更新个人信息');
    db.query(`UPDATE user_list SET showName="${req.body.showName}",singName="${req.body.shortInt}",avatar="${req.body.avatar}"  WHERE ID=${sid}`, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send({ ret_code: "001", ret_msg: "更新个人信息错误" }).end()
        } else {
            res.status(200).send({ ret_code: "000", ret_msg: "发布成功" }).end()
        }
    })
})


//接口路由
server.use('/api', require(__dirname + '/router/api.js')());
server.use(express.static(__dirname + '/www'));

process.on('uncaughtException', function (err) {
    console.log(`${new Date().toLocaleString()}==捕捉错误==${err}`)
})

server.listen(8090)


