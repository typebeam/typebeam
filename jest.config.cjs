/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  "testMatch": [
    "**/lib/**/*.spec.(ts|js)"
  ],
};
