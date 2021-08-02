const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');
const dbConnection = require('./db-connection');
const login_check = require('./login_check')

router
.get('/', login_check, (req, res) => {
    res.render('index');
})
.get('/login', login_check, (req, res) => {
    res.render('login');
})
.get('/register', login_check, (req, res) => {
    res.render('register');
})

module.exports = router;