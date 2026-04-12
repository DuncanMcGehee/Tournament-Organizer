module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  collectCoverageFrom: [
    'server.js',
    '!node_modules/**',
    '!databases/**',
    '!tests/**'
  ],
  coverageReporters: ['text', 'lcov', 'html']
};