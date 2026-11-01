// Исторический legacy/private Core fixture; не canonical native-ts контроль.
// Актуальные гарантии: tests/public-runtime.ts, public-inventory.ts и legacy-harness-mapping.md.
import {join} from "stdlib/path";
const root=await Deno.makeTempDir({prefix:"download-model-installed-"});
const repo=Deno.cwd(), core=Deno.env.get("CORE")!;
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function native(args:string[], success=true, diagnostic="") {
  const result=await new Deno.Command("quarto",{args,cwd:root,stdout:"piped",stderr:"piped"}).output();
  const output=new TextDecoder().decode(result.stdout)+new TextDecoder().decode(result.stderr);
  assert(result.success===success && (!diagnostic || output.includes(diagnostic)),output);
}
async function unzip(path:string):Promise<Record<string,string>> {
  const listing=await new Deno.Command("unzip",{args:["-Z1",path],stdout:"piped"}).output();
  assert(listing.success,"ZIP inventory");
  const files:Record<string,string>={};
  for(const name of new TextDecoder().decode(listing.stdout).trim().split("\n")) {
    const result=await new Deno.Command("unzip",{args:["-p",path,name],stdout:"piped"}).output();
    assert(result.success,"ZIP extraction");files[name]=new TextDecoder().decode(result.stdout);
  }
  return files;
}
const content=(id:string,extra="")=>`::: {#${id} target="manual" project="/projects/${id}" statement-visibility="open" ${extra}}\n## Example\nPUBLIC_CONDITION\n\n{{< project-download ${id} >}}\n:::\n`;
try {
  await native(["add",core,"--no-prompt"]);await native(["add",repo,"--no-prompt"]);
  await Deno.writeTextFile(join(root,"_quarto.yml"),`project:
  type: website
  output-dir: _site
  render: [ordinary.qmd, demo.qmd]
  resources: ["!projects/**"]
  pre-render: [_extensions/course-core/entrypoints/pre.ts, _extensions/project-download/entrypoints/pre.ts]
  post-render: [_extensions/course-core/entrypoints/post.ts, _extensions/project-download/entrypoints/post.ts]
format: html
course: {id: download-model}
filters: [course-core, project-download]
project-download:
  course-model: true
  resources:
    exr-ordinary: {path: projects/exr-demo, include: [reference/Example.java]}
    exr-demo-full: {path: data, include: [diagram.svg]}
`);
  for(const view of ["student","full"]) await Deno.writeTextFile(join(root,`_quarto-${view}.yml`),`course: {view: ${view}}\nproject: {output-dir: _site-${view}}\n`);
  for(const id of ["exr-ordinary","exr-demo"]) {
    for(const partition of ["student","reference","tests"]) await Deno.mkdir(join(root,"projects",id,partition),{recursive:true});
    await Deno.writeTextFile(join(root,"projects",id,"student","Example.java"),"PUBLIC_STARTER_Пример\n");
    await Deno.writeTextFile(join(root,"projects",id,"student",".gitignore"),"build/\n");
    await Deno.writeTextFile(join(root,"projects",id,"student","README.md"),"OPAQUE {{< literal >}}\nCompile: javac Example.java\n");
    await Deno.writeTextFile(join(root,"projects",id,"reference","Example.java"),"PRIVATE_REFERENCE_Пример\n");
    await Deno.writeTextFile(join(root,"projects",id,"tests","ExampleTest.java"),"PRIVATE_TESTS\n");
    await Deno.writeTextFile(join(root,"projects",id,"README.md"),"Full project: student reference tests\n");
    await Deno.writeTextFile(join(root,"projects",id,"authored.qmd"),"SOURCE_EXCLUDED\n");
    await Deno.writeTextFile(join(root,"projects",id,"binary.jar"),"BUILD_EXCLUDED\n");
  }
  const seed=join(root,'projects/exr-ordinary/student');
  for(const args of [['init'],['add','.'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Seed']]){
    const result=await new Deno.Command('git',{args,cwd:seed,stdout:'piped',stderr:'piped'}).output();assert(result.success,'seed Git failed');
  }
  for(const args of [['branch','build'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','Second']]){
    const result=await new Deno.Command('git',{args,cwd:seed,stdout:'piped',stderr:'piped'}).output();assert(result.success,'seed parent/ref creation failed');
  }
  await Deno.writeTextFile(join(root,"ordinary.qmd"),"---\nexercise-bank: true\nproject-materialization:\n  projects:\n    exr-ordinary: {common-files: [], include-git: true}\n---\n# Ordinary {#sec-ordinary}\n\n"+content("exr-ordinary",'difficulty="introductory" time="10"'));
  await Deno.writeTextFile(join(root,"demo.qmd"),"# Demonstration {#sec-demo}\n\n"+content("exr-demo",'course-role="demonstration"').replace("{{< project-download exr-demo >}}", "{{< project-download exr-demo >}}\n\n{{< project-download exr-demo kind=\"conditions\" >}}\n\n![Figure](data/diagram.svg)"));
  await Deno.mkdir(join(root,"data"));
  await Deno.writeTextFile(join(root,"data/diagram.svg"),'<svg xmlns="http://www.w3.org/2000/svg"><text>FIGURE_ASSET</text></svg>');
  let first:Uint8Array|undefined;
  for(const view of ["student","full","student"]) {
    await native(["render","--profile",view,"--fail-if-warnings"]);
    if(view==='student'){
      const seeded=await unzip(join(root,`_site-${view}/_downloads/exr-ordinary-starter.zip`));
      assert(seeded['.git/HEAD'],'Core-authorized seed history was removed by Download');
      const restored=await Deno.makeTempDir({prefix:'download-seed-unzip-'});
      try{
        const extraction=await new Deno.Command('unzip',{args:['-q',join(root,`_site-${view}/_downloads/exr-ordinary-starter.zip`),'-d',restored]}).output();assert(extraction.success,'Actual seed ZIP extraction failed');
        const history=await new Deno.Command('git',{args:['log','--format=%s'],cwd:restored,stdout:'piped'}).output();
        assert(history.success&&new TextDecoder().decode(history.stdout).trim()==='Second\nSeed','ZIP lost seed commit parents');
        const refs=await new Deno.Command('git',{args:['rev-parse','build','HEAD^'],cwd:restored,stdout:'piped'}).output();
        const hashes=new TextDecoder().decode(refs.stdout).trim().split('\n');assert(refs.success&&hashes.length===2&&hashes[0]===hashes[1],'ZIP lost explicit seed refs');
      }finally{await Deno.remove(restored,{recursive:true})}
      const model=join(root,'_generated/course-spec/native-run.json');
      const external=await Deno.makeTempDir({prefix:'download-materialize-cli-'});
      try{
        const base=['run',join(root,'_extensions/course-core/entrypoints/materialize-projects.ts'),'--','--root',root,'--model',model,'--output-root',join(external,'stage'),'--audience','student','--task','exr-ordinary'];
        await native([...base,'--write']);await native([...base,'--check']);
        const bad=join(external,'wrong-run.json');const captured=JSON.parse(await Deno.readTextFile(model));captured.renderAll=false;await Deno.writeTextFile(bad,JSON.stringify(captured));
        await native([...base.map(v=>v===model?bad:v),'--check'],false,'NATIVE.RUN_NOT_CURRENT');
      }finally{await Deno.remove(external,{recursive:true})}
    }
    const receipt=JSON.parse(await Deno.readTextFile(join(root,"_generated/project-download/artifacts-receipt.json")));
    assert(receipt.audience===view && receipt.archives.every((a:any)=>a.audience===view),"receipt uses trusted audience, including student demonstration full ZIP");
    const output=join(root,`_site-${view}`);
    const kind=view==="student"?"starter":"full";
    const ordinary=await unzip(join(output,"_downloads",`exr-ordinary-${kind}.zip`));
    assert(!ordinary["reference/Example.java"]?.includes("PRIVATE_REFERENCE") || view==="full","declared generic resource must not override canonical model partition");
    assert(view==="full" ? ordinary["reference/Example.java"].includes("PRIVATE_REFERENCE") : !Object.values(ordinary).some(v=>v.includes("PRIVATE_")),"ordinary partition policy");
    const demo=await unzip(join(output,"_downloads/exr-demo-full.zip"));
    assert(demo["reference/Example.java"].includes("PRIVATE_REFERENCE") && demo["tests/ExampleTest.java"]==="PRIVATE_TESTS\n","public demonstration full project");
    assert(demo["student/.gitignore"]==="build/\n" && demo["student/README.md"].includes("{{< literal >}}"),"gitignore and opaque README");
    assert(!demo["authored.qmd"] && !demo["binary.jar"],"source/cache/build exclusions");
    const conditions=await unzip(join(output,"_downloads/exr-demo-conditions.zip"));
    assert(conditions["index.html"].includes("PUBLIC_CONDITION") && !conditions["index.html"].includes("PRIVATE_") && !conditions["index.html"].includes("-full.zip"),"conditions exclude solutions and full archive links");
    assert(Object.values(conditions).some(v=>v.includes("FIGURE_ASSET")),"conditions include resolved local resources");
    const html=await Deno.readTextFile(join(output,"demo.html"));
    assert(html.includes('href="_downloads/exr-demo-full.zip"') && html.includes("Скачать полный проект"),"contextual accessible link");
    const bytes=await Deno.readFile(join(output,"_downloads/exr-demo-full.zip"));
    if(first)assert(bytes.length===first.length && bytes.every((b,i)=>b===first![i]),"fresh deterministic ZIP bytes");else first=bytes;
  }
  const partialOriginal=await Deno.readTextFile(join(root,'ordinary.qmd'));
  const partialMetadata=partialOriginal.replace('exr-ordinary: {common-files: [], include-git: true}', 'exr-ordinary: {common-files: [{source: data/diagram.svg, target: student/Shared.svg, audience: student}], include-git: true}\n    exr-demo: {common-files: []}\n    exr-stale: {common-files: []}');
  await Deno.writeTextFile(join(root,'ordinary.qmd'),partialMetadata);
  await native(['render','ordinary.qmd','--profile','student','--fail-if-warnings']);
  const partialFiles=await unzip(join(root,'_site-student/_downloads/exr-ordinary-starter.zip'));
  assert(partialFiles['Shared.svg']?.includes('FIGURE_ASSET')&&!partialFiles['Stale.txt'],'Partial common did not use only current selected project');
  await native(['render','--profile','student'],false,'CORE.PROJECT_MATERIALIZATION_INVALID');
  await Deno.writeTextFile(join(root,'ordinary.qmd'),partialOriginal);
  const originalDemo=await Deno.readTextFile(join(root,"demo.qmd"));
  for(const genericFirst of [false,true]) {
    const generic="{{< project-download exr-demo-full >}}\n\n";
    await Deno.writeTextFile(join(root,"demo.qmd"),genericFirst ? generic+originalDemo : originalDemo+"\n"+generic);
    await native(["render","--profile","student"],false,"DOWNLOAD.OUTPUT_CONFLICT");
  }
  await Deno.writeTextFile(join(root,"demo.qmd"),originalDemo);
  const originalOrdinary=await Deno.readTextFile(join(root,"ordinary.qmd"));
  await Deno.writeTextFile(join(root,"ordinary.qmd"),"---\nexercise-bank: true\n---\n# Ordinary {#sec-ordinary}\n\n"+content("exr-ordinary",'difficulty="introductory" time="10"').replace("exr-ordinary >}}","exr-ordinary kind=\"full\" >}}"));
  await native(["render","--profile","student"],false);
  if(Deno.env.get("DOWNLOAD_KEEP_FIXTURE")==="1") {
    await Deno.writeTextFile(join(root,"ordinary.qmd"),originalOrdinary);
    await native(["render","--profile","student","--fail-if-warnings"]);
    console.log("Browser fixture: "+root);
  }
  console.log("Installed model artifacts: student/full/student, ordinary/demo privacy, captions, deterministic bytes, exclusions, authorization.");
} finally {if(Deno.env.get("DOWNLOAD_KEEP_FIXTURE")!=="1")await Deno.remove(root,{recursive:true})}
