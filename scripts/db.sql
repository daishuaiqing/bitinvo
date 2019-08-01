/*
 * @Release: 0.0.1
 * @Type: Table
 */
-- 2015.12.20 by Nasetech
-- TODO: key index
DROP TABLE IF EXISTS `btv_gun`;
CREATE TABLE `btv_gun` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `code` VARCHAR(45) NOT NULL COMMENT '枪支编号',
  `type` INT(11) NULL COMMENT '枪支类别', 
  `status` CHAR(1) NULL COMMENT '枪支状态0-待入柜 1-已入柜 2-待出柜 3-已出柜',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_gun_type`;
CREATE TABLE `btv_gun_type` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` VARCHAR(45) NOT NULL COMMENT '枪支名称',
  `pic` INT(11) NULL COMMENT '枪支图片',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_gun_optlog`;
CREATE TABLE `btv_gun_optlog` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `action` CHAR(1) NOT NULL COMMENT '操作类型 0-调入柜，1-取出, 2-归还 3-调出柜, 4-超时未还, 5-其他错误',
  `detail` VARCHAR(500) NULL,
  `staff_id` INT(11) NULL COMMENT '操作人员',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `authorized_by` INT(16) NOT NULL,
  `authorized_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_bullettype`;
CREATE TABLE `btv_bullettype` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `code` VARCHAR(45) NOT NULL COMMENT '子弹编号',
  `status` CHAR(1) NULL COMMENT '枪支状态0-待入柜 1-已入柜 2-待出柜 3-已出柜',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_cert`;
CREATE TABLE `btv_cert` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `code` VARCHAR(45) NOT NULL COMMENT '编号',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_cabinet`;
CREATE TABLE `btv_cabinet` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `type` INT(11) NOT NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_cab_type`;
CREATE TABLE `btv_cab_type` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` VARCHAR(45) NOT NULL,
  `gun_module` TINYINT NULL,
  `bullet_module` TINYINT NULL,
  `cert_module` TINYINT NULL,
  `extra_info` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_cab_optlog`;
CREATE TABLE `btv_cab_optlog` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `action` CHAR(1) NOT NULL COMMENT '操作类型 0-调入柜，1-取出, 2-归还 3-调出柜, 4-超时未还, 5-其他错误',
  `detail` VARCHAR(500) NULL,
  `staff_id` INT(11) NULL COMMENT '操作人员',
  `module_id` INT(11) NULL COMMENT '仓位',
  `authorized_by` INT(16) NOT NULL,
  `authorized_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_module`;
CREATE TABLE `btv_module` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `cab_id` INT(11) NOT NULL,
  `gun_id` INT(11) NULL,
  `bullet_type_id` INT(11) NULL,
  `position` INT(11) NOT NULL,
  `type` CHAR(1) NOT NULL COMMENT '仓位类型 G-枪支, B-子弹, C-枪证',
  `num` INT(11) NULL COMMENT '对于枪和枪证来说，在位是1，空位是0，对于子弹来说就是库存量',
  `lock_status` CHAR(1) NULL COMMENT '锁的状态 0-关, 1-开, null是错误',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_user`;
CREATE TABLE `btv_user` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `account_id` INT(11) NULL,
  `name` VARCHAR(45) NOT NULL,
  `avatar_id` INT(11) NULL COMMENT '头像',
  `sex` CHAR(1) NULL,
  `age` tinyint NULL,
  `type` CHAR(1) NOT NULL COMMENT '可扩展',
  `detail` VARCHAR(500) NULL,
  `status` CHAR(1) NULL COMMENT '锁的状态 A-激活, D-未激活, null是错误',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_staff_hierarchy`;
CREATE TABLE `btv_staff_hierarchy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `user_id` INT(11) NOT NULL COMMENT '没有就不能登录',
  `parent_id` INT(11) NULL,
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_role`;
CREATE TABLE `btv_role` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `role_name` INT(11) NOT NULL,
  `user_group_id` INT(11) NULL,
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_staff_role`;
CREATE TABLE `btv_staff_role` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `staff_id` INT(11) NOT NULL,
  `role_id` INT(11) NULL,
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_role_usergroup`;
CREATE TABLE `btv_role_usergroup` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `usergroup_id` INT(11) NOT NULL,
  `role_id` INT(11) NULL,
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_staff_optlog`;
CREATE TABLE `btv_staff_optlog` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `action` CHAR(10) NOT NULL COMMENT '操作类型',
  `staff_id` INT(11) NULL COMMENT '操作人员',
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_org`;
CREATE TABLE `btv_org` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` CHAR(10) NOT NULL COMMENT '操作类型',
  `detail` VARCHAR(500) NULL,
  `loc_lat` FLOAT(10, 6) NULL,
  `loc_lng` FLOAT(10, 6) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_org_hierarchy`;
CREATE TABLE `btv_org_hierarchy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `parent_id` CHAR(10) NOT NULL COMMENT '操作类型',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_application`;
CREATE TABLE `btv_application` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `sender_id` INT(11) NOT NULL,
  `application_type_id` INT(11) NOT NULL,
  `status` CHAR(1) NULL COMMENT 'N-新建, A-批准, R-拒绝',
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_application_type`;
CREATE TABLE `btv_application_type` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` VARCHAR(500) NULL,
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_application_process`;
CREATE TABLE `btv_application_process` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `approved_by` INT(11) NOT NULL COMMENT '批准人',
  `detail` VARCHAR(500) NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_message`;
CREATE TABLE `btv_message` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `sender_id` INT(11) NOT NULL COMMENT '发送者staff_id',
  `type` CHAR(1) NULL COMMENT '是否群发，(G)roup群发, (P)eer单独',
  `level` CHAR(1) NULL COMMENT '1-7查看文档',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_message_deliver_task`;
CREATE TABLE `btv_message_deliver_task` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `message_id` INT(11) NOT NULL COMMENT '消息',
  `sender_id` CHAR(1) NULL COMMENT 'staff id',
  `receiver_id` CHAR(1) NULL COMMENT 'staff id',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_contact`;
CREATE TABLE `btv_contact` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `staff_id` INT(11) NOT NULL COMMENT '发送者staff_id',
  `owner_id` INT(11) NOT NULL COMMENT '发送者staff_id',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_contactgroup`;
CREATE TABLE `btv_contactgroup` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` INT(11) NOT NULL COMMENT '群名字',
  `contacts` VARCHAR(1000) NOT NULL COMMENT '联系人列表 staff id',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_fingerprint`;
CREATE TABLE `btv_fingerprint` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `staff_id` INT(11) NOT NULL COMMENT '拥有者',
  `fingerprint` VARCHAR(1000) NOT NULL COMMENT '特征码',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `btv_asset`;
CREATE TABLE `btv_asset` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` VARCHAR(45) NULL COMMENT '名字',
  `path` VARCHAR(500) NOT NULL COMMENT 'file path',
  `size` INT(11)  NULL,
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NULL,
  `username` VARCHAR(45) NULL COMMENT '名字',
  `username_canonical` VARCHAR(45) NULL COMMENT '名字',
  `email` VARCHAR(45) NULL COMMENT 'email',
  `email_canonical` VARCHAR(45) NULL COMMENT 'email',
  `password` VARCHAR(30) NOT NULL COMMENT 'pwd',
  `salt` VARCHAR(30) NOT NULL COMMENT 'salt',
  `is_activated` CHAR(1) NOT NULL COMMENT '是否激活，(Y)es, (N)o',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11)  NULL,
  `created_time` DATETIME  NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11)  NULL,
  `updated_time` DATETIME  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `group`;
CREATE TABLE `group` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `name` VARCHAR(45) NULL COMMENT '名字',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `user_action`;
CREATE TABLE `user_action` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(15) NOT NULL,
  `group_id` INT(11) NOT NULL,
  `name` VARCHAR(45) NULL COMMENT '名字',
  `uri` VARCHAR(500) NULL COMMENT 'URL or URI',
  `is_deleted` CHAR(1) NULL COMMENT '是否删除，(Y)es已删除, (N)o未删除',
  `created_by` INT(11) NOT NULL,
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT(11) NOT NULL,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uid_UNIQUE` (`uid` ASC),
  KEY `created_time` (`created_time` ASC)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;
