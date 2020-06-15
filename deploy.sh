#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

USERNAME="noderunner"
WEB_ROOT="participate.whatwg.org"
PM2_NAME="participate"

# Grab the sg/ repo, as `npm install --production` will not run the prepare script.
npm run update-sg

# Do the deploy, first with rsync, then by SSHing in to restart

eval "$(ssh-agent -s)"
echo "$SERVER_DEPLOY_KEY" | ssh-add -
mkdir -p ~/.ssh/ && echo "$SERVER $SERVER_PUBLIC_KEY" > ~/.ssh/known_hosts

echo ""
echo "Syncing files"
rsync --delete --verbose --archive --recursive --compress --files-from=.deployinclude \
      . "$USERNAME@$SERVER:$WEB_ROOT"

echo ""
echo "Performing npm install"
# We want to expand $WEB_ROOT and $PM2_NAME on the client side:
# shellcheck disable=SC2087
ssh "$USERNAME@$SERVER" /bin/bash << EOF
  cd $WEB_ROOT

  npm install --production
  npm prune --production

  echo ""
  echo "Doing a rolling-reload of the server"
  pm2 reload "$PM2_NAME"
EOF
