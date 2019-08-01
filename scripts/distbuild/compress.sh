#!/bin/bash
./scripts/distbuild/setVersion.sh
cd ..
mkdir bitinvo_dist
rsync -avz bitinvo bitinvo_dist   \
--exclude                     \
'bitinvo/dist'                \
--exclude                     \
'.tmp'                        \
--exclude                     \
'.git'                        \
--exclude                     \
'config/cabinet.js'   \
--exclude                     \
'bower_components'            \
--exclude                     \
"autoprefixer"                \
--exclude                     \
"barrels"                     \
--exclude                     \
"bootstrap-webpack"           \
--exclude                     \
"bower-webpack-plugin"        \
--exclude                     \
"css-loader"                  \
--exclude                     \
"cssnano"                     \
--exclude                     \
"decamelize"                  \
--exclude                     \
"defined"                     \
--exclude                     \
"expose-loader"               \
--exclude                     \
"extract-text-webpack-plugin" \
--exclude                     \
"file-loader"                 \
--exclude                     \
"forever"                     \
--exclude                     \
"grunt-contrib-clean"         \
--exclude                     \
"grunt-contrib-coffee"        \
--exclude                     \
"grunt-contrib-concat"        \
--exclude                     \
"grunt-contrib-copy"          \
--exclude                     \
"grunt-contrib-cssmin"        \
--exclude                     \
"grunt-contrib-jst"           \
--exclude                     \
"grunt-contrib-less"          \
--exclude                     \
"grunt-contrib-uglify"        \
--exclude                     \
"grunt-contrib-watch"         \
--exclude                     \
"grunt-sails-linker"          \
--exclude                     \
"grunt-sync"                  \
--exclude                     \
"grunt-webpack"               \
--exclude                     \
"html-loader"                 \
--exclude                     \
"i18n-webpack-plugin"         \
--exclude                     \
"indexes-of"                  \
--exclude                     \
"jade-loader"                 \
--exclude                     \
"json-loader"                 \
--exclude                     \
"less"                        \
--exclude                     \
"less-loader"                 \
--exclude                     \
"node-libs-browser"           \
--exclude                     \
"postcss"                     \
--exclude                     \
"postcss-calc"                \
--exclude                     \
"postcss-colormin"            \
--exclude                     \
"postcss-convert-values"      \
--exclude                     \
"postcss-discard-comments"    \
--exclude                     \
"postcss-discard-duplicates"  \
--exclude                     \
"postcss-discard-empty"       \
--exclude                     \
"postcss-discard-unused"      \
--exclude                     \
"postcss-filter-plugins"      \
--exclude                     \
"postcss-loader"              \
--exclude                     \
"postcss-merge-idents"        \
--exclude                     \
"postcss-merge-longhand"      \
--exclude                     \
"postcss-merge-rules"         \
--exclude                     \
"postcss-minify-font-values"  \
--exclude                     \
"postcss-minify-gradients"    \
--exclude                     \
"postcss-minify-params"       \
--exclude                     \
"postcss-minify-selectors"    \
--exclude                     \
"postcss-normalize-charset"   \
--exclude                     \
"postcss-normalize-url"       \
--exclude                     \
"postcss-ordered-values"      \
--exclude                     \
"postcss-reduce-idents"       \
--exclude                     \
"postcss-reduce-transforms"   \
--exclude                     \
"postcss-svgo"                \
--exclude                     \
"postcss-unique-selectors"    \
--exclude                     \
"postcss-value-parser"        \
--exclude                     \
"postcss-zindex"              \
--exclude                     \
"sails-hook-autoreload"       \
--exclude                     \
"sails-memory"                \
--exclude                     \
"style-loader"                \
--exclude                     \
"url-loader"                  \
--exclude                     \
"webpack"                     \
--exclude                     \
"webpack-dev-server"      
cd bitinvo_dist/bitinvo
rm -rf node_modules/bcrypt
rm -rf node_modules/bitinvo-fifo
cp -r ../../bitinvo/node_modules/bitinvo-fifo ./node_modules
if [ -n "$1" ];then
tar zxf platform/bcrypt_x86.tar.gz -C ./node_modules/
tar xzf /Users/silentwalker/projects/html-pdf_x86.tar.gz -C node_modules/
else
cp -r -f platform/bcrypt node_modules/
tar xzf platform/html-pdf_arm.tar.gz -C node_modules/
fi
cp config/local.js.dist config/local.js
cp config/cabinet.js.dist config/cabinet.js
cp .sailsrc.dist.prod .sailsrc
cd ..
node ../nasetech-obfuscator/index.js bitinvo/api bitinvo/api
tar czvf bitinvo.tar.gz bitinvo
if [ -n "$1" ];then
cp bitinvo/scripts/distbuild/extract_x86.sh ./extract.sh
else
cp bitinvo/scripts/distbuild/extract.sh ./
fi
cp bitinvo/scripts/distbuild/remote_depoly_dist.sh ./
cp bitinvo/scripts/distbuild/bitinvo_backup.sql ./
cp bitinvo/scripts/ansible/* ./
rm -rf bitinvo
#cd ..
#tar -cvf - bitinvo_dist|openssl des3 -salt -k Boundary | dd of=bitinvo_dist.des3
#tar cvf bitinvo_dist.tar bitinvo_dist