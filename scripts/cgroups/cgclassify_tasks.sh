#!/bin/bash
cgclassify -g cpu:SGSCom $(pidof SGSCom)
cgclassify -g cpu:mysql $(pidof mysqld)

