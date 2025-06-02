let privateConfig;
const privateConfigFromEnv = process.env.PRIVATE_CONFIG_JSON;
if (privateConfigFromEnv) {
  privateConfig = JSON.parse(Buffer.from(privateConfigFromEnv, "base64"));
} else {
  privateConfig = (await import("../../private-config.json", { with: { type: "json" } })).default;
}

export default privateConfig;
