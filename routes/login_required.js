const jwt = require('jsonwebtoken');
const config = require('../config/jwt');
const path = require('path');

module.exports = (req, res, next) => {
    let token = req.cookies.user;
    if(!token) {
        return res.redirect('/login');
    } else {
        jwt.verify(token, config.secret, (err, decoded) => {
            if(err) { return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') }); }
            next();
        });
    }
};