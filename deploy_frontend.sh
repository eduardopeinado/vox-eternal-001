#!/bin/bash
set -e

npm run build --no-lint

rsync -azP --delete out/ root@116.203.95.246:/var/www/vox-eternal