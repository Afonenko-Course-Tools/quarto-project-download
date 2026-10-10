import { publish } from "../_extensions/project-download/application/publish.ts";
import { zip } from "../_extensions/project-download/domain/zip.ts";
const assert = (value:unknown, message:string) => { if (!value) throw Error(message); };
const bytes = new TextEncoder().encode("class Пример {}\n");
const archive = [{name:"Пример.java", bytes}];
for (const kind of ["starter", "full", "conditions"] as const) {
  let saved:any[]=[];
  const count = await publish({resources:{},"course-model":true}, ["student"], {
    requests: async()=>[{source:"lesson.qmd",resources:[],artifacts:[{exerciseId:"exr-demo",kind}]}],
    courseResource: async()=>{throw Error("typed model request reached generic resources")},
    modelArtifact: async(request:any,source:string)=>{
      assert(request.exerciseId === "exr-demo" && source === "lesson.qmd", "request identity");
      return {kind,files:archive};
    },
    files:async()=>{throw Error("model artifact passed generic resource guard")},
    save:async(value:any[])=>{saved=value},
  } as any);
  assert(count===1 && saved.length===1, "one contextual model archive");
  assert(saved[0].name===`exr-demo-${kind}.zip`, "ID-kind ZIP filename");
  assert(saved[0].bytes.every((b:number,i:number)=>b===zip(archive)[i]), "payload bytes preserved");
}
let rejected=false;
try {
  await publish({resources:{},"course-model":true},[],{
    requests:async()=>[{source:"lesson.qmd",resources:[],artifacts:[{exerciseId:"exr-demo",kind:"full"}]}],
    courseResource:async()=>{throw Error("generic")},
    modelArtifact:async()=>{throw Error("unauthorized full request")},files:async()=>archive,save:async()=>{},
  } as any);
} catch(error) { rejected=String(error).includes("unauthorized"); }
assert(rejected, "authorization failure must block publication");
console.log("Typed model artifact publication: kinds, names, exact bytes, authorization checked.");
