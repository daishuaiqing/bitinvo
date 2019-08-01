#!/bin/bash
# @usage ./'bcrypt'

arm_os=$(uname -a | grep "armv")
if [[ -z $arm_os ]]; 
then 
  echo 'X86 OS'; 
  rm -rf node_modules/bcrypt/
  npm install bcrypt --verbose
else 
  echo 'ARM OS'; 
  rm -rf node_modules/bcrypt
  cp -r platform/bcrypt node_modules/
fi