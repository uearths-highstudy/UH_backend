const jwt = require('jsonwebtoken');
const config = require('../config/jwt');
const path = require('path');

module.exports = (req, res, next) => {
    let token = req.cookies.user;
    if(!token) {
        res.locals.lc = null;
        next();
    } else {
        jwt.verify(token, config.secret, (err, decoded) => {
            if(err) { console.log(err);return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') }); }
            res.locals.lc = decoded;
            next();
        });
    }
};