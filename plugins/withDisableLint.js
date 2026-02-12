const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Config plugin to disable lintVitalAnalyzeRelease which often causes Metaspace OOM errors
 */
const withDisableLint = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "gradle") {
      config.modResults.contents = disableLint(config.modResults.contents);
    }
    return config;
  });
};

function disableLint(buildGradle) {
  // Check if lint block already exists
  if (buildGradle.includes("lint {")) {
    return buildGradle.replace(
      /lint\s*{/,
      "lint {\n        checkReleaseBuilds false\n        checkDependencies false\n        abortOnError false\n        disable 'LintVitalRelease'"
    );
  } else {
    // Add it to the android block
    return buildGradle.replace(
      /android\s*{/,
      "android {\n    lint {\n        checkReleaseBuilds false\n        checkDependencies false\n        abortOnError false\n        disable 'LintVitalRelease'\n    }"
    );
  }
}

module.exports = withDisableLint;
