const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "config", process.env.NODE_ENV == "production" ? ".env" : ".env.dev")
});
const express = require("express");
const logger = require("morgan");
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const parser = bodyParser.urlencoded({extended:false});
const login_check = require('./routes/login_check');
const fileupload = require("express-fileupload");

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:false, limit:"1mb"}));
app.use(express.json({limit:"1mb"}));
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, '/public')));
app.use(cookieParser());

app.use('/', require('./routes/index.js'));
app.use('/account', require('./routes/account.js'));

app.use(login_check, (req, res) => { err404(req, res); });

app.listen(3000, () => { console.log("Connected !"); });

function err404(req, res) { res.render('404'); }