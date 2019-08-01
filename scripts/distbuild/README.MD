1 进入bitinvo文件夹
2 运行命令npm run dist
3 如果不是自动build的包， 那么需要你在项目根目录（bitinvo）下建立version.json
 {
    "app" : {
      "tag" : "customizebuild",
      "commit" : "0f5fdef99d8513c939a51befab5c7b833c481b85",
      "SGSCom" : {},
      "buildTime" : "11/26/2016 13:09"
    }
  }
4 执行scripts/distbuild/compress.sh
5 返回上一级文件夹找到bitinvo_dist, 进入执行 ./remote_depoly_dist.sh ubuntu@192.168.0.102 /home/ubuntu
6 完成了之后可以看到test connection, 然后可以测试成功