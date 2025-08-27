module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "docs", release: false },
          { type: "test", release: false },
          { type: "chore", release: false }
        ]
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "angular"
      }
    ],
    "@semantic-release/github"
  ]
};
