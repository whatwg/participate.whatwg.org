# participate.whatwg.org

This server supports the WHATWG Participant Agreement, including submitting the agreement, updating GitHub pull requests to Living Standards with status checks, and storing the agreement data in other data repositories.

## Process for Editors

When someone submits a pull request for a contribution, you should get a GitHub status line letting you know whether they are authorized to participate. You can click through it for more details.

If their pull request is marked as pending because they or their associated entity needs to be verified, then you'll want to do that verification process. This means:

- Checking their entry in [the participant-data repository](https://github.com/whatwg/participant-data), and for individuals the [participant-data-private repository](https://github.com/whatwg/participant-data-private), for any obvious mistakes or omissions. We are not responsible for people who sign the contract in bad faith, but we can try to help spot mistakes such as:
  - Contributors signing up as individuals, when their GitHub profile clearly indicates that they work in the field of web technologies as an employee, contractor, or agent of another person or legal entity.
  - Entity agreements signed by someone who does not seem authorized to act on the entity's behalf.
- If it looks good, editing the appropriate entry in the participant-data repository to flip `verified` from `false` to `true`.
- If you are unsure, ask the contributor for clarification, or ask the Steering Group for help if necessary.

If the pull request is marked as pending for reasons on their side, e.g. not having signed the agreement or not having signed up for the appropriate workstream, you may need to guide them through this process. Remember to be friendly; the human touch counts!

Once they've gotten this straightened out, you can use the status link in the pull request to re-synchronize the GitHub pull request with our database. That should turn the status check green, at which point you can merge their PR!

## Tech-side stuff

### Developing this repository

To get set up:

- Install Node.js, version 8 or above.
- Run `npm install` in this directory to install all dependencies.
- Copy `private-config.sample.json` to `private-config.json` and fill in all the values appropriately.
- Modify `config.json` as appropriate.

Start the server with `npm run start`. It will use the `PORT` environment variable if set, or 3000 as the default port otherwise.

The above steps should automatically clone the [whatwg/sg](https://github.com/whatwg/sg) repository into the `sg/` subdirectory. If you need to update the repository at any time, run `npm run update-sg`.

### List of resources

- `GET  /agreement`: the agreement form
- `POST /submit-agreement`: where the `/agreement` form is submitted to
- `GET  /agreement-status?user=...&repo=...`: the status page linked to from the GitHub status check
- `POST /update-pr`: an endpoint hit by `/agreement-status` to sync pull requests
- `POST /push-status-check`: an endpoint hit by the GitHub commit status webhook for pull_request events
- `POST /webhooks/twitter`: an endpoint hit by the GitHub commit status webhook for push events

### Setting up the GitHub webhook

Follow the "[Creating Webhooks](https://developer.github.com/webhooks/creating/)" guide from GitHub for Living Standard repositories. The settings are:

- URL: `/push-status-check` on this server
- Content type: `application/json`
- Secret: the value you've set in your `private-config.json`
- Choose "Select individual events" and choose "Pull request" only

Also ensure that the username specified in `private-config.json` is given write access to the repository, so it can push status updates.

### Twitter integration

`twitterApp` in `private-config.json` needs to have the consumer API key and consumer API secret key of the Twitter app in its `key` and `secret` members respectively. `twitterAccounts` contains the Twitter accounts and their keys associated with the app. See the [whatwg/whattweetbot-keys](https://github.com/whatwg/whattweetbot-keys) repository for more details.
