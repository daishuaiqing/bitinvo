#!/bin/bash
sudo apt-get install libavcodec-extra-54 libav-tools
./configure --enable-gpl --enable-nonfree --enable-pthreads --enable-libfaac --enable-libx264
make
make install
ffmpeg -codecs | grep h264
# test
# ffmpeg -i 0e7fa0d0.avi -codec:v libx264 -profile: high -b:v 500k -maxrate 500k -bufsize 1000k -vf scale=-1:480 -threads 0 -codec:a libfdk_aac -b:a 128k output_file.mp4
# http://stackoverflow.com/questions/5678695/ffmpeg-usage-to-encode-a-video-to-h264-codec-format
# http://stackoverflow.com/questions/9764740/unknown-encoder-libx264
# https://www.virag.si/2012/01/web-video-encoding-tutorial-with-ffmpeg-0-9/