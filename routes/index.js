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
.get('/info', login_required, login_check, async (req, res)=>{
    jwt.verify(req.cookies.user, config.secret, async (err, decoded) => {
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
        let academys = JSON.parse(data[0]['academy']).academy;
        if(academys.length > 0) {
            let query = "SELECT name FROM academy WHERE id IN (";
            for(let i of academys) {
                if(i == academys[academys.length-1]) {query += String(i);}
                else query += String(i)+", ";
            }
            query += ")";
            let [academy_result] = await dbConnection.execute(query);
            res.locals.academys = academy_result;
        } else {
            res.locals.academys = false;
        }
        res.render('my_info');
    });
})
.get('/findacademy', login_required, login_check, (req, res)=>{ res.render('find_academy'); })
.get('/academyEnrollment', login_required, login_check, (req, res) => {
    jwt.verify(req.cookies.user, config.secret, (err, decoded) => {
        if(err) return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') });
        if(decoded.job == 'teacher') { return res.render("academy_enrollment"); }
        else { return res.redirect("/"); }
    });
})
.get('/myacademy/:academy_id', login_required, login_check, async (req, res) => {
    try {
        let ko_grade = {
            "middle-1": "중 1",
            "middle-2": "중 2",
            "middle-3": "중 3",
            "high-1": "고 1",
            "high-2": "고 2",
            "high-3": "고 3"
        }
        res.locals.kg = ko_grade;
        jwt.verify(req.cookies.user, config.secret, async (err, decoded) => {
            let academy_id = req.params.academy_id;
            let [data] = await dbConnection.execute("SELECT * FROM academy WHERE id=?", [academy_id]);
            if(data.length < 1) return res.send("<script>history.back();</script>");
            res.locals.academy_name = data[0]['name'];
            res.locals.academy_id = data[0]['id'];
            let users = JSON.parse(data[0]['users']).users;
            let teachers = JSON.parse(data[0]['teachers']).teachers;
            if(users.indexOf(decoded.unum) === -1) if(teachers.indexOf(decoded.unum) === -1) return res.send("<script>history.back();</script>");
            if(users.length > 0) {
                let query = "SELECT name FROM users WHERE id IN (";
                for(let i of users) {
                    if(i == users[users.length-1]) {query += String(i);}
                    else query += String(i)+", ";
                }
                query += ") ORDER BY `name` ASC LIMIT 1000";
                let [users_data] = await dbConnection.execute(query);

                let appli_users = JSON.parse(data[0]['applicant']).users;
                res.locals.applicant = [];
                if(appli_users.length > 0) {
                    let query = "SELECT id, uid, name, age, grade, job FROM users WHERE id IN (";
                    for(let i of appli_users) {
                        if(i == appli_users[appli_users.length-1]) {query += String(i);}
                        else query += String(i)+", ";
                    }
                    query += ") ORDER BY `name` ASC LIMIT 1000";
                    let [appli_result] = await dbConnection.execute(query);
                    res.locals.applicant = appli_result;
                }
                res.locals.users_data = users_data;
                res.render('my_academy');
            } else if(teachers.length > 0) {
                let query = "SELECT name FROM users WHERE id IN (";
                for(let i of teachers) {
                    if(i == teachers[teachers.length-1]) {query += String(i);}
                    else query += String(i)+", ";
                }
                query += ") ORDER BY `name` ASC LIMIT 1000";
                let [users_data] = await dbConnection.execute(query);

                let appli_users = JSON.parse(data[0]['applicant']).users;
                res.locals.applicant = [];
                if(appli_users.length > 0) {
                    let query = "SELECT id, uid, name, age, grade, job FROM users WHERE id IN (";
                    for(let i of appli_users) {
                        if(i == appli_users[appli_users.length-1]) {query += String(i);}
                        else query += String(i)+", ";
                    }
                    query += ") ORDER BY `name` ASC LIMIT 1000";
                    let [appli_result] = await dbConnection.execute(query);
                    res.locals.applicant = appli_result;
                }
                res.locals.users_data = users_data;
                res.render('my_academy');
            } else {
                res.locals.applicant = [];
                res.locals.users_data = false;
                res.render('my_academy');
            }
        });
    } catch(err) {
        console.log(err);
        res.send("<script>alert('서버에 예상치 못한 에러가 발생하였습니다.');history.back();</script>");
    }
})
.get('/myacademy', login_required, login_check, async (req, res) => {
    let token = req.cookies.user;
    res.locals.academy = false;
    res.locals.appli_academy = false;
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.sendFile('tokenErr.html', { root: path.join(__dirname, '../public/html/err') });
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
        let appli_academy = JSON.parse(data[0]['applied_academy']).academy;
        if(appli_academy.length > 0) {
            let query = "SELECT id, name, exponent FROM academy WHERE id IN (";
            for(let i of appli_academy) {
                if(i == appli_academy[appli_academy.length-1]) {query += String(i);}
                else query += String(i)+", ";
            }
            query += ")";
            let [appli_result] = await dbConnection.execute(query);
            res.locals.appli_academy = appli_result;
        }
        let academy = JSON.parse(data[0]['academy']).academy;
        if(academy.length+appli_academy.length < 1) return res.send("<script>alert('학원을 한 개 이상 가입해주세요.');location.replace('/findacademy');</script>");
        if(academy.length+appli_academy.length == 1) return res.redirect(`/myacademy/${academy[0]}`);
        else {
            let query = "SELECT id, name, exponent FROM academy WHERE id IN (";
            for(let i of academy) {
                if(i == academy[academy.length-1]) {query += String(i);}
                else query += String(i)+", ";
            }
            query += ")";
            let [academys] = await dbConnection.execute(query);
            res.locals.academy = academys;
            return res.render('myAcademys');
        }
    });
})
.get('/notice', login_required, login_check,(req, res) => { res.render('notice'); })
.get('/problem', login_required, login_check,(req, res) => { res.render('problem'); })

module.exports = router;