const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { uuid } = require('uuidv4');
const { MailSend } = require('./Email-Send');
const dbConnection = require('./db-connection-promise');
const dbConnectionNotPromise = require('./db-connection');
const crypto = require('crypto');
const multer = require("multer");
const fs = require("fs");

let storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, path.join(__dirname, '../public/images/profiles/')); },
    filename: async function (req, file, cb) { cb(null, crypto.createHash("sha256").update(String(req.decoded.unum)+req.decoded.password_salt, "binary").digest("hex")); }
});
const upload = multer({ storage: storage });

router
.post('/email_send', async (req, res) => {
    try {
        if(!req.body.name || !req.body.age || !req.body.job || !req.body.uid || !req.body.password || !req.body.email) {
            return res.status(400).json({ result: 'scarce', msg: '필수 입력 요소중 입력되지 않은 것이 존재합니다.' });
        }
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE uid=? OR email=?", [req.body.uid, req.body.email]);
        if(data.length >= 1) {
            if(req.body.uid == data[0]['uid']) { return res.status(400).json({ result: 'userid', msg: '이미 존재하는 아이디가 있습니다.' }); }
            else if(req.body.email == data[0]['email']) { return res.status(400).json({ result: 'email', msg: '이미 사용하고 있는 이메일입니다.' }); }
        } else {
            let code = randomCode(7, 9);
            let pass_salt = uuid();
            let hash_pass = crypto.createHash("sha256").update(req.body.password+pass_salt, "binary").digest("hex");
            const [data_] = await dbConnection.execute("INSERT INTO users (uid, password, password_salt, age, email, name, job, academy, applied_academy, grade, token, email_verify) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [req.body.uid, hash_pass, pass_salt, req.body.age, req.body.email, req.body.name, req.body.job, JSON.stringify({academy:[]}), JSON.stringify({academy:[]}), req.body.grade, code, 0]);
            if(data_.affectedRows !== 1) {
                return res.status(500).json({ result: 'err', msg: '알수 없는 오류로 인해 회원등록에 실패하였습니다.\n다시시도해주시길 바랍니다.' });
            } else {
                MailSend(req.body.email, code);
                return res.status(200).json({ result: 'success', msg: '인증 이메일을 발송하였습니다!' });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ result: 'err', msg: '서버에서 알 수 없는 에러가 발생했습니다.' });
    }
})
.post('/email_verify', async (req, res) => {
    try {
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE email=?", [req.body.email]);
        if(data.length >= 1) {
            if(data[0]['token'] == req.body.code) {
                let [data_] = await dbConnection.execute("UPDATE users SET email_verify=1, token='' WHERE token=?", [req.body.code]);
                if(data_.info.indexOf("Changed: 1") != -1) {
                    res.cookie("registerProfileSetting", jwt.sign({uid: data[0]['uid']}, config.secret, {expiresIn: '3m'}));
                    return res.status(200).json({ result: 'success' });
                }
            } else {
                return res.status(400).json({ result: 'wrong_code', msg: '인증코드가 올바르지 않습니다.' });
            }
        } else {
            return res.status(400).json({ result: 'not found db', msg: '알 수 없는 email 정보입니다.' });
        }
    } catch(error) {
        console.log(error);
        return res.status(500).json({ result: 'err', msg: '서버에서 알 수 없는 에러가 발생했습니다.' });
    }
})

.post('/login', async (req, res) => {
    try {
        let user_id = req.body.uid != undefined ? req.body.uid : '';
        let user_email = req.body.email != undefined ? req.body.email : '';
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE uid=? OR email=? AND email_verify=?", [user_id, user_email, 1]);
        if(data.length < 1) return res.status(400).json({ msg: 'not found', msg: '아이디(또는 이메일) 또는 비밀번호가 일치하지 않습니다.' });
        else {
            let hash_pass = crypto.createHash("sha256").update(req.body.password+data[0]['password_salt']).digest("hex");
            if(data[0]['password'] == hash_pass) {
                let info = {
                    unum: data[0]['id'],
                    uid: data[0]['uid'],
                    name: data[0]['name'],
                    email: data[0]['email'],
                    job: data[0]['job'],
                    academy: data[0]['academy'],
                    age: data[0]['age'],
                    grade: data[0]['grade'],
                    unumh: crypto.createHash("sha256").update(String(data[0]['id'])+data[0]['password_salt']).digest("hex")
                }
                res.cookie("user", jwt.sign(info, config.secret));
                res.locals.lc = info;
                return res.status(200).json({ result: 'success' });
            } else {
                return res.status(400).json({ result: 'fail', msg: '아이디(또는 이메일) 또는 비밀번호가 일치하지 않습니다.' });
            }
        }
    } catch(error) {
        console.log(error);
        return res.status(500).json({ result: 'err', msg: '서버에서 알 수 없는 에러가 발생했습니다.' });
    }
})

.post('/overlap_id', async (req, res) => {
    try {
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE uid=?", [req.body.check_id]);
        if(data.length >= 1) {
            return res.status(200).json({ result: 'overlap', msg: '이미 사용중인 아이디가 존재합니다.' });
        } else {
            return res.status(200).json({ result: 'okay', msg: '중복확인된 아이디가 없습니다.' });
        }
    } catch(error) {
        console.log(error);
        return res.status(500).json({ result: 'err', msg: '서버에서 알 수 없는 에러가 발생했습니다.' });
    }
})
.post('/email_expired', async (req, res) => {
    try {
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE email=?", [req.body.email]);
        if(data.length >= 1) {
            let [result] = await dbConnection.execute("DELETE FROM users WHERE email=?", [req.body.email]);
            if(result.affectedRows !== 1) {
                return res.status(500).json({ result: 'err', msg: '알 수 없는 이유로 인해 회원 삭제가 이루어지지 않았습니다.' });
            } else {
                return res.status(200).json({ result: 'success' });
            }
        }
    } catch(error) {
        console.log(error);
        return res.status(500).json({ result: 'err', msg: '서버에서 알 수 없는 에러가 발생했습니다.' });
    }
})
.post('/profile_upload_r', f_check, upload.single('proImage'), (req, res) => {
    res.clearCookie('registerProfileSetting');
    return res.status(200).json({ result: 'success' });
})
.post('/profileUpload', ucheck, upload.single('proImage'), (req, res) => {
    return res.status(200).json({ result: 'success' });
})
.post('/setDefaultProfile', async (req, res) => {
    let token = req.cookies.user;
    if(!token) { return res.status(400).json({ result: 'not login', msg: '로그인 되어있지 않습니다.' }); }
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [data] = await dbConnection.execute('SELECT password_salt FROM users WHERE uid=?', [decoded.uid]);
        if(data.length < 1) return res.status(400).json({ result: 'not found', msg: '계정이 존재하지 않습니다.' });
        let profileName = crypto.createHash("sha256").update(String(decoded.unum)+data[0].password_salt, "binary").digest("hex");
        fs.unlink(path.join(__dirname, `../public/images/profiles/${profileName}`), (err) => {
            if(err) return res.status(400).json({ result: 'del err', msg: '이미 기본 프로필입니다.', errMsg: err });
            return res.status(200).json({ result: 'success' });
        });
    });
})
.post('/getCookie', (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'not login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        res.status(200).json({ result: 'success', data: decoded });
    });
})

module.exports = router;

function ucheck(req, res, next) {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'not login', msg: '로그인 되어있지 않습니다.' });
    jwt.verify(token, config.secret, (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        dbConnectionNotPromise.query('SELECT * FROM users WHERE uid=?', [decoded.uid], (err1, results) => {
            if(err1) return res.status(500).json({ result: 'db err', msg: '데이터베이스 조회하는 도중 에러가 발생하였습니다.' });
            if(results.length < 1) { return res.status(400).json({ result: 'not found', msg: '계정이 존재하지 않습니다.' }); }
            req.decoded = decoded;
            req.decoded.password_salt = results[0]['password_salt'];
            next();
        });
    });
}

function f_check(req, res, next) {
    let token = req.cookies.registerProfileSetting;
    if(!token) { return res.status(400).json({ result: 'no token', msg: '이메일 인증이 완전히 이루어지지 않았습니다.' }); }
    jwt.verify(token, config.secret, (err, decoded) => {
        if(err) { return res.status(400).json({ result: 'err', msg: '토큰을 분석하는 도중 에러가 발생하였습니다.' }); }
        dbConnectionNotPromise.query('SELECT * FROM users WHERE uid=?', [decoded.uid], (err, results) => {
            if(err) { return res.status(500).json({ result: 'err', msg: '데이터베이스 조회하는 도 중 에러가 발생하였습니다.' }); }
            if(results.length < 1) { res.clearCookie("registerProfileSetting"); return res.status(400).json({ result: 'not found', msg: '계정이 존재하지 않습니다.' }); }
            req.decoded = results[0];
            next();
        });
    });
}

function randomCode(min, max) {
    let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    let min_length = min;
    let max_length = max;
    let string_length = Math.floor(Math.random() * (max_length - min_length +1)) + min_length;
    let randomString = '';
    for(let i=0; i<string_length; i++) {
        let rnum = Math.floor(Math.random() * chars.length);
        randomString += chars.substring(rnum, rnum+1);
    }
    return randomString;
}