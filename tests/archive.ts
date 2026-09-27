import { resourceFiles } from "../_extensions/project-download/infrastructure/files.ts";
import { clearOwned } from "../_extensions/project-download/infrastructure/runtime.ts";
import { zip } from "../_extensions/project-download/domain/zip.ts";
import { configuration } from "../_extensions/project-download/domain/config.ts";
import { publish } from "../_extensions/project-download/application/publish.ts";
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function rejected(action:()=>unknown){try{await action()}catch{return}throw Error("Ожидалось отклонение");}
const root=await Deno.makeTempDir({prefix:"project-download-"});
try{

 await Deno.mkdir(root+"/materials/sub",{recursive:true});
 await Deno.writeTextFile(root+"/materials/a.csv","1,2\n");
 await Deno.writeTextFile(root+"/materials/private.csv","ЗАКРЫТЫЙ");
 await Deno.writeTextFile(root+"/materials/sub/Пример.md","Пример");
 await Deno.writeTextFile(root+"/materials/sub/omit.md","Скрыт");
 await Deno.writeTextFile(root+"/.gitignore","private.csv\nmaterials/sub/*.md\n!materials/sub/Пример.md\n");
 await new Deno.Command("git",{args:["init","-q",root+"/parent"]}).output();
 await Deno.writeTextFile(root+"/parent/.gitignore","snapshot/\n");
 await Deno.mkdir(root+"/parent/snapshot/data",{recursive:true});
 await Deno.writeTextFile(root+"/parent/snapshot/data/a.csv","1");
 await Deno.writeTextFile(root+"/parent/snapshot/data/secret.csv","2");
 await Deno.writeTextFile(root+"/parent/snapshot/.gitignore","secret.csv\n");
 const snapshot=await resourceFiles(root+"/parent/snapshot",{path:"/data"});
 assert(snapshot.length===1 && snapshot[0].name==="a.csv","Копия проекта внутри игнорируемого каталога родителя");
 const entries=await resourceFiles(root,{path:"/materials",include:["**/*.csv","**/*.md"]});
 assert(entries.length===2 && entries.some(e=>e.name==="sub/Пример.md"),"Gitignore с отрицанием и вложенными правилами");
 const bytes=zip(entries);assert(bytes.every((b,i)=>b===zip(entries)[i]),"ZIP должен быть воспроизводимым");
 await Deno.writeFile(root+"/result.zip",bytes);
 const check=await new Deno.Command("unzip",{args:["-t",root+"/result.zip"],stdout:"piped"}).output();assert(check.success,"ZIP с кириллицей и корректным CRC");
 await rejected(()=>resourceFiles(root,{path:"/../outside"}));
 await Deno.symlink(root+"/materials/a.csv",root+"/materials/link");await rejected(()=>resourceFiles(root,{path:"/materials"}));await Deno.remove(root+"/materials/link");
 await rejected(()=>configuration({resources:{demo:{path:"/materials",unknown:true}}}));
 await rejected(()=>publish({resources:{demo:{path:"/materials",profiles:["full"]}}},["student"],{requests:async()=>[{source:"index.qmd",resources:["demo"]}],courseResource:async()=>{throw Error("Не используется")},files:async()=>entries,save:async()=>{}}));
 await Deno.mkdir(root+"/_site/_downloads",{recursive:true});
 await Deno.writeTextFile(root+"/_site/_downloads/keep.zip","Посторонний архив");
 await Deno.writeTextFile(root+"/_site/_downloads/owned.zip","Архив расширения");
 await Deno.writeTextFile(root+"/_site/_downloads/.project-download-manifest.json",'["owned.zip"]');
 await clearOwned(root,"_site");assert(await Deno.readTextFile(root+"/_site/_downloads/keep.zip")==="Посторонний архив","Очистка не должна затрагивать посторонние файлы");
 console.log("Ресурсы: пути, профили, .gitignore, кириллица ZIP, воспроизводимость и границы очистки проверены.");
}finally{await Deno.remove(root,{recursive:true})}
