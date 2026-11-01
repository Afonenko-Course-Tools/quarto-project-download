// Проверка настоящего public owner, не private Core DTO.
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const core = Deno.env.get('CORE'), pl = Deno.env.get('PL');
if (!core || !pl) throw Error('Нужны точные CORE и PL source checkouts');
const { runPublicationCases } = await import(pathToFileURL(resolve(pl, 'tests/native-publication-sources.ts')).href);
await runPublicationCases(resolve(core), dirname(dirname(fileURLToPath(import.meta.url))));
