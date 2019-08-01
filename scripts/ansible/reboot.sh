#!/bin/bash
ansible hosts -m command -a "/sbin/reboot" -u ubuntu -become --ask-become-pass