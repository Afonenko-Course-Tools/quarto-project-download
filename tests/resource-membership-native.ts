// Настоящий Quarto reader/Download callback; без Core/assignment/ZIP publication.
import {copy} from "stdlib/fs";
import {dirname,fromFileUrl,join} from "stdlib/path";
const repo=dirname(dirname(fromFileUrl(import.meta.url))),root=await Deno.makeTempDir({prefix:"download-membership-"});
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)},rows:any[]=[];
const evidence=Deno.env.get("DOWNLOAD_MEMBERSHIP_EVIDENCE");
try {
 for(const [id,declared]of [["constructor",false],["missing",false],["constructor",true],["materials",true]]as const){
  const name=id+"-"+declared,project=join(root,name);await Deno.mkdir(project);
  await copy(join(repo,"_extensions/project-download"),join(project,"_extensions/project-download"));
  await Deno.mkdir(join(project,"materials"));await Deno.writeTextFile(join(project,"materials/README.md"),"PUBLIC\n");
  const config="project: {type: website}\nformat: {html: {theme: none}}\nfilters: [project-download]\nproject-download:\n  resources: "+(declared?JSON.stringify({[id]:{path:"materials"}}):"{}")+"\n";
  const source="# Ресурс\n\n{{< project-download "+id+" >}}\n";
  await Deno.writeTextFile(join(project,"_quarto.yml"),config);await Deno.writeTextFile(join(project,"index.qmd"),source);
  const p=await new Deno.Command(Deno.env.get("QUARTO")??"/opt/quarto/bin/quarto",{args:["render","index.qmd"],cwd:project,stdout:"piped",stderr:"piped"}).output();
  const requests:any[]=[];
  try{for await(const item of Deno.readDir(join(project,"_generated/project-download/requests")))requests.push(JSON.parse(await Deno.readTextFile(join(project,"_generated/project-download/requests",item.name))))}catch(e){if(!(e instanceof Deno.errors.NotFound))throw e;}
  let html="";try{html=await Deno.readTextFile(join(project,"_site/index.html"))}catch(e){if(!(e instanceof Deno.errors.NotFound))throw e;}
  const row={id,declared,exit:p.code,requests,link:html.includes("_downloads/"+id+".zip")};rows.push(row);
  if(evidence){await Deno.mkdir(evidence,{recursive:true});await Deno.writeTextFile(join(evidence,"results.json"),JSON.stringify(rows,null,2)+"\n");for(const [suffix,bytes]of [["stdout",p.stdout],["stderr",p.stderr]]as const)await Deno.writeFile(join(evidence,name+"."+suffix),bytes);await Deno.writeTextFile(join(evidence,name+".yml"),config);await Deno.writeTextFile(join(evidence,name+".qmd"),source);if(html)await Deno.writeTextFile(join(evidence,name+".html"),html);}
  if(declared)assert(p.success&&requests.length===1&&requests[0].resources.length===1&&requests[0].resources[0]===id&&row.link,"Объявленный ресурс потерян: "+name);
  else assert(!p.success&&new TextDecoder().decode(p.stderr).includes("DOWNLOAD.RESOURCE_UNAVAILABLE")&&requests.length===0&&!row.link,"Необъявленный ресурс принят: "+name);
 }
 console.log(JSON.stringify({status:"PASS",cases:rows.length,rows,scope:"actual1115 ordinary; no Core/P/ZIP qualification"}));
}finally{await Deno.remove(root,{recursive:true});}
