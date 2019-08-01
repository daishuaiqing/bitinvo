drop procedure if exists load_test_data_optlog;
delimiter #
create procedure load_test_data_optlog()
begin

declare v_max int unsigned default 100000;
declare v_counter int unsigned default 0;

  truncate table  `optlog`;
  start transaction;
  while v_counter < v_max do
    INSERT INTO `optlog`
    (`object`,
    `objectId`,
    `action`,
    `log`,
    `cabinet`,
    `org`,
    `uid`,
    `isDeleted`,
    `userIp`,
    `createdBy`,
    `updatedBy`,
    `createdAt`,
    `updatedAt`)
    VALUES
    ('application',
    100000,
    '取枪操作成功',
    '取枪操作成功,这是测试数据',
    '0a5bc3c5-be11-4bcd-9dfe-b2100732d7a8',
    12345678901,
    '0a5bc3c5-be11-4bcd-9dfe-b2100732d7a8',
    0,
    'fff:192.168.111.11',
    12345678901,
    12345678901,
    now(),
    now());

    set v_counter=v_counter+1;
  end while;
  commit;
end #

delimiter ;

call load_test_data_optlog();