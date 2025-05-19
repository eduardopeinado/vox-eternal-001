#!/bin/bash
set -e

docker compose -f docker-compose.micro.yml build

docker save voicefixer video_converter_service | ssh root@116.203.95.246 "docker load"

ssh root@116.203.95.246 "docker compose -f /var/containers/docker-compose.micro.yml up -d"