const { smtpTransport } = require('./email');

const MailSend = function(mail, code) {
    emailTemplete = `<html>
<body>
  <div>
    <p style='color:black'>회원 가입을 위한 인증번호 입니다.</p>
    <p style='color:black'>아래 인증번호를 회원가입 페이지에 입력하여 인증해주시길 바랍니다.</p>
    <span style='color:blue;font-size: 2em;display:inline-block;padding:12px;background:#1d1b31;color:white;'>${code}</span>
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