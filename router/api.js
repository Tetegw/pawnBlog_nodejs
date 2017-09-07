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

    // 检测用户是否存在
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

    // 获取文章列表
    router.use('/articleList', (req, res, next) => {
        let columnId = req.query.columnId
        let userId = req.query.userId || -1
        if (userId >= 0) {
            // 通过用户ID获取文章列表
            userId = userId - userIdPerfix
            db.query('SELECT * FROM `article_list` WHERE userId=' + userId + ' order by id desc limit 0,10', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    data.forEach(function (item) {
                        var tags = item.tags.split('，');
                        item.tags = tags;
                        item.ID = prefix + item.ID;
                        delete item.userId
                    }, this);
                    var rs = { list: data };
                    res.send(rs)
                }
            })
        } else if (columnId && columnId >= 0) {
            // 选择栏目获取文章列表
            db.query('SELECT * FROM `article_list` WHERE columnId=' + columnId + ' order by id desc limit 0,10', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    data.forEach(function (item) {
                        var tags = item.tags.split('，');
                        item.tags = tags;
                        item.ID = prefix + item.ID;
                        delete item.userId
                    }, this);
                    var rs = { list: data };
                    res.send(rs)
                }
            })
        } else {
            db.query('SELECT * FROM `article_list` WHERE userId=1 order by id desc limit 0,10', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    data.forEach(function (item) {
                        var tags = item.tags.split('，');
                        item.tags = tags;
                        item.ID = prefix + item.ID;
                        delete item.userId
                    }, this);
                    var rs = { list: data };
                    res.send(rs)
                }
            })
        }
    });

    // 获取栏目
    router.use('/categories', (req, res, next) => {
        let userId = req.query.userId || -1
        if (userId >= 0) {
            userId = userId - userIdPerfix
            db.query('SELECT * FROM `article_categories` WHERE userId=' + userId, (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    data.forEach(function (item) {
                        delete item.userId
                    }, this);
                    var rs = { list: data };
                    res.send(rs)
                }
            })
        } else {
            db.query('SELECT * FROM `article_categories` WHERE userId=1', (err, data) => {
                if (err) {
                    res.status(500).send('数据库访问错误' + err)
                } else {
                    data.forEach(function (item) {
                        delete item.userId
                    }, this);
                    var rs = { list: data };
                    res.send(rs)
                }
            })
        }

    });

    // 获取文章详情
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
                } else {
                    var rs = data[0];
                    delete rs.userId
                    res.send(rs)
                }
            }
        })
    });

    return router;
}
