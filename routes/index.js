const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');
const dbConnection = require('./db-connection-promise');
const login_check = require('./login_check');
const login_required = require('./login_required');

router
.get('/', login_check, (req, res) => {
    let token = req.cookies.registerProfileSetting;
    if(token) res.clearCookie("registerProfileSetting");
    res.render('index');
})
.get('/login', login_check, (req, res) => { res.render('login'); })
.get('/register', login_check, (req, res) => {
    let token = req.cookies.registerProfileSetting;
    if(!token) { return res.render('register'); }
    else { return res.render("signup_profile"); }
})
.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/');
})
.get('/info', login_required, login_check, (req, res)=>{ res.render('my_info'); })
.get('/findacademy', login_required, login_check, (req, res)=>{ res.render('find_academy'); })
.get('/academyEnrollment', login_required, login_check, (req, res) => {
    jwt.verify(req.cookies.user, config.secret, (err, decoded) => {
        if(err) return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') });
        if(decoded.job == 'teacher') { return res.render("academy_enrollment"); }
        else { return res.redirect("/"); }
    });
})

module.exports = router;