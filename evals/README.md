# Pack tool evals

`npm run eval:pack-tools` runs the scenarios in `pack-tool-scenarios.json` against the real Pack Studio browser UI. Each scenario states a creator task and an exact success rubric. The runner prints one result per scenario and a score out of ten; any failure exits nonzero. The same scenarios also run in the normal Playwright suite and in CI.

The eval covers successful sticker and theme build → download → verify round trips, missing or invalid source files, ZIP picker and drag-and-drop verification, rejection of unreferenced or invalid images and oversized ZIPs, SHA-256 display, and the absence of uploads. `npm run test:pack` separately checks the CLI build/check round trip, output contents, missing files, symlink rejection, and invalid archives.

These are deterministic task evals for reviewing AI-assisted changes to the pack tools. They do not call an AI API or use a subjective model judge; a passing score means the specified behavior was observed in a browser. They do not establish artwork rights, scan for malware, or test installation in a consuming app.
