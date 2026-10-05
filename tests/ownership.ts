import { dirname, fromFileUrl, join } from "stdlib/path";

const repo=dirname(dirname(fromFileUrl(import.meta.url)));
const quarto=Deno.env.get("QUARTO") || "quarto";
function assert(value:unknown,message:string):asserts value { if(!value) throw new Error(message); }
async function rejected(action:()=>Promise<unknown>,message:string) {
  try { await action(); } catch { return; }
  throw new Error(message);
}
// Отсутствие публичного API должно давать отдельную проверяемую ошибку RED.
const loaded=await import("../_extensions/project-download/ownership.ts").catch(()=>undefined);
assert(loaded && typeof loaded.inspectOwnedRequests==="function" && typeof loaded.clearOwnedRequests==="function","Отсутствует публичный API владения заявками Download");
const {inspectOwnedRequests,clearOwnedRequests}=loaded;
const root=await Deno.makeTempDir({prefix:"download-ownership-"});
const sources=["index.qmd",join("nested","page.qmd")];
const directory=join(root,"_generated","project-download","requests");
async function native(args:string[]) {
  const result=await new Deno.Command(quarto,{args,cwd:root,env:{QUARTO:quarto},stdout:"piped",stderr:"piped"}).output();
  assert(result.success,new TextDecoder().decode(result.stdout)+new TextDecoder().decode(result.stderr));
}
async function digest(bytes:Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(value=>value.toString(16).padStart(2,"0")).join("");
}
try {
  const missing=await inspectOwnedRequests(root,sources);
  assert(missing.protocol===1 && missing.root===root && missing.directory===directory && !missing.files.length,"Отсутствующая область заявок имеет канонический адрес");
  await clearOwnedRequests(root,sources);
  await native(["add",repo,"--no-prompt"]);
  await Deno.mkdir(join(root,"nested"));
  await Deno.mkdir(join(root,"data"));
  await Deno.writeTextFile(join(root,"data","public.txt"),"Материал\n");
  await Deno.writeTextFile(join(root,"_quarto.yml"),`project:
  type: website
  output-dir: _site
  render: [index.qmd, nested/page.qmd]
  resources: ["!data/**"]
  pre-render: _extensions/project-download/entrypoints/pre.ts
  post-render: _extensions/project-download/entrypoints/post.ts
format: html
filters: [project-download]
project-download:
  resources:
    public-data: {path: /data}
`);
  await Deno.writeTextFile(join(root,"index.qmd"),"# Главная\n");
  await Deno.writeTextFile(join(root,"nested","page.qmd"),"# Данные\n\n{{< project-download public-data >}}\n");
  await native(["render","--no-execute","--fail-if-warnings"]);
  const state=await inspectOwnedRequests(root,sources);
  assert(state.files.length===2,"Публичное чтение видит обе нативные заявки");
  const page=state.files.find(file=>file.source===sources[1]);
  assert(page && JSON.stringify(page.resources)==='["public-data"]',"Вложенная нативная заявка сохраняет источник и ресурс");
  assert(state.files.some(file=>file.source==="index.qmd" && !file.resources.length),"Документ без shortcode оставляет пустую нативную заявку");
  for(const file of state.files) assert(file.path.startsWith(directory+"/") && file.sha256===await digest(await Deno.readFile(file.path)),"Отпечаток относится к точным текущим байтам");
  const archive=join(root,"_site","_downloads","public-data.zip");
  const archiveBytes=await Deno.readFile(archive);
  const sibling=join(root,"_generated","project-download","keep.txt");
  await Deno.writeTextFile(sibling,"Посторонний сосед");
  await clearOwnedRequests(root,sources);
  assert(!(await inspectOwnedRequests(root,sources)).files.length,"Очистка удаляет заявки");
  assert(await Deno.readTextFile(sibling)==="Посторонний сосед" && await digest(await Deno.readFile(archive))===await digest(archiveBytes),"Очистка сохраняет соседей и опубликованные архивы");

  const validBytes=new TextEncoder().encode(JSON.stringify({source:sources[1],resources:["public-data"]}));
  async function reset() { await Deno.mkdir(directory,{recursive:true}); await Deno.writeFile(page!.path,validBytes); }
  async function refuses(message:string) {
    await rejected(()=>inspectOwnedRequests(root,sources),"inspect принял "+message);
    await rejected(()=>clearOwnedRequests(root,sources),"clear принял "+message);
  }
  await reset();
  for(const body of ["{", "null", "[]", '{}', '{"source":"nested/page.qmd"}', JSON.stringify({source:sources[1],resources:["public-data"],extra:true}), JSON.stringify({source:"unknown.qmd",resources:[]}), JSON.stringify({source:sources[0],resources:[]}), JSON.stringify({source:sources[1],resources:"public-data"}), JSON.stringify({source:sources[1],resources:["../bad"]}), JSON.stringify({source:sources[1],resources:[1]})]) {
    await Deno.writeTextFile(page.path,body); await refuses("некорректную заявку");
    assert(await Deno.readTextFile(page.path)===body,"Отклонённая очистка не меняет заявку");
  }
  await reset();
  for(const name of ["foreign.txt","foreign.json"]) {
    const path=join(directory,name); await Deno.writeTextFile(path,"{}"); await refuses("посторонний файл");
    assert(await Deno.readTextFile(page.path)===new TextDecoder().decode(validBytes),"Проверка всех файлов предшествует очистке");
    await Deno.remove(path);
  }
  await Deno.mkdir(join(directory,"nested")); await refuses("вложенный каталог"); await Deno.remove(join(directory,"nested"));
  const fifo=join(directory,"pipe");
  const mkfifo=await new Deno.Command("mkfifo",{args:[fifo]}).output(); assert(mkfifo.success,"Создание специального файла");
  await refuses("специальный файл"); await Deno.remove(fifo);
  await Deno.remove(page.path);
  for(const target of [sibling,join(root,"absent")]) {
    await Deno.symlink(target,page.path); await refuses("ссылку на файл"); await Deno.remove(page.path);
  }
  await reset();
  await rejected(()=>inspectOwnedRequests(root,["../foreign.qmd"]),"Источник за пределами корня");
  await rejected(()=>inspectOwnedRequests(root,["./index.qmd"]),"Неканонический источник");
  await rejected(()=>inspectOwnedRequests(root,[join(root,"index.qmd")]),"Абсолютный источник");
  await clearOwnedRequests(root,sources);
  // Любой компонент собственной области, включая dangling link, должен отклоняться.
  for(const path of [directory,join(root,"_generated","project-download"),join(root,"_generated")]) {
    if(await Deno.lstat(path).catch(()=>undefined)) await Deno.remove(path,{recursive:true});
    for(const target of [join(root,"data"),join(root,"absent")]) {
      await Deno.symlink(target,path); await refuses("ссылку в пути области"); await Deno.remove(path);
    }
  }
  const alias=root+"-alias";
  await Deno.symlink(root,alias);
  try {
    await rejected(()=>inspectOwnedRequests(alias,sources),"Корень-ссылка");
    await Deno.mkdir(join(root,"child"));
    await rejected(()=>inspectOwnedRequests(join(alias,"child"),[]),"Ссылка в родителе корня");
  } finally { await Deno.remove(alias); }
  await native(["render","--no-execute","--fail-if-warnings"]);
  await Deno.writeTextFile(join(root,"nested","page.qmd"),"# Без скачивания\n");
  await native(["render","--no-execute","--fail-if-warnings"]);
  const empty=await inspectOwnedRequests(root,sources);
  assert(empty.files.length===2 && empty.files.every(file=>!file.resources.length),"Пустой нативный capture не наследует старые ресурсы");
  await clearOwnedRequests(root,sources);
  assert(!(await inspectOwnedRequests(root,sources)).files.length,"Пустые нативные заявки очищаются");
  console.log("Владение заявками: нативная установка/hooks/capture, точные SHA-256, строгая проверка и границы очистки проверены.");
} finally { await Deno.remove(root,{recursive:true}); }
