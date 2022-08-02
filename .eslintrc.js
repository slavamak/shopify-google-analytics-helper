module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    browser: true,
    amd: true,
    node: true,
  },
  plugins: ["prettier", "simple-import-sort"],
  extends: ["airbnb-base", "prettier"],
}
