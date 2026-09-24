let configPlugins;
try {
  configPlugins = require('@expo/config-plugins');
} catch (_e) {
  configPlugins = null;
}

const withRNNOS = (config) => {
  if (!configPlugins) return config;

  const {
    withProjectBuildGradle,
    withAppBuildGradle,
    withInfoPlist,
    withEntitlementsPlist,
  } = configPlugins;

  // 1. Android Root build.gradle
  config = withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;
      if (!contents.includes('com.google.gms:google-services')) {
        contents = contents.replace(
          /dependencies\s*\{/,
          `dependencies {\n        classpath("com.google.gms:google-services:4.4.2")`
        );
        modConfig.modResults.contents = contents;
      }
    }
    return modConfig;
  });

  // 2. Android App build.gradle
  config = withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;
      if (!contents.includes('com.google.gms.google-services')) {
        contents += '\napply plugin: "com.google.gms.google-services"\n';
        modConfig.modResults.contents = contents;
      }
    }
    return modConfig;
  });

  // 3. iOS Info.plist: Background Remote Notifications
  config = withInfoPlist(config, (modConfig) => {
    if (!modConfig.modResults.UIBackgroundModes) {
      modConfig.modResults.UIBackgroundModes = [];
    }
    if (!modConfig.modResults.UIBackgroundModes.includes('remote-notification')) {
      modConfig.modResults.UIBackgroundModes.push('remote-notification');
    }
    return modConfig;
  });

  // 4. iOS Entitlements: APS Environment
  config = withEntitlementsPlist(config, (modConfig) => {
    modConfig.modResults['aps-environment'] = 'development';
    return modConfig;
  });

  return config;
};

module.exports = withRNNOS;
