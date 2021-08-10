const jwt = require('jsonwebtoken');
const config = require('../config/jwt');
const path = require('path');
const dbConnection = require('./db-connection');

module.exports = (req, res, next) => {
    let token = req.cookies.user;
    if(!token) {
        res.locals.lc = null;
        res.locals.authority = false;
        next();
    } else {
        jwt.verify(token, config.secret, (err, decoded) => {
            if(err) { console.log(err);return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') }); }
            res.locals.lc = decoded;
            let sql = 'SELECT * FROM users WHERE id=?';
            dbConnection.query(sql, [decoded.unum], (err, data) => {
                if(err) { console.log(err);return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') }); }
                res.locals.authority = JSON.parse(data[0]['authority']);
                next();
            });
        });
    }
};