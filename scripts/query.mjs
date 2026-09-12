import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse, valueFromASTUntyped, visit } from "graphql";
import { pathToFileURL } from "node:url";

export const sendQuery = async (file) => {
  const query = await readFile(file, "utf8");
  const response = await fetch("http://127.0.0.1:4100/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
  return body;
};

export const representations = (requests, subgraph) =>
  requests
    .filter((request) => request.subgraph === subgraph)
    .flatMap((request) => {
      const values = [];
      visit(parse(request.query), {
        Field(node) {
          if (node.name.value !== "_entities") return;
          const argument = node.arguments?.find((arg) => arg.name.value === "representations");
          if (argument) values.push(...valueFromASTUntyped(argument.value, request.variables));
        },
      });
      return values;
    });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3)
    throw new Error("Usage: node scripts/query.mjs path/to/query.graphql");
  await sendQuery(process.argv[2]);
}
