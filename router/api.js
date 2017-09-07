const express = require("express");
const mysql = require("mysql"); /*数据库*/

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'rssc1801',
    database: 'blog_vue'
});

module.exports = function () {
    var router = express.Router();
    const prefix = 934817;
    const userIdPerfix = 24500;

    router.use('/hasUser', (req, res, next) => {
        // let catalogue = req.query.catalogue
        let userId = req.query.userId || -1
        if (userId >= 0) {
            userId = userId - userIdPerfix
            db.query('SELECT * FROM `user_list` WHERE ID=' + userId, (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    if (!data.length) {
                        res.send({
                            code: -1,
                            message: '用户不存在'
                        })
                    }
                }
            })
        }
    });

    router.use('/articleList', (req, res, next) => {
        // let catalogue = req.query.catalogue
        let userId = req.query.userId || -1
        if (userId >= 0) {
            userId = userId - userIdPerfix
            db.query('SELECT * FROM `article_list` WHERE userId=' + userId + ' order by id desc limit 0,10', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    var list = data;
                    for (var i = 0; i < data.length; i++) {
                        var tags = data[i].tags.split('，');
                        list[i].tags = tags;
                        list[i].ID = prefix + data[i].ID;
                    }
                    var rs = { list: list };
                    res.send(rs)
                }
            })
        } else {
            db.query('SELECT * FROM `article_list` WHERE userId=1 order by id desc limit 0,10', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    var list = data;
                    for (var i = 0; i < data.length; i++) {
                        var tags = data[i].tags.split('，');
                        list[i].tags = tags;
                        list[i].ID = prefix + data[i].ID;
                    }
                    var rs = { list: list };
                    res.send(rs)
                }
            })
        }
    });

    router.use('/categories', (req, res, next) => {
        let userId = req.query.userId || -1
        if (userId >= 0) {
            db.query('SELECT * FROM `article_categories` WHERE userId=' + userId, (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    var list = data;
                    var rs = { list: list };
                    res.send(rs)
                }
            })
        } else {
            db.query('SELECT * FROM `article_categories` WHERE userId=1', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    var list = data;
                    var rs = { list: list };
                    res.send(rs)
                }
            })
        }

    });

    router.use('/articleDetail', (req, res, next) => {
        const articleId = req.query.articleId - prefix;
        db.query('SELECT * FROM `article_list` WHERE ID=' + articleId, (err, data) => {
            if (err) {
                res.status(500).send('数据库访问错误' + err)
            } else {
                if (!data.length) {
                    res.send({
                        code: -1,
                        message: '文章不存在'
                    })
                }
                var rs = data[0];
                res.send(rs)
            }
        })
    });

    return router;
}
