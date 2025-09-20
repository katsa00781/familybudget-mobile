module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Disable reanimated plugin temporarily
      // 'react-native-reanimated/plugin',
    ],
  };
};
