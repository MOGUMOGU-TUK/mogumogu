const { expo } = require("./app.json");

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    ios: {
      ...expo.ios,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON_IOS ?? "./GoogleService-Info.plist",
    },
    plugins: [...(expo.plugins ?? []), "expo-build-properties"],
  },
};
