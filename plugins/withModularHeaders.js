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

      // Nettoyage complet pour repartir sur une base propre
      content = content.replace(/use_modular_headers!\n/g, "");

      // Script post_install optimisé pour Firebase + New Arch
      const newPostInstall = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['SWIFT_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Correction spécifique pour les modules Firebase
        if target.name.start_with?('RNFB')
          config.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "$(PODS_ROOT)/Headers/Public/React-Core"'
        end
      end
    end
    react_native_post_install`;

      if (content.includes("react_native_post_install")) {
        // On injecte nos réglages juste avant le post_install standard de React Native
        if (!content.includes("RNFB")) {
          content = content.replace(
            "react_native_post_install",
            newPostInstall,
          );
        }
      }

      fs.writeFileSync(podfile, content);
      return config;
    },
  ]);
};
