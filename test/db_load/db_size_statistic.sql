show table status from bitinvo where name = 'fingerprint';
SELECT table_schema, 
Round(Sum(data_length + index_length) / 1024 / 1024, 1) 
FROM   information_schema.tables 
GROUP  BY table_schema; 
SELECT SQL_CALC_FOUND_ROWS COUNT(*) FROM fingerprint;