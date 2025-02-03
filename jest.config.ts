export default {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "tsx", "js"],
    verbose: true,
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  };
  