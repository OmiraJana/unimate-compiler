const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

function waitForServer(process, port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server did not start")), 3000);
    const check = () => {
      fetch(`http://127.0.0.1:${port}/`).then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch(() => setTimeout(check, 50));
    };
    process.once("exit", () => reject(new Error("Server exited")));
    check();
  });
}

test("serves the compiler and rejects invalid run requests", async (t) => {
  const port = 4187;
  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
    stdio: "ignore"
  });
  t.after(() => server.kill());
  await waitForServer(server, port);

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Unimate Compiler/);

  const invalid = await fetch(`http://127.0.0.1:${port}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", code: "print('hi')" })
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).success, false);
});
