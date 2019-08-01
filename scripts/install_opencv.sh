#!/bin/bash
# install opencv
wget https://github.com/Itseez/opencv/archive/2.4.13.zip
uzip 2.4.13.zip opencv_2.4.3
cd opencv_2.4.3
mkdir build
cd build
sudo apt-get install build-essential
sudo apt-get install cmake git libgtk2.0-dev pkg-config libavcodec-dev libavformat-dev libswscale-dev
sudo apt-get install python-dev python-numpy libtbb2 libtbb-dev libjpeg-dev libpng-dev libtiff-dev 
cmake -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX=/usr/local ..
make -j4
sudo make install