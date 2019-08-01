drop procedure if exists load_test_data_gun;
delimiter #
create procedure load_test_data_gun()
begin

declare v_max int unsigned default 5000;
declare v_counter int unsigned default 0;

  start transaction;
  while v_counter < v_max do
  INSERT INTO `bitinvo`.`gun`
  (`uid`,
  `name`,
  `code`,
  `type`,
  `isShared`,
  `user`,
  `notes`,
  `cert`,
  `lastMaintainDate`,
  `maintainInterval`,
  `status`,
  `isDeleted`,
  `userIp`,
  `createdBy`,
  `updatedBy`,
  `createdAt`,
  `updatedAt`)
  VALUES
  (
    'uid' + v_counter,
  'gun' +v_counter ,
  '12323232',
  1,
  0,
  v_counter,
  '1234567',
  '1234567',
  now(),
  20,
  'in',
  0,
  NULL,
  v_counter,
  v_counter,
  now(),
  now());


    set v_counter=v_counter+1;
  end while;
  commit;
end #

delimiter ;

call load_test_data_gun();
