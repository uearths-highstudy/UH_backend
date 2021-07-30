const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');

router
.get('/', login_check, (req, res) => {
    res.render('index');
})

module.exports = router;

function login_check(req, res, next) {
    let token = req.cookies.user;
    if(!token) {
        res.locals.lc = null;
        next();
    } else {
        jwt.verify(token, config.secret, (decoded, err) => {
            if(err) { return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') }); }
            res.locals.lc = true;
            next();
        });
    }
}