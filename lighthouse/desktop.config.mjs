export default {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    formFactor: "desktop",
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 1,
    },
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    emulatedUserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  },
};
