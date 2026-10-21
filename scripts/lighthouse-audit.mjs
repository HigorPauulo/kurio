import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "../lighthouse/desktop.config.mjs";
import mobileConfig from "../lighthouse/mobile.config.mjs";

const BASE_URL = process.argv[2] ?? "https://kurio-beta.vercel.app";
const OUTPUT_DIR = new URL("../lighthouse/reports/", import.meta.url);
const RUNS = 3;
const PAGES = [
  { name: "inicio", path: "/" },
  { name: "detalhe", path: "/nft/nft_001" },
];
const PROFILES = [
  { name: "mobile", config: mobileConfig },
  { name: "desktop", config: desktopConfig },
];
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const METRICS = {
  lcp: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
  fcp: "first-contentful-paint",
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function readBuild() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(BASE_URL);
  await page.waitForFunction(() => "__kurio" in window);
  const build = await page.evaluate(() => ({ sha: window.__kurio.build, scenario: window.__kurio.scenario.get() }));
  await browser.close();
  return build;
}

async function audit(url, config) {
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox"],
  });
  try {
    const result = await lighthouse(url, { port: chrome.port, output: ["html", "json"], logLevel: "error" }, config);
    if (!result) throw new Error(`o Lighthouse não devolveu resultado para ${url}`);
    return result;
  } finally {
    chrome.kill();
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const build = await readBuild();
const runs = [];
let environment;

for (const page of PAGES) {
  for (const profile of PROFILES) {
    for (let run = 1; run <= RUNS; run += 1) {
      const { lhr, report } = await audit(`${BASE_URL}${page.path}`, profile.config);
      const fileName = `${page.name}-${profile.name}-${run}`;
      writeFileSync(new URL(`${fileName}.report.html`, OUTPUT_DIR), report[0]);
      writeFileSync(new URL(`${fileName}.report.json`, OUTPUT_DIR), report[1]);
      environment ??= {
        lighthouse: lhr.lighthouseVersion,
        browser: lhr.environment.hostUserAgent,
        benchmarkIndex: lhr.environment.benchmarkIndex,
      };
      const entry = {
        page: page.name,
        profile: profile.name,
        run,
        fetchTime: lhr.fetchTime,
        scores: Object.fromEntries(CATEGORIES.map((id) => [id, Math.round(lhr.categories[id].score * 100)])),
        metrics: Object.fromEntries(Object.entries(METRICS).map(([key, id]) => [key, lhr.audits[id].numericValue])),
        runWarnings: lhr.runWarnings,
      };
      runs.push(entry);
      console.log(`${fileName}: ${CATEGORIES.map((id) => `${id} ${entry.scores[id]}`).join(", ")}`);
    }
  }
}

const medians = PAGES.flatMap((page) =>
  PROFILES.map((profile) => {
    const group = runs.filter((entry) => entry.page === page.name && entry.profile === profile.name);
    return {
      page: page.name,
      profile: profile.name,
      scores: Object.fromEntries(CATEGORIES.map((id) => [id, median(group.map((entry) => entry.scores[id]))])),
      metrics: Object.fromEntries(Object.keys(METRICS).map((key) => [key, median(group.map((entry) => entry.metrics[key]))])),
    };
  }),
);

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const summary = {
  url: BASE_URL,
  build,
  runsPerGroup: RUNS,
  environment: {
    ...environment,
    playwright: packageJson.devDependencies["@playwright/test"],
    node: process.version,
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: `${os.cpus()[0]?.model} (${os.cpus().length} núcleos)`,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  },
  medians,
  runs,
};
writeFileSync(new URL("summary.json", OUTPUT_DIR), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(medians, null, 2));
