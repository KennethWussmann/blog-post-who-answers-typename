import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";

export const serve = async ({ directory, graph, subgraphs }) => {
  const requests = [];
  const responses = [];
  const servers = [];
  const children = new Map();
  const logs = [];
  let stopped;
  const stop = () =>
    (stopped ??= (async () => {
      for (const [child] of children) child.kill("SIGTERM");
      const force = setTimeout(() => {
        for (const [child] of children) child.kill("SIGKILL");
      }, 2000);
      await Promise.all([...children.values()]);
      clearTimeout(force);
      await Promise.all(
        servers.map(
          (server) =>
            new Promise((done) => {
              server.closeAllConnections();
              server.close(done);
            }),
        ),
      );
      for (const log of logs) await new Promise((done) => log.end(done));
      process.removeListener("SIGINT", interrupted);
      process.removeListener("SIGTERM", terminated);
    })());
  const interrupted = () => {
    void stop().then(() => process.exit(130));
  };
  const terminated = () => {
    void stop().then(() => process.exit(143));
  };
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", terminated);
  const childProcess = (command, args, file) => {
    if (stopped) throw new Error("Startup interrupted");
    const log = createWriteStream(file);
    logs.push(log);
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH,
        HOME: resolve(".cache/tool-home"),
        TMPDIR: resolve(".cache/tool-tmp"),
        XDG_CONFIG_HOME: resolve(".cache/tool-home/config"),
        XDG_CACHE_HOME: resolve(".cache/tool-home/cache"),
        NO_COLOR: "1",
        DO_NOT_TRACK: "1",
        COSMO_TELEMETRY_DISABLED: "true",
        DISABLE_UPDATE_CHECK: "true",
      },
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    let failure;
    const closed = new Promise((done) => {
      child.once("error", (error) => {
        failure = error;
      });
      child.once("close", (code) => {
        children.delete(child);
        done({ code, failure });
      });
    });
    children.set(child, closed);
    return { child, closed, failure: () => failure };
  };
  try {
    await mkdir(`.generated/${directory}`, { recursive: true });
    await mkdir(".cache/tool-home", { recursive: true });
    await mkdir(".cache/tool-tmp", { recursive: true });
    const probe = createServer();
    await new Promise((done, reject) => {
      probe.once("error", reject);
      probe.listen(4100, "127.0.0.1", done);
    });
    await new Promise((done, reject) => probe.close((error) => (error ? reject(error) : done())));
    for (const { name, port, schema, resolvers } of subgraphs) {
      if (stopped) throw new Error("Startup interrupted");
      const yoga = createYoga({
        schema: buildSubgraphSchema([
          { typeDefs: parse(await readFile(schema, "utf8")), resolvers },
        ]),
        graphqlEndpoint: "/graphql",
        maskedErrors: false,
        landingPage: false,
        logging: false,
        plugins: [
          {
            onParams({ params }) {
              const entry = {
                subgraph: name,
                query: params.query,
                variables: structuredClone(params.variables ?? {}),
              };
              requests.push(entry);
              process.stdout.write(`${JSON.stringify({ request: entry })}\n`);
            },
            async onResponse({ response }) {
              if (!response.headers.get("content-type")?.includes("json")) return;
              const entry = { subgraph: name, result: await response.clone().json() };
              responses.push(entry);
              process.stdout.write(`${JSON.stringify({ response: entry })}\n`);
            },
          },
        ],
      });
      const server = createServer(yoga);
      servers.push(server);
      await new Promise((done, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", done);
      });
    }
    const composer = childProcess(
      process.execPath,
      [
        "node_modules/wgc/dist/src/index.js",
        "router",
        "compose",
        "--input",
        graph,
        "--out",
        `.generated/${directory}/execution-config.json`,
      ],
      `.generated/${directory}/composition.log`,
    );
    const composed = await composer.closed;
    if (composed.failure) throw composed.failure;
    if (composed.code !== 0)
      throw new Error(`Composition failed. Read .generated/${directory}/composition.log`);
    const { config } = JSON.parse(await readFile("package.json", "utf8"));
    const router = childProcess(
      `.bin/cosmo-${config.cosmoVersion}`,
      ["--config", `examples/${directory}/cosmo.yaml`],
      `.generated/${directory}/router.log`,
    );
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (router.failure()) throw router.failure();
      if (stopped || router.child.exitCode !== null || router.child.signalCode !== null)
        throw new Error(`Router exited. Read .generated/${directory}/router.log`);
      try {
        const ready = await fetch("http://127.0.0.1:4100/health/ready", {
          signal: AbortSignal.timeout(500),
        });
        if (ready.ok)
          return {
            requests,
            responses,
            stop,
            clear: () => {
              requests.length = 0;
              responses.length = 0;
            },
          };
      } catch {}
      await delay(100);
    }
    throw new Error(`Router not ready. Read .generated/${directory}/router.log`);
  } catch (error) {
    await stop();
    throw error;
  }
};
