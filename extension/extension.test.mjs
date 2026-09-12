import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const content = await readFile(new URL("./content.js", import.meta.url), "utf8");
const background = await readFile(new URL("./background.js", import.meta.url), "utf8");

test("Gmail content script observes navigation and reports every scan state", () => {
  assert.match(content, /new MutationObserver\(\(\) => detectMessage\(\)\)/);
  assert.match(content, /hashchange/);
  assert.match(content, /Analyzing email/);
  assert.match(content, /analysis failed/);
  assert.match(content, /Analyze again/);
  assert.match(content, /visibleUrls/);
});

test("background pipeline keeps async responses and validates both API stages", () => {
  assert.match(background, /return true/);
  assert.match(background, /api\/v1\/emails\/analyze/);
  assert.match(background, /api\/v1\/analyses\/\$\{analysis\.id\}\/forensics/);
  assert.match(background, /AbortError/);
  assert.match(background, /malformed analysis data/);
  assert.match(background, /aiStatus/);
  assert.match(background, /geoip/);
  assert.match(background, /Links observed by Gmail/);
});
