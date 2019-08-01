1 所有app在跳转之后必须从dom中摘除掉
2 app之间的通信通过pubsub， 以及director的inject的方法来通信
3 当前app下的component的通信，通过jquery的trigger方法及on来进行， 可以使用promise， 这个是jquery的event系统
4 不管通信的方式是什么， 都没有关系，但是同样的事情只能在一个地方来做， Linux的原则，做一件事情并且做好
5 使用最简单的方式， 如果一个变量可以解决的问题，绝对不用getter setter
6 这是一个信息系统，只有询问状态，改变状态,发布状态pubs,关注状态subs四种操作, 其中主动的是询问状态和发布状态, 被动的是改变状态和关注状态, 询问状态， 改变状态的函数需要返回值， 发布和关注状态函数的本身则不需要返回值
7 App 都是单例的， 所以这样可以使用pubsub， 而component是可以多个实例的， 所以必须使用jquery的event，而且是要有层级的
8 JavaScript is the first-class citizen in 这个framework， 所有的html-> js, jade-> js, css-> js, 然后通过webpack模块化，通过他异步加载