import { dirname, fromFileUrl, join } from "stdlib/path";
const root = dirname(dirname(fromFileUrl(import.meta.url))), rows = [];
{
  const p = await new Deno.Command("/opt/quarto/bin/tools/x86_64/pandoc", {
    args: [
      "-f",
      "markdown",
      "-t",
      "plain",
      "--lua-filter",
      join(root, "tests/native-buffer.lua"),
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  await p.stdin.close();
  const r = await p.output(), s = new TextDecoder().decode(r.stderr);
  if (!r.success || !s.includes("BUFFER_CONTROLS")) throw Error(s);
  rows.push({ exit: r.code, stderr: s });
}
console.log(
  JSON.stringify({
    scope:
      "synthetic transport contexts on real Pandoc/Lua, NOT operation authority",
    rows,
  }),
);
