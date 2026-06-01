import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const startPort = Number(process.env.PORT || 8001);
const maxPort = startPort + 9;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".sql": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function getSafePath(requestUrl) {
  const url = new URL(requestUrl || "/", `http://${host}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = normalize(decodedPath === "/" ? "/index.html" : decodedPath).replace(/^([/\\])+/, "");
  const filePath = resolve(join(rootDir, relativePath));

  if (filePath !== rootDir && !filePath.startsWith(`${rootDir}${sep}`)) {
    return null;
  }

  if (!existsSync(filePath)) return null;
  if (!statSync(filePath).isFile()) return null;
  return filePath;
}

function createStaticServer() {
  return createServer((request, response) => {
    const filePath = getSafePath(request.url);

    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  });
}

function printFileFallback(error) {
  const fileUrl = pathToFileURL(join(rootDir, "index.html")).href;
  console.log("");
  console.log("Local port binding is not available in this environment.");
  console.log(`Reason: ${error.code || error.message}`);
  console.log(`Open this fallback URL instead: ${fileUrl}`);
}

async function listen(port) {
  const server = createStaticServer();

  return new Promise((resolveListen, rejectListen) => {
    server.once("error", error => {
      server.close();
      rejectListen(error);
    });

    server.listen(port, host, () => {
      resolveListen(server);
    });
  });
}

for (let port = startPort; port <= maxPort; port += 1) {
  try {
    await listen(port);
    console.log(`Senlo is running at http://${host}:${port}/`);
    console.log("Press Ctrl+C to stop the server.");
    break;
  } catch (error) {
    if (error.code === "EADDRINUSE" && port < maxPort) {
      continue;
    }

    if (error.code === "EPERM" || error.code === "EACCES") {
      printFileFallback(error);
      process.exit(0);
    }

    console.error(`Failed to start local server: ${error.message}`);
    process.exit(1);
  }
}
