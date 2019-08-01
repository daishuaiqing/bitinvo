var moment = require('moment')
var code = process.argv[2]
if (!code) console.log('请输入预验证码')
code = code * moment().year() * moment().month() / moment().day()
console.log(String(code).slice(0, 6))