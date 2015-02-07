#!/bin/bash

# Build global
cat ./wrappers/global-pre.js ./index.js ./wrappers/global-post.js > ./dist/sync-promise-global.js
cat ./dist/sync-promise-global.js | uglifyjs -c evaluate -m > dist/sync-promise-global.min.js

# Build CommonJS/Node
cat ./index.js ./wrappers/commonjs-post.js > ./dist/sync-promise-commonjs.js

# Build AMD/Require.JS
cat ./wrappers/amd-pre.js ./index.js ./wrappers/amd-post.js > ./dist/sync-promise-amd.js
cat ./dist/sync-promise-amd.js | uglifyjs -c -m > dist/sync-promise-amd.min.js
