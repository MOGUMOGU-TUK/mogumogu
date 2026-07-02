/**
 * 순수 로직(도메인 계산·변환) 단위 테스트용 설정.
 *
 * RN/Expo 런타임이 필요 없는 파일만 테스트하므로 node 환경으로 충분하다.
 * TS 변환은 프로젝트의 babel 설정(babel-preset-expo → @babel/preset-typescript)을
 * babel-jest가 그대로 사용한다. (별도 ts-jest/jest-expo 불필요)
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
};
