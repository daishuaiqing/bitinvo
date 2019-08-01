drop procedure if exists load_test_data_fingerprint;
delimiter #
create procedure load_test_data_fingerprint()
begin

declare v_max int unsigned default 100000;
declare v_counter int unsigned default 0;

  start transaction;
  while v_counter < v_max do
    INSERT INTO `bitinvo`.`fingerprint`
    (`data`,
    `owner`,
    `uid`,
    `isDeleted`,
    `userIp`,
    `createdBy`,
    `updatedBy`,
    `createdAt`,
    `updatedAt`)
    VALUES
    (
    '{"type":"Buffer","data":[0,2,0,0,3,1,86,25,0,0,255,254,255,254,255,254,252,62,224,14,192,6,128,6,128,2,128,2,128,2,128,2,128,2,128,2,128,2,128,2,128,2,128,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,93,165,90,158,84,40,217,190,95,41,90,158,26,43,144,190,108,43,135,30,93,48,7,62,39,48,168,126,24,177,15,62,47,182,13,254,25,187,77,62,106,65,139,94,54,194,138,22,90,195,12,22,84,54,156,63,39,24,19,60,41,155,43,220,68,165,66,252,68,154,22,186,79,161,67,122,74,163,67,154,60,44,211,218,57,170,212,27,71,157,65,178,76,29,216,50,73,57,216,119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,230,226,118,157,6,219,118,0,160,228,118,0,0,0,0,1,0,0,0,0,0,0,0,64,0,0,0,0,112,243,118,88,171,228,118,2,0,0,0,64,0,0,0,0,112,243,118,88,171,228,118,139,0,223,118,129,111,219,118,64,0,0,0,93,111,219,118,64,0,0,0,88,171,228,118,88,171,228,118,0,112,243,118,167,103,219,118,254,255,255,255,32,0,0,0,0,0,0,0,64,0,0,0,88,171,228,118,106,128,1,0,0,0,0,0,1,0,0,0,192,212,147,114,0,0,0,0,0,16,0,0,143,115,219,118,88,171,228,118,1,0,0,0,0,160,228,118,0,0,0,0,120,150,141,126,203,149,217,118,0,0,0,0,8,0,0,0,136,155,141,126,37,0,0,0,105,0,0,0,76,180,217,118,76,180,217,118,76,180,217,118,96,230,226,118,0,160,228,118,0,0,0,0,77,128,1,0,208,155,141,126,0,0,0,0,0,0,0,0,255,255,255,255,251,61,1,0,96,155,141,126,105,0,0,0,1,0,0,0,0,0,0,0,212,150,141,126,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,228,118,251,255,255,255,32,0,0,0,0,0,0,0,37,87,242,118,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,37,87,242,118,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,100,0,0,0,212,155,141,126,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,151,141,126,105,0,0,0,1,0,0,0,0,0,0,0,92,151,141,126,80,128,1,0,0,160,228,118,0,0,0,0,106,128,1,0,204,155,141,126,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,87,242,118,88,171,228,118,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,232,171,214,118,192,169,214,118,128,152,141,126,0,0,0,0,94,150,147,28,159,80,251,118,0,0,0,0,72,45,215,118,232,171,214,118,144,221,252,118,0,224,252,118,16,153,141,126,164,53,252,118,188,232,252,118,108,28,252,118,144,221,252,118,0,0,0,0,0,0,0,0,5,0,0,0,22,8,0,0,72,156,150,114,112,152,252,118,15,162,0,0,232,53,215,118,4,144,0,0,1,0,0,0,0,0,0,0,16,235,252,118,88,233,252,118,15,162,0,0,240,152,141,126,94,150,147,28,132,153,141,126,16,153,141,126,24,153,141,126,189,82,251,118,24,153,141,126,180,234,252,118,0,0,0,0,72,156,150,114,5,0,0,0,0,0,0,0,1,0,0,0,88,233,252,118,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,235,252,118,0,0,0,0,88,233,252,118,255,255,255,255,0,0,0,0,72,45,215,118,112,152,252,118,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,208,147,114,0,0,0,0,16,33,2,0,52,158,0,0,0,0,0,0,0,0,0,0,0,224,252,118,0,0,0,0,207,137,251,118,72,156,150,114,1,0,0,0,5,0,0,0,0,0,0,0,184,153,141,126,72,45,215,118,0,0,0,0,0,0,0,0,0,160,228,118,184,153,141,126,0,0,0,0,156,209,251,118,120,129,1,0,196,153,141,126,184,153,141,126,196,153,141,126,0,0,0,0,225,12,1,0,120,129,1,0,0,0,0,0,0,0,0,0,116,101,115,116,32,100,97,116,97,32,116,111,32,119,114,105,116,101,32,49,50,51,52,53,54,0,0,0,87,114,105,116,0,0,0,0,0,0,0,0,0,0,0,0,232,171,214,118,160,144,214,118,48,154,141,126,0,0,0,0,188,238,144,202,159,80,251,118,16,157,241,118,200,200,214,118,232,171,214,118,144,221,252,118,0,224,252,118,192,154,141,126,164,53,252,118,188,232,252,118,232,171,214,118,44,168,214,118,104,154,141,126,0,0,0,0,27,159,214,189,159,80,251,118,72,156,150,114,248,38,215,118,232,171,214,118,144,221,252,118,0,224,252,118,248,154,141,126,164,53,252,118,188,232,252,118,108,28,252,118,144,221,252,118,0,0,0,0,0,0,0,0,5,0,0,0,177,7,0,0,72,156,150,114,112,152,252,118,249,161,0,0,232,53,215,118,84,144,0,0,1,0,0,0,5,0,0,0,16,235,252,118,88,233,252,118,249,161,0,0,216,154,141,126,27,159,214,189,108,155,141,126,248,154,141,126,0,155,141,126,189,82,251,118,0,155,141,126,180,234,252,118,0,0,0,0,0,0,49,49,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,155,141,126,208,155,141,126,40,128,1,0,68,156,141,126,0,0,0,0,0,224,252,118,0,0,0,0,0,160,228,118,0,0,0,0,88,171,228,118,1,128,173,251,68,156,141,126,68,156,141,126,68,156,141,126,68,156,141,126,105,156,141,126,255,255,255,255,68,156,141,126,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,39,32,1,241,123,219,118,232,164,228,118,0,0,0,0,4,0,0,0,120,155,141,126,0,0,0,0,0,0,0,0,0,224,252,118,0,0,0,0,157,206,219,118,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,228,118,195,4,1,0,224,155,141,126,236,155,141,126,24,0,0,0,8,16,141,113,0,0,0,0,8,16,141,113,8,16,141,113,3,0,0,0,176,155,141,126,33,6,1,0,228,155,141,126,232,155,141,126,196,155,141,126,232,3,0,0,232,155,141,126,228,155,141,126,224,155,141,126,236,155,141,126,232,155,141,126,24,0,0,0,1,0,0,0,24,0,0,0]}',
    v_counter,
    '12345'+v_counter,
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

call load_test_data_fingerprint();