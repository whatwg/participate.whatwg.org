#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

SERVER="138.197.231.128"
SERVER_PUBLIC_KEY="ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBK7delx7Rogdyshy3T6vC75e8ziZySeCweuG7HmkS5+D70sOlQqhU1kp+4oOYLgvEIduZSbK6YaFh2kKvcPQSj4="
USERNAME="noderunner"
WEB_ROOT="participate.whatwg.org"
PM2_NAME="participate"

# Get the deploy key by using Travis's stored variables to decrypt deploy_key.enc
ENCRYPTED_KEY_VAR="encrypted_${ENCRYPTION_LABEL}_key"
ENCRYPTED_IV_VAR="encrypted_${ENCRYPTION_LABEL}_iv"
ENCRYPTED_KEY=${!ENCRYPTED_KEY_VAR}
ENCRYPTED_IV=${!ENCRYPTED_IV_VAR}
openssl aes-256-cbc -K "$ENCRYPTED_KEY" -iv "$ENCRYPTED_IV" -in deploy_key.enc -out deploy_key -d
chmod 600 deploy_key
eval "$(ssh-agent -s)"
ssh-add deploy_key

# Do the deploy, first with rsync, then by SSHing in to restart

echo "$SERVER $SERVER_PUBLIC_KEY" > known_hosts

rsync --rsh="ssh -o UserKnownHostsFile=known_hosts" --verbose
      --include-from=.deployinclude --delete \
      --archive --compress \
      "." "$USERNAME@$SERVER:$WEB_ROOT"

ssh -o UserKnownHostsFile=known_hosts "$SERVER" << EOF
  cd $WEB_ROOT
  npm install --production
  pm2 reload "$PM2_NAME"
EOF
