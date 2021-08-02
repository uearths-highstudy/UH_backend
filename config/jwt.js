let jwtObj = {};
jwtObj.secret = process.env.JWT_KEY;
module.exports = jwtObj