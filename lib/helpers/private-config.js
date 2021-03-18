"use strict";
/* eslint-disable global-require */

let privateConfig;
const privateConfigFromEnv = process.env.PRIVATE_CONFIG_JSON;
if (privateConfigFromEnv) {
  privateConfig = JSON.parse(Buffer.from(privateConfigFromEnv, "base64"));
} else {
  privateConfig = require("../../private-config.json");
}

module.exports = privateConfig;
