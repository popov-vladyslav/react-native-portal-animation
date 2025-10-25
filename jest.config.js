module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleNameMapper: {
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  setupFiles: ['./node_modules/react-native-reanimated/mock.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-reanimated|react-native-worklets)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
};
