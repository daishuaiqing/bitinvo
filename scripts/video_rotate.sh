#!/bin/bash
find /home/ssd/video/* -ctime +15 | xargs rm -f
find /home/ssd/fingerAndFace/* -ctime +90 | xargs rm -f