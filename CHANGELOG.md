# CHANGELOG
---
## Unreleased
### Added
- `get /gun/initABGun` 以柜机实际枪支状态重置AB枪状态
## [1.3.0] - 2019-03-04
### Added
- 取枪完成摄像头画面推送, 当前websocket端口为 8082, 8084
- `GET /cabinet/preVCode` 获取生成超级用户时的预验证码
- script/genCode.js 获取验证码
- 系统设置增加key __adminSignature__ 队长签名
- `POST /cabinetmodule/recordABGun` 手动记录AB枪, 继续申请时传入当前工单的枪ID __gunId__ 柜机ID __cabinetId__
### Changed
- `/user/addSuperUser` 增加动态验证
- `/cabinetmodule/openBatch` 在存枪/存弹时, 传入的moduleType分别为gun/bullet, action分别为storageGun/storageBullet
- `/opelog/openLog` 在存枪/存弹时, 传入的moduleType分别为gun/bullet, action分别为storageGun/storageBullet
- `/application/storageCheck` 返回提交工单时传入的模块列表
- `/application/adminauthbyface` 返回 user 用户信息
- adminauth adminauthbyfinger adminauthbyface 增加字段 __applicationList__ , 当有批量申请的工单时传入工单id字符串, 如 id1,id2,id3
### Fixed
- `/cabinet/webcam` 关闭没有重置端口