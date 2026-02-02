const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let content = fs.readFileSync(podfile, 'utf8');

      // Add use_modular_headers! at the top of the Podfile
      if (!content.includes('use_modular_headers!')) {
        content = "use_modular_headers!\n" + content;
      }

      // Allow non-modular headers in frameworks (needed for Firebase + static frameworks)
      if (!content.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const postInstallMatch = /post_install do \|installer\|/;
        if (postInstallMatch.test(content)) {
          content = content.replace(
            postInstallMatch,
            `post_install do |installer|\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n        config.build_settings['DEFINES_MODULE'] = 'YES'\n      end\n    end`
          );
        }
      }

      fs.writeFileSync(podfile, content);
      return config;
    },
  ]);
};
