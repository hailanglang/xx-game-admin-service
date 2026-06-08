// Jest configuration
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Map .js extension imports (from nodenext style) to ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(prisma-admin-database/.*)\\.js$': '<rootDir>/../$1',
  },
};
