drop procedure if exists load_test_data_user;
delimiter #
create procedure load_test_data_user()
begin

declare v_max int unsigned default 10000;
declare v_counter int unsigned default 0;

  start transaction;
  while v_counter < v_max do
INSERT INTO `bitinvo`.`user`
(`username`,
`identityNumber`,
`alias`,
`aliasSpell`,
`phone`,
`email`,
`sex`,
`superior`,
`age`,
`type`,
`status`,
`details`,
`isDummy`,
`device`,
`info`,
`position`,
`activeConnections`,
`token`,
`org`,
`isBlock`,
`uid`,
`isDeleted`,
`userIp`,
`createdBy`,
`updatedBy`,
`createdAt`,
`updatedAt`)
VALUES
('testUser_'+v_counter, '113456789' + v_counter , '管理员账户', NULL, '13706811609', 'xiangnong@gmail.com', 'M', NULL, '30', NULL, 'active', 'go', '0', NULL, NULL, '2', '[\"mqQ5l_AhyXgN6fkDLmqCHtgPFQFWDrGg\"]', NULL, NULL, NULL, NULL, NULL, '::ffff:192.168.1.103', '-2', '-2', '2016-04-15 00:35:31', '2016-07-26 16:33:26'
);
    set v_counter=v_counter+1;
  end while;
  commit;
end #

delimiter ;

call load_test_data_user();