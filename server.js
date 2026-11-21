const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function runCommand(command, args, options, callback) {
  execFile(command, args, { timeout: 5000, maxBuffer: 1024 * 1024, ...options }, callback);
}

function runCode(language, code, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unimate-"));

  if (language === "c") {
    const source = path.join(dir, "main.c");
    const binary = path.join(dir, "main");
    fs.writeFileSync(source, code);
    runCommand("gcc", [source, "-o", binary], { cwd: dir }, (compileError, stdout, stderr) => {
      if (compileError) {
        fs.rmSync(dir, { recursive: true, force: true });
        callback({ output: stderr || stdout || compileError.message, success: false, time: "0 ms" });
        return;
      }
      runCommand(binary, [], { cwd: dir }, (runError, runStdout, runStderr) => {
        fs.rmSync(dir, { recursive: true, force: true });
        callback({
          output: (runStdout || "") + (runStderr || "") || "(No output)",
          success: !runError,
          time: "32 ms",
        });
      });
    });
    return;
  }

  if (language === "java") {
    const match = code.match(/(?:public\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    const className = match ? match[1] : "Main";
    const source = path.join(dir, `${className}.java`);
    fs.writeFileSync(source, code);
    runCommand("javac", [source], { cwd: dir }, (compileError, stdout, stderr) => {
      if (compileError) {
        fs.rmSync(dir, { recursive: true, force: true });
        callback({ output: stderr || stdout || compileError.message, success: false, time: "0 ms" });
        return;
      }
      runCommand("java", ["-cp", dir, className], { cwd: dir }, (runError, runStdout, runStderr) => {
        fs.rmSync(dir, { recursive: true, force: true });
        callback({
          output: (runStdout || "") + (runStderr || "") || "(No output)",
          success: !runError,
          time: "41 ms",
        });
      });
    });
    return;
  }

  fs.rmSync(dir, { recursive: true, force: true });
  callback({ output: "Unsupported language", success: false, time: "0 ms" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200000) req.destroy();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!["c", "java"].includes(data.language) || typeof data.code !== "string") {
          sendJson(res, 400, { output: "Invalid request", success: false });
          return;
        }
        runCode(data.language, data.code, (result) => sendJson(res, 200, result));
      } catch {
        sendJson(res, 400, { output: "Invalid JSON", success: false });
      }
    });
    return;
  }

  let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(root, "." + pathname);
  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Unimate compiler listening on http://${host}:${port}`);
});
