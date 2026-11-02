import { dirname, fromFileUrl, join } from "stdlib/path";
const root = dirname(dirname(fromFileUrl(import.meta.url))), rows = [];
for (const mode of ["", "1", "invalid"]) {
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
    env: mode ? { PROJECT_DOWNLOAD_LITERAL_ONLY: mode } : {},
  }).spawn();
  await p.stdin.close();
  const r = await p.output(), s = new TextDecoder().decode(r.stderr);
  if (!r.success || !s.includes("BUFFER_CONTROLS")) throw Error(s);
  rows.push({ mode, exit: r.code, stderr: s });
}
console.log(
  JSON.stringify({
    scope:
      "synthetic transport contexts on real Pandoc/Lua, NOT operation authority",
    rows,
  }),
);
