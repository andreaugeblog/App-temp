// Upgrade test: data entered with an older build must still be there after the current build loads.
//   node tools/compat_test.js <commit>          (needs playwright; run from the repository root)
// It checks out docs/ from <commit>, serves it, types data in every section, then serves the
// current docs/ on the same origin (same storage) and reads the data back.
const { chromium } = require("playwright");
const { spawn, execSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");

const commit = process.argv[2];
if (!commit) { console.error("usage: node tools/compat_test.js <commit>"); process.exit(2); }
const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), "old-build-"));
execSync(`git archive ${commit} docs | tar -x -C ${oldDir}`);
const serve = dir => new Promise(r => { const s = spawn("python3", ["-m", "http.server", "8790"], { cwd: dir, stdio: "ignore" }); setTimeout(() => r(s), 800); });

(async () => {
  const errs = [], ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "profile-")), { viewport: { width: 400, height: 900 } });
  let srv = await serve(path.join(oldDir, "docs")), p = await ctx.newPage();
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8790/"); await p.waitForTimeout(500);
  const chips = () => p.$$("#secs .chip");
  await (await chips())[0].click();
  for (const [i, n] of ["Cong A", "Cong B", "Frigo 1", "Frigo 2"].entries()) { await p.click(`#grid tbody tr:nth-child(${i + 1}) .name-in`); await p.keyboard.type(n); }
  await p.click("#grid tbody tr:nth-child(1) td.cell input"); await p.keyboard.type("-19,5");
  await p.waitForTimeout(1500);
  await (await chips())[1].click(); await p.waitForTimeout(200);
  await p.fill("#cw-6", "Izquierda"); await p.fill("#d3-0", "0,35"); await p.fill("#s2Text", "Nota s2");
  const has3 = (await chips()).length > 2;
  if (has3) { await (await chips())[2].click(); await p.waitForTimeout(200); await p.fill("#s3Text", "Nota s3"); }
  await p.waitForTimeout(1500); await p.goto("about:blank"); srv.kill(); await new Promise(r => setTimeout(r, 500));

  srv = await serve("docs");
  await p.goto("http://localhost:8790/"); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(800);
  await (await chips())[0].click(); await p.waitForTimeout(200);
  const got = {
    names: await p.$$eval("#grid tbody .name-in", e => e.map(x => x.textContent).filter(Boolean).join(",")),
    value: await p.$eval("#grid tbody tr:nth-child(1) td.cell input", e => e.value)
  };
  await (await chips())[1].click(); await p.waitForTimeout(200);
  got.s2 = [await p.inputValue("#cw-6"), await p.inputValue("#d3-0"), await p.inputValue("#s2Text")].join(" | ");
  if (has3) { await (await chips())[2].click(); await p.waitForTimeout(200); got.s3 = await p.inputValue("#s3Text"); }
  got.backup = await p.evaluate(() => !!localStorage.getItem("registro-mensile-v1:backup"));
  const ok = got.names === "Cong A,Cong B,Frigo 1,Frigo 2" && got.value === "-19,5" && got.s2 === "Izquierda | 0,35 | Nota s2" && (!has3 || got.s3 === "Nota s3") && !errs.length;
  console.log(ok ? "OK" : "FAILED", JSON.stringify(got), errs);
  srv.kill(); await ctx.close(); process.exit(ok ? 0 : 1);
})();
