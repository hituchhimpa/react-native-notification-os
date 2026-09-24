#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Determine host project root directory
// npm & yarn set INIT_CWD to the project root where user ran npm install
const projectRoot = process.env.INIT_CWD || path.resolve(__dirname, '../../..');

console.log('\n🚀 [RNNOS Auto-Setup] Configuring your React Native project...');

let changesMade = false;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Android Root build.gradle
// ─────────────────────────────────────────────────────────────────────────────
const rootGradlePath = path.join(projectRoot, 'android', 'build.gradle');

if (fs.existsSync(rootGradlePath)) {
  try {
    let content = fs.readFileSync(rootGradlePath, 'utf8');

    if (!content.includes('com.google.gms:google-services')) {
      // Look for buildscript dependencies block
      const buildscriptDepRegex = /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/;

      if (buildscriptDepRegex.test(content)) {
        content = content.replace(
          buildscriptDepRegex,
          `$1\n        classpath("com.google.gms:google-services:4.4.2")`
        );
        fs.writeFileSync(rootGradlePath, content, 'utf8');
        console.log('  ✅ [Android] Added google-services classpath to android/build.gradle');
        changesMade = true;
      } else {
        console.log('  ℹ️  [Android] Could not find buildscript.dependencies in android/build.gradle');
      }
    } else {
      console.log('  ✅ [Android] google-services classpath already present in android/build.gradle');
    }
  } catch (err) {
    console.warn('  ⚠️  [Android] Failed to update android/build.gradle:', err.message);
  }
} else {
  // If running inside example or nested
  const exampleRootGradle = path.join(projectRoot, 'example', 'android', 'build.gradle');
  if (fs.existsSync(exampleRootGradle)) {
    // Already in development repo
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Android App build.gradle (android/app/build.gradle)
// ─────────────────────────────────────────────────────────────────────────────
const appGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');

if (fs.existsSync(appGradlePath)) {
  try {
    let content = fs.readFileSync(appGradlePath, 'utf8');

    if (!content.includes('com.google.gms.google-services')) {
      content += '\n// React Native Notification OS (RNNOS) Firebase Plugin\napply plugin: "com.google.gms.google-services"\n';
      fs.writeFileSync(appGradlePath, content, 'utf8');
      console.log('  ✅ [Android] Applied com.google.gms.google-services to android/app/build.gradle');
      changesMade = true;
    } else {
      console.log('  ✅ [Android] com.google.gms.google-services already applied in android/app/build.gradle');
    }
  } catch (err) {
    console.warn('  ⚠️  [Android] Failed to update android/app/build.gradle:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Android google-services.json check
// ─────────────────────────────────────────────────────────────────────────────
const googleServicesJsonPath = path.join(projectRoot, 'android', 'app', 'google-services.json');
if (fs.existsSync(googleServicesJsonPath)) {
  console.log('  ✅ [Android] Found android/app/google-services.json');
} else {
  console.log('  ℹ️  [Android] Remember to drop your google-services.json inside android/app/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. iOS GoogleService-Info.plist check
// ─────────────────────────────────────────────────────────────────────────────
const iosDir = path.join(projectRoot, 'ios');
if (fs.existsSync(iosDir)) {
  let foundPlist = false;
  try {
    const files = fs.readdirSync(iosDir);
    foundPlist = files.some((f) => f.includes('GoogleService-Info.plist'));
  } catch (_e) {}

  if (foundPlist) {
    console.log('  ✅ [iOS] Found GoogleService-Info.plist in ios/ directory');
  } else {
    console.log('  ℹ️  [iOS] Remember to drop GoogleService-Info.plist in your Xcode project');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Expo App.json Plugin Configuration
// ─────────────────────────────────────────────────────────────────────────────
const appJsonPath = path.join(projectRoot, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      if (!appJson.expo.plugins) {
        appJson.expo.plugins = [];
      }
      if (!appJson.expo.plugins.includes('react-native-notification-os')) {
        appJson.expo.plugins.push('react-native-notification-os');
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
        console.log('  ✅ [Expo] Added react-native-notification-os to app.json plugins');
        changesMade = true;
      }
    }
  } catch (_e) {}
}

console.log('\n🎉 [RNNOS Auto-Setup] Finished! Zero manual configuration needed.\n');
