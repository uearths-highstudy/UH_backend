const express = require("express");
const router = express.Router();
const config = require('../config/jwt');
const jwt = require('jsonwebtoken');
const path = require('path');
const dbConnection = require('./db-connection-promise');
const login_check = require('./login_check');

router
.post('/findacademy', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'not login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.', errMsg: err });
        let [data] = await dbConnection.execute("SELECT name, exponent, location, number FROM academy WHERE name LIKE ?", [`%${req.body.academyname}%`]);
        if(data.length < 1) { return res.status(200).json({ result: 'not found', data: '검색 결과가 없습니다' }); }
        return res.status(200).json({ result: 'success', data });
    });
})
.post('/enrollment', async (req, res) => {
    let token = req.cookies.user;
    if(!token) return res.status(400).json({ result: 'no login', msg: '로그인이 되어있지 않습니다.' });
    jwt.verify(token, config.secret, async (err, decoded) => {
        if(err) return res.status(500).json({ result: 'token err', msg: 'token 에러가 발생하였습니다.' });
        const [data_] = await dbConnection.execute("SELECT * FROM academy WHERE name=? AND location=? AND number=?", [req.body.name, req.body.loc, req.body.pnum]);
        if(data_.length < 1) {
            const [result] = await dbConnection.execute("INSERT INTO academy (name, users, teachers, exponent, location, number) VALUES (?, ?, ?, ?, ?, ?)", [req.body.name, JSON.stringify({users:[]}), JSON.stringify({teachers:[decoded.unum]}), req.body.expo, req.body.loc, req.body.pnum]);
            
            if(result.affectedRows !== 1) {
                return res.status(500).json({ result: 'err', msg: '알수 없는 오류로 인해 학원등록에 실패하였습니다.\n다시시도해주시길 바랍니다.' });
            } else {
                let [data] = await dbConnection.execute("SELECT academy FROM users WHERE uid=?", [decoded.uid]);
                let academy_info = JSON.parse(data[0]['academy']).academy;
                academy_info.push(result.insertId);
                let [result_] = await dbConnection.await("UPDATE users SET academy=? WHERE uid=?", [JSON.stringify(academy_info), decoded.uid]);
                if(result_.affectedRows !== 1) {
                    return res.status(500).json({ result: 'err', msg: '알수 없는 오류로 인해 학원등록에 실패하였습니다.\n다시시도해주시길 바랍니다.' });
                } else {
                    return res.status(200).json({ result: 'success', msg: '정상적으로 학원 등록이 되었습니다.' });
                }
            }
        } else {
            return res.status(400).json({ result: 'fail', msg: '이미 이 학원정보는 등록되어 있습니다.' });
        }
    });
})
.post('/choose_academy',async (req, res)=>{
    
})
module.exports = router;