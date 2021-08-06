const { smtpTransport } = require('./email');

const MailSend = function(mail, code) {
    emailTemplete = `<html>
<body>
<div style="border:1px solid #353866;background-color:white">
<div style="text-align: center; font-size: 35px;height: 70px;background-color: #11101d;color: white;line-height: 70px;">하이스터디</div>
<div style="padding:10px; text-align:center; margin:auto; width:90%;">
<div style="font-size: 20px;font-weight: bold;height:40px;">회원 가입을 위한 인증번호 입니다.</div>
<div style="font-size: 16px;height:40px;">아래 인증번호를 회원가입 페이지에 입력하여 인증해주시길 바랍니다.</div>
<div style="border: 1px solid black;background-color: #FADD81;display:flex; width:60%; margin:auto">
<div style="height:80px;line-height: 80px;width:30%;font-weight: bold;font-size: 20px;text-align: center;">인증번호 | </div>
<div style="width:70%;height:80px;font-size: 20px;line-height:80px;">${code}</div>
</div>
<div style="font-size: 17px;margin-top: 30px;">감사합니다. 남은 회원가입 절차를 마무리하여 주시기 바랍니다</div>
</div>
</div>
</body>
</html>`;
    const mailOptions = {
        from: 'highstudy6@gmail.com',
        to: mail,
        subject: "[ High Study ]인증 관련 이메일 입니다.",
        html: emailTemplete
    };

    smtpTransport.sendMail(mailOptions, (err) => {
        if(err) { console.log(err); }
        smtpTransport.close();
    });
};


module.exports={MailSend}