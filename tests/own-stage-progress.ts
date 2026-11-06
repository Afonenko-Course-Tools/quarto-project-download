import { publish } from "../_extensions/project-download/application/publish.ts";
import { resetDownloadRequests } from "../_extensions/project-download/infrastructure/runtime.ts";
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m);};
const root=await Deno.makeTempDir({prefix:"download-progress-"});
const previousQuiet=Deno.env.get("QUARTO_PROJECT_SCRIPT_QUIET"),previousOutput=Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR");
const error=console.error,log=console.log,getEnv=Deno.env.get;const results:unknown[]=[];
try{
 Deno.env.set("QUARTO_PROJECT_OUTPUT_DIR",root+"/_site");await Deno.mkdir(root+"/_site");
 for(const quiet of [false,true]){
  Deno.env.set("QUARTO_PROJECT_SCRIPT_QUIET",quiet?"1":"0");const stderr:string[]=[],stdout:unknown[]=[];
  console.error=(...v:unknown[])=>{stderr.push(v.join(" "));};console.log=(...v:unknown[])=>{stdout.push(v);};
  const requests=root+"/_generated/project-download/requests";
  await Deno.mkdir(requests+"/index.qmd",{recursive:true});
  await Deno.writeTextFile(requests+"/index.qmd/request.json",JSON.stringify({source:"index.qmd",resources:[]}));
  await Deno.mkdir(root+"/_site/_downloads",{recursive:true});
  await Deno.writeTextFile(root+"/_site/_downloads/keep.zip","Ранее опубликованный архив");
  await resetDownloadRequests(root);
  assert(!(await Deno.lstat(requests).catch(error=>{if(error instanceof Deno.errors.NotFound)return undefined;throw error;})),"Reset удаляет временные заявки");
  assert(await Deno.readTextFile(root+"/_site/_downloads/keep.zip")==="Ранее опубликованный архив","Reset сохраняет опубликованный архив");
  assert(stderr.length===0&&stdout.length===0,"Reset не добавляет вывод в протокол");
  stderr.length=0;const calls:string[]=[];let zipBytes:Uint8Array|undefined;
  const ports={
   requests:async()=>{assert(quiet||stderr[0]?.includes("начало"),"Progress must precede collecting materials");calls.push("requests");return[{source:"index.qmd",resources:["data"]}];},
   courseResource:async()=>{throw Error("Unused model lookup");},
   files:async()=>{calls.push("files");return[{name:"README.txt",bytes:new TextEncoder().encode("same source")}];},
   save:async(archives:{name:string;bytes:Uint8Array}[])=>{calls.push("save");assert(archives.length===1&&archives[0].name==="data.zip","Archive selection unchanged");zipBytes=archives[0].bytes;},
  };
  const count=await publish({resources:{data:{path:"/data"}}},["student"],ports);
  assert(count===1&&zipBytes?.[0]===80&&zipBytes?.[1]===75&&calls.join(",")==="requests,files,save","ZIP bytes/call order/counts unchanged");
  assert(stdout.length===0,"Progress must not enter stdout JSON protocol");
  assert(quiet?stderr.length===0:stderr.some(v=>v.includes("archives=1"))&&/готово \([0-9.]+ с\)/.test(stderr.at(-1)??""),"ZIP count/wall or quiet contract");
  stderr.length=0;const sentinel=Error("original save error");let caught:unknown;let finalized=false;
  try{try{await publish({resources:{}},[],{...ports,requests:async()=>[],save:async()=>{throw sentinel;}});}catch(e){caught=e;}}finally{finalized=true;}
  assert(caught===sentinel&&finalized,"Original error identity/finally must survive progress");
  assert(quiet?stderr.length===0:stderr[0]?.includes("начало")&&/ошибка \([0-9.]+ с\)/.test(stderr.at(-1)??""),"Timed failure or quiet contract");
  results.push({quiet,count,callOrder:calls,errorIdentity:true,stdoutBytes:0});
 }
 const deniedMessages:unknown[]=[];console.error=(...v:unknown[])=>{deniedMessages.push(v);};
 Deno.env.get=key=>{if(key==="QUARTO_PROJECT_SCRIPT_QUIET")throw Error("quiet env denied");return getEnv(key);};
 const count=await publish({resources:{}},[],{requests:async()=>[],courseResource:async()=>{throw Error("unused");},files:async()=>[],save:async()=>{}});
 assert(count===0&&deniedMessages.length===0,"Reporting must not add env permission requirements");
 results.push({quietEnvDenied:true,count});
}finally{
 Deno.env.get=getEnv;
 console.error=error;console.log=log;
 previousQuiet===undefined?Deno.env.delete("QUARTO_PROJECT_SCRIPT_QUIET"):Deno.env.set("QUARTO_PROJECT_SCRIPT_QUIET",previousQuiet);
 previousOutput===undefined?Deno.env.delete("QUARTO_PROJECT_OUTPUT_DIR"):Deno.env.set("QUARTO_PROJECT_OUTPUT_DIR",previousOutput);
 await Deno.remove(root,{recursive:true});
}
console.log(JSON.stringify({status:"PASS",nativeCalls:0,results}));
