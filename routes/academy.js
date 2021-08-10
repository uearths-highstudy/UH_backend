const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');
const dbConnection = require('./db-connection-promise');
const login_check = require('./login_check');
const crypto = require("crypto");

router
.post('/findacademy', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'not login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.', errMsg: err });
        let [data] = await dbConnection.execute("SELECT id, name, exponent, location, number FROM academy WHERE name LIKE ?", [`%${req.body.academyname}%`]);
        if(data.length < 1) { return res.status(200).json({ result: 'not found', data: '검색 결과가 없습니다' }); }
        return res.status(200).json({ result: 'success', data });
    });
})
.post('/enrollment', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [check] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
        let user_academys = JSON.parse(check[0]['academy']).academy;
        let user_appli_academys = JSON.parse(check[0]['applied_academy']).academy;
        if(user_academys.length+user_appli_academys.length >= 3) return res.status(400).json({ result: 'fail', msg: '이미 세 개 이상의 학원을 가입하거나 신청하였습니다.' });
        const [data_] = await dbConnection.execute("SELECT * FROM academy WHERE name=? AND location=? AND number=?", [req.body.name, req.body.loc, req.body.pnum]);
        if(data_.length < 1) {
            const [result] = await dbConnection.execute("INSERT INTO academy (name, users, teachers, exponent, location, number, applicant) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.body.name, JSON.stringify({users:[]}), JSON.stringify({teachers:[decoded.unum]}), req.body.expo, req.body.loc, req.body.pnum, JSON.stringify({users:[]})]);
            
            if(result.affectedRows !== 1) {
                return res.status(500).json({ result: 'err', msg: '알수 없는 오류로 인해 학원등록에 실패하였습니다.\n다시시도해주시길 바랍니다.' });
            } else {
                let [data] = await dbConnection.execute("SELECT academy FROM users WHERE uid=?", [decoded.uid]);
                let academy_info = JSON.parse(data[0]['academy']);
                academy_info.academy.push(result.insertId);
                let [result_] = await dbConnection.execute("UPDATE users SET academy=? WHERE uid=?", [JSON.stringify(academy_info), decoded.uid]);
                if(result_.affectedRows !== 1) {
                    return res.status(500).json({ result: 'err', msg: '알수 없는 오류로 인해 학원등록에 실패하였습니다.\n다시시도해주시길 바랍니다.' });
                } else {
                    let [_data] = await dbConnection.execute("SELECT * FROM users WHERE uid=? AND email=? AND email_verify=?", [decoded.uid, decoded.email, 1]);
                    let info = {
                        unum: _data[0]['id'],
                        uid: _data[0]['uid'],
                        name: _data[0]['name'],
                        email: _data[0]['email'],
                        job: _data[0]['job'],
                        academy: _data[0]['academy'],
                        age: _data[0]['age'],
                        grade: _data[0]['grade'],
                        unumh: crypto.createHash("sha256").update(String(_data[0]['id'])+_data[0]['password_salt']).digest("hex")
                    }
                    res.clearCookie('user');
                    res.cookie("user", jwt.sign(info, config.secret));
                    res.locals.lc = info;
                    return res.status(200).json({ result: 'success', msg: '정상적으로 학원 등록이 되었습니다.' });
                }
            }
        } else {
            return res.status(400).json({ result: 'fail', msg: '이미 이 학원정보는 등록되어 있습니다.' });
        }
    });
})
.post('/choose_academy', async (req, res)=>{
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [check] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
        let user_academys = JSON.parse(check[0]['academy']).academy;
        let user_appli_academys = JSON.parse(check[0]['applied_academy']).academy;
        if(user_academys.length+user_appli_academys.length >= 3) return res.status(400).json({ result: 'fail', msg: '이미 세 개 이상의 학원을 가입하거나 신청하였습니다.' });
        let [data] = await dbConnection.execute("SELECT * FROM academy WHERE id=? AND name=?", [req.body.choosen_academy.id, req.body.choosen_academy.name]);
        if(data.length < 1) return res.status(400).json({ result: 'not found', msg: '등록된 학원정보가 없습니다.' });
        let applicants = JSON.parse(data[0]['applicant']);
        if(applicants.users.indexOf(decoded.unum) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 신청한 학원입니다.' });
        let users = JSON.parse(data[0]['users']).users;
        let teachers = JSON.parse(data[0]['teachers']).teachers;
        if(users.indexOf(decoded.unum) !== -1 || teachers.indexOf(decoded.unum) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 가입한 학원입니다.' });
        applicants.users.push(decoded.unum);
        let [result] = await dbConnection.execute("UPDATE academy SET applicant=? WHERE id=? AND name=?", [JSON.stringify(applicants), req.body.choosen_academy.id, req.body.choosen_academy.name]);
        if(result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '학원 등록 신청하는 도중 에러가 발생하였습니다.' });
        else {
            let [data_] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
            if(data_.length < 1) return res.status(400).json({ result: 'not found', msg: '계정이 존재하지 않습니다.' });
            let aAcademy = JSON.parse(data_[0]['applied_academy']);
            aAcademy.academy.push(data[0]['id']);
            let [result_] = await dbConnection.execute("UPDATE users SET applied_academy=? WHERE id=?", [JSON.stringify(aAcademy), decoded.unum]);
            if(result_.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '학원 등록 신청하는 도중 에러가 발생하였습니다.' });
            else {
                let [_data] = await dbConnection.execute("SELECT * FROM users WHERE uid=? AND email=? AND email_verify=?", [decoded.uid, decoded.email, 1]);
                let info = {
                    unum: _data[0]['id'],
                    uid: _data[0]['uid'],
                    name: _data[0]['name'],
                    email: _data[0]['email'],
                    job: _data[0]['job'],
                    academy: _data[0]['academy'],
                    age: _data[0]['age'],
                    grade: _data[0]['grade'],
                    unumh: crypto.createHash("sha256").update(String(_data[0]['id'])+_data[0]['password_salt']).digest("hex")
                }
                res.clearCookie('user');
                res.cookie("user", jwt.sign(info, config.secret));
                res.locals.lc = info;
                return res.status(200).json({ result: 'success' });
            }
        }
    });
})

.post("/get_applicant", async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        if(decoded.job == 'teacher') {
            let user_academy = JSON.parse(decoded.academy).academy;
            if(user_academy.length < 1) return res.status(400).json({ result: 'no academy', msg: '가입된 학원이 없습니다.' });
            let appli_info = {};
            for(let i_ in user_academy) {
                let [academy_info] = await dbConnection.execute("SELECT name, location, number FROM academy WHERE id=?", [user_academy[i_]]);
                let [data] = await dbConnection.execute("SELECT * FROM academy WHERE name=? AND location=? AND number=?", [academy_info[0].name, academy_info[0].location, academy_info[0].number]);
                if(data.length < 1) return res.status(400).json({ result: 'not found', msg: '학원정보가 존재하지 않습니다.' });
                let applicants = JSON.parse(data[0].applicant).users;
                if(applicants.length < 1) { continue; }
                let query = "SELECT id, uid, email, name, age, job, grade FROM users WHERE id IN (";
                for(let i of applicants) {
                    if(i == applicants[applicants.length-1]) {query += String(i);}
                    else query += String(i)+", ";
                }
                query += ")";
                let [data_] = await dbConnection.execute(query);
                if(data_.length < 1) continue;
                appli_info[academy_info[0].name] = data_;
            }
            return res.status(200).json({ result: 'success', data: appli_info });
        } else {
            return res.status(400).json({ result: 'fail', msg: '선생님 계정이 아닙니다.' });
        }
    });
})
.post('/cancel', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [decoded.unum]);
        if(data.length < 1) return res.status(400).json({ result: 'not found', msg: '신청중인 학원이 없습니다.' });
        let appli_academy = JSON.parse(data[0]['applied_academy']);
        appli_academy.academy.splice(appli_academy.academy.indexOf(req.body.academy_id), 1);
        let [result] = await dbConnection.execute("UPDATE users SET applied_academy=? WHERE id=?", [JSON.stringify(appli_academy), decoded.unum]);
        if(result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '학원 신청을 취소하는 도중 에러가 발생하였습니다.' });

        let [data_] = await dbConnection.execute("SELECT * FROM academy WHERE id=?", [req.body.academy_id]);
        let appli_user = JSON.parse(data_[0]['applicant']);
        if(appli_user.users.indexOf(decoded.unum) !== -1) {
            appli_user.users.splice(appli_user.users.indexOf(decoded.unum), 1);
            let [result_] = await dbConnection.execute("UPDATE academy SET applicant=? WHERE id=?", [JSON.stringify(appli_user), req.body.academy_id]);
            if(result_.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '학원 신청을 취소하는 도중 에러가 발생하였습니다.' });
            res.status(200).json({ result: 'success' });
        } else {
            res.status(400).json({ result: 'fail', msg: '신청 중인 학원이 아닙니다.' });
        }
    });
})
.post('/accept', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [academy] = await dbConnection.execute("SELECT * FROM academy WHERE id=?", [req.body.academy_id]);
        if(academy.length < 1) return res.status(400).json({ result: 'fail', msg: '학원 아이디가 잘못되었습니다.' });
        let academy_teacher = JSON.parse(academy[0]['teachers']).teachers;
        if(academy_teacher.indexOf(Number(decoded.unum)) == -1) return res.status(400).json({ result: 'fail', msg: '학원의 선생님이 아닙니다.' });

        let academy_applicants = JSON.parse(academy[0]['applicant']);

        if(academy_applicants.users.indexOf(Number(req.body.applicant_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참가신청하지 않았습니다.' });
        academy_applicants.users.splice(academy_applicants.users.indexOf(Number(req.body.applicant_id)), 1);
        let academy_users = JSON.parse(academy[0]['users']);
        if(academy_users.users.indexOf(Number(req.body.applicant_id)) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 가입된 신청자입니다.' });
        academy_users.users.push(Number(req.body.applicant_id));

        let [appli_data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [req.body.applicant_id]);
        if(appli_data.length < 1) return res.status(400).json({ result: 'fail', msg: '신청자의 정보가 존재하지 않습니다.' });

        let appli_academy = JSON.parse(appli_data[0]['applied_academy']);
        let user_applicant_data = JSON.parse(appli_data[0]['academy']);
        
        if(appli_academy.academy.indexOf(Number(req.body.academy_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참가신청하지 않았습니다.' });
        appli_academy.academy.splice(appli_academy.academy.indexOf(Number(req.body.academy_id)), 1);
        if(user_applicant_data.academy.indexOf(Number(req.body.academy_id)) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 가입된 신청자입니다.' });
        user_applicant_data.academy.push(Number(req.body.academy_id));

        let [user_result] = await dbConnection.execute("UPDATE users SET academy=?, applied_academy=? WHERE id=?", [JSON.stringify(user_applicant_data), JSON.stringify(appli_academy), req.body.applicant_id]);
        if(user_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '승인하는 과정에서 에러가 발생하였습니다.' });
        
        let [academy_result] = await dbConnection.execute("UPDATE academy SET users=?, applicant=? WHERE id=?", [JSON.stringify(academy_users), JSON.stringify(academy_applicants), req.body.academy_id]);
        if(academy_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '승인하는 과정에서 에러가 발생하였습니다.' });
        res.status(200).json({ result: 'success' });
    });
})
.post('/reject', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [academy] = await dbConnection.execute("SELECT * FROM academy WHERE id=?", [req.body.academy_id]);
        if(academy.length < 1) return res.status(400).json({ result: 'fail', msg: '학원 아이디가 잘못되었습니다.' });
        let academy_teacher = JSON.parse(academy[0]['teachers']).teachers;
        if(academy_teacher.indexOf(Number(decoded.unum)) == -1) return res.status(400).json({ result: 'fail', msg: '학원의 선생님이 아닙니다.' });

        let academy_applicants = JSON.parse(academy[0]['applicant']);
        if(academy_applicants.users.indexOf(Number(req.body.applicant_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참갸신청하지 않았습니다.' });
        academy_applicants.users.splice(academy_applicants.users.indexOf(Number(req.body.applicant_id)), 1);
        
        let [appli_data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [req.body.applicant_id]);
        if(appli_data.length < 1) return res.status(400).json({ result: 'fail', msg: '신청자의 정보가 존재하지 않습니다.' });

        let appli_academy = JSON.parse(appli_data[0]['applied_academy']);
        if(appli_academy.academy.indexOf(Number(req.body.academy_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참가신청에 않았습니다.' });
        appli_academy.academy.splice(appli_academy.academy.indexOf(Number(req.body.academy_id)), 1);

        let [user_result] = await dbConnection.execute("UPDATE users SET applied_academy=? WHERE id=?", [JSON.stringify(appli_academy), req.body.applicant_id]);
        if(user_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '거절하는 과정에서 에러가 발생하였습니다.' });

        let [academy_result] = await dbConnection.execute("UPDATE academy SET applicant=? WHERE id=?", [JSON.stringify(academy_applicants), req.body.academy_id]);
        if(academy_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '거절하는 과정에서 에러가 발생하였습니다.' });
        res.status(200).json({ result: 'success' });
    });
})
.post('/t_accept', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        let [academy] = await dbConnection.execute("SELECT * FROM academy WHERE id=?", [req.body.academy_id]);
        if(academy.length < 1) return res.status(400).json({ result: 'fail', msg: '학원 아이디가 잘못되었습니다.' });
        let academy_teacher = JSON.parse(academy[0]['teachers']).teachers;
        if(academy_teacher.indexOf(Number(decoded.unum)) == -1) return res.status(400).json({ result: 'fail', msg: '귀하는 학원의 선생님이 아닙니다.' });

        let academy_applicants = JSON.parse(academy[0]['applicant']);
        let [appli_data] = await dbConnection.execute("SELECT * FROM users WHERE id=?", [req.body.applicant_id]);
        if(appli_data.length < 1) return res.status(400).json({ result: 'fail', msg: '신청자의 정보가 존재하지 않습니다.' });
        
        if(appli_data[0]['job'] != 'teacher') return res.status(400).json({ result: 'fail', msg: '신청자는 선생님이 아닙니다.' });

        let appli_academy = JSON.parse(appli_data[0]['applied_academy']);
        let user_applicant_data = JSON.parse(appli_data[0]['academy']);

        if(academy_applicants.users.indexOf(Number(req.body.applicant_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참가신청하지 않았습니다.' });
        academy_applicants.users.splice(academy_applicants.users.indexOf(Number(req.body.applicant_id)), 1);
        let academy_teachers = JSON.parse(academy[0]['teachers']);
        if(academy_teachers.teachers.indexOf(Number(req.body.applicant_id)) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 가입된 신청자입니다.' });
        academy_teachers.teachers.push(Number(req.body.applicant_id));
        
        if(appli_academy.academy.indexOf(Number(req.body.academy_id)) == -1) return res.status(400).json({ result: 'fail', msg: '신청자는 이 학원에 참가신청하지 않았습니다.' });
        appli_academy.academy.splice(appli_academy.academy.indexOf(Number(req.body.academy_id)), 1);
        if(user_applicant_data.academy.indexOf(Number(req.body.academy_id)) !== -1) return res.status(400).json({ result: 'fail', msg: '이미 가입된 신청자입니다.' });
        user_applicant_data.academy.push(Number(req.body.academy_id));

        let [user_result] = await dbConnection.execute("UPDATE users SET academy=?, applied_academy=? WHERE id=?", [JSON.stringify(user_applicant_data), JSON.stringify(appli_academy), req.body.applicant_id]);
        if(user_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '승인하는 과정에서 에러가 발생하였습니다.' });
        
        let [academy_result] = await dbConnection.execute("UPDATE academy SET teachers=?, applicant=? WHERE id=?", [JSON.stringify(academy_teachers), JSON.stringify(academy_applicants), req.body.academy_id]);
        if(academy_result.affectedRows !== 1) return res.status(500).json({ result: 'err', msg: '승인하는 과정에서 에러가 발생하였습니다.' });
        res.status(200).json({ result: 'success' });
    });
})

module.exports = router;