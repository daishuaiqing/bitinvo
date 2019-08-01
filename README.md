# Box

杭州纳舍科技有限公司版权所有
未经授权，不得传播和拷贝以及以任意方式复制、销售本项目中的代码和设计

#Pitfall
1 如果需要在dev模式下远程访问， 需要在config/local.js中添加 webpackUrl : 'http://192.168.1.108:8080/dist'， 把地址换成你的ip


# Migration to lubuntu @Boundary notes

1 must rebuild nodejs from source
2 must build sqlite3 from source: ../configure --host=arm-linux config_BUILD_CC=gcc config_TARGET_CC=arm-linux-gcc --disable-
tcl config_TARGET_READLINE_INC=" " see http://www.sqlite.org/cvstrac/wiki?p=HowToCompile
3 must rebuild bcrypt
4 must rebuild sqlite3 : npm install sqlite3 --build-from-source
5 rebuild sudo npm install waterline-sqlite3 --save --verbose


#Pitfall

1。 在Jade中， 如果有一个variable叫做name, 但是你没有指定这个name的值， 那么jade会在整个页面范围找全局的name， 这个时候可能有一个html element 的id刚好是name， 那么jade就会用那个name， 而你所有的空值check就会失效， 所以在所有传入jade 模板的值都需要加上一个data的包装， 具体请看ord management中的代码
        p.user-role #{data.id}
        .clearfix
          h4.user-name.pull-left #{data.name} 
        .updated-time 上级部门 #{ typeof(data.superior) !== 'undefined' ? data.superior.name : '无' }
2. 启动方式 chromium-egl --kiosk --touch-devices --touch-events --disable-pinch  --incognito http://localhost/m/home &

    sudo pm2 start app.js --log-date-format "YYYY-MM-DD HH:mm Z" -- lift --prod --verbose


