const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfile = path.join(
        config.modRequest.projectRoot,
        "ios",
        "Podfile",
      );
      let content = fs.readFileSync(podfile, "utf8");

      // Remove use_modular_headers! if it's there, as use_frameworks! handles it
      if (content.includes("use_modular_headers!")) {
        content = content.replace("use_modular_headers!\n", "");
      }

      // Fix for Firebase + New Arch header issues
      if (
        !content.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        const postInstallMatch = /post_install do \|installer\|/;
        if (postInstallMatch.test(content)) {
          content = content.replace(
            postInstallMatch,
            `post_install do |installer|\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n        config.build_settings['SWIFT_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n        config.build_settings['DEFINES_MODULE'] = 'YES'\n        config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'\n        # Add search paths for React core headers which often cause modular import issues\n        config.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) $(SRCROOT)/../node_modules/react-native/React/**'\n      end\n    end`,
          );
        }
      }

      fs.writeFileSync(podfile, content);
      return config;
    },
  ]);
};
