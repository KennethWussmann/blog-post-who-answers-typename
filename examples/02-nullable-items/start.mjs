import { startDemo } from "./demo.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--before")) throw new Error("Only --before is accepted");
if (args.length) throw new Error("This example has no before variant");
await startDemo(args.includes("--before"));
process.stdout.write(
  "02-nullable-items: http://127.0.0.1:4100/graphql. Ctrl-C stops the router and subgraphs.\n",
);
