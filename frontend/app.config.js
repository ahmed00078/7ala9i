const appJson = require('./app.json');

const locationMessage = 'Allow 7ala9i to use your location to find salons near you.';
const expoConfig = appJson.expo;
const androidPermissions = expoConfig.android?.permissions ?? [];

module.exports = () => ({
  expo: {
    ...expoConfig,
    plugins: [
      ...(expoConfig.plugins ?? []),
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: locationMessage,
        },
      ],
    ],
    android: {
      ...expoConfig.android,
      permissions: Array.from(
        new Set([
          ...androidPermissions,
          'ACCESS_FINE_LOCATION',
          'ACCESS_COARSE_LOCATION',
        ])
      ),
      config: {
        ...(expoConfig.android?.config ?? {}),
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    },
    ios: {
      ...expoConfig.ios,
      infoPlist: {
        ...(expoConfig.ios?.infoPlist ?? {}),
        NSLocationWhenInUseUsageDescription: locationMessage,
      },
    },
  },
});
