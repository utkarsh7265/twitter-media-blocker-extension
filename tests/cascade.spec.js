import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('test.html cascade checks all pass', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve('test.html')).href);
  const out = page.locator('#out');
  await expect(out).toContainText(/all passed|FAILED/);
  const text = await out.innerText();
  expect(text, text).not.toContain('FAIL');
  expect(text).toContain('all passed');
});
