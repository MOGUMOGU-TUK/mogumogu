const {
  withProjectBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const withPinnedAGP = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      "classpath('com.android.tools.build:gradle')",
      "classpath('com.android.tools.build:gradle:8.7.2')"
    );
    return config;
  });
};

const withGradleWrapper = (config) => {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle/wrapper/gradle-wrapper.properties"
      );
      let contents = fs.readFileSync(filePath, "utf-8");
      contents = contents.replace(
        /distributionUrl=.*gradle-.*-bin\.zip/,
        "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip"
      );
      fs.writeFileSync(filePath, contents);
      return config;
    },
  ]);
};

module.exports = ({ config }) => {
  const updated = {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    ios: {
      ...config.ios,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON_IOS ?? "./GoogleService-Info.plist",
    },
    plugins: [...(config.plugins ?? []), "expo-build-properties"],
  };

  return withGradleWrapper(withPinnedAGP(updated));
};
