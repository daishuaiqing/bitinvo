#!/bin/bash
sudo kill -9 $(ps aux | grep 'node ./systemctl/shellServer.js' | awk '{print $2}')