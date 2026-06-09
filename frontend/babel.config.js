module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin MUST be the last plugin — required by
      // Reanimated 4 to compile `worklet` directives and shared values.
      'react-native-worklets/plugin',
    ],
  };
};
