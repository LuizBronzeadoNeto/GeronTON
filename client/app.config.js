const fs = require("fs");
const path = require("path");

/**
 * Resolves the Firebase Android config, which is not in the repository.
 *
 * On EAS it arrives as a file-type environment variable and the variable holds
 * the path the build machine wrote it to. Locally it is whatever the developer
 * downloaded from the Firebase console. When neither exists the key is omitted
 * entirely, so a clean clone can still run the web export and the tests; only
 * Android push is unavailable.
 */
function resolveGoogleServicesFile() {
  const fromEas = process.env.GOOGLE_SERVICES_JSON;
  if (fromEas && fs.existsSync(fromEas)) {
    return fromEas;
  }

  const local = path.join(__dirname, "google-services.json");
  return fs.existsSync(local) ? "./google-services.json" : undefined;
}

module.exports = ({ config }) => {
  const googleServicesFile = resolveGoogleServicesFile();

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
