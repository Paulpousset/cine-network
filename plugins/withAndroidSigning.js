const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Expo Config Plugin to inject Codemagic Android signing configuration into build.gradle
 */
const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addSigningConfig(config.modResults.contents);
    }
    return config;
  });
};

function addSigningConfig(content) {
  // Prevent duplicate injection
  if (content.includes('CM_KEYSTORE_PATH')) {
    return content;
  }

  // Define the signing configuration to be injected
  const releaseSigningConfig = `
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            } else if (project.hasProperty('RELEASE_STORE_FILE')) {
                storeFile file(RELEASE_STORE_FILE)
                storePassword RELEASE_STORE_PASSWORD
                keyAlias RELEASE_KEY_ALIAS
                keyPassword RELEASE_KEY_PASSWORD
            }
        }`;

  // Inject the release signing config into signingConfigs block
  content = content.replace(/signingConfigs\s*\{/, `signingConfigs {${releaseSigningConfig}`);

  // Update the release build type to use the new signing configuration
  content = content.replace(
    /release\s*\{(\s+)([\s\S]*?)(signingConfig\s+signingConfigs\.debug|signingConfig\s+signingConfigs\.release)/g,
    (match, p1, p2) => {
      return `release {${p1}${p2}if (System.getenv("CM_KEYSTORE_PATH") || project.hasProperty('RELEASE_STORE_FILE')) {
                signingConfig = signingConfigs.release
            } else {
                signingConfig = signingConfigs.debug
            }`;
    }
  );

  return content;
}

module.exports = withAndroidSigning;
