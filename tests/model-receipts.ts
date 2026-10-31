import {finish} from '../_extensions/project-download/infrastructure/runtime.ts';
let privateResolverCalled=false;
const resolveArtifact=async()=>{privateResolverCalled=true;throw Error('Private resolver не должен вызываться')};
const root=await Deno.makeTempDir({prefix:'download-review-'});
try {
 await Deno.mkdir(root+'/projects/probe/student',{recursive:true});
 await Deno.mkdir(root+'/_generated/project-download/requests',{recursive:true});
 await Deno.writeTextFile(root+'/projects/probe/student/Main.java','class Main {}\n');
 await Deno.writeTextFile(root+'/index.qmd','# Probe\n');
 await Deno.writeTextFile(root+'/_quarto.yml','project: {type: website, output-dir: _site}\ncourse: {view: full}\nproject-download: {course-model: true}\n');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode('index.qmd'))),v=>v.toString(16).padStart(2,'0')).join('');
 await Deno.writeTextFile(root+'/_generated/project-download/requests/'+digest+'.json',JSON.stringify({source:'index.qmd',resources:[],artifacts:[{exerciseId:'exr-probe',kind:'full'}]}));
 const run:any={schema:'course-native-run-v1',projectRoot:root,outputDirectory:root+'/_site',profiles:[],documents:[{source:'index.qmd',course:{view:'full'},projects:[{exerciseId:'exr-probe',source:'index.qmd',projectRoot:'projects/probe',bankMember:false,statementVisibility:'open',artifactPolicy:{student:'starter',full:'full',conditions:true}}]}]};
 let refused=false;
 try { await finish(root,{run,evaluateResources:async()=>({files:[]}),resolveArtifact} as never); }
 catch(error) { refused=String(error).includes('DOWNLOAD.CONFIG_INVALID') && String(error).includes('публичную операцию Core'); }
 if(!refused || privateResolverCalled) throw Error('Private NativeRun/resolver не являются текущей public operation');
 for(const path of [root+'/_generated/project-download/artifacts-receipt.json',root+'/_site/_downloads/exr-probe-full.zip']) {
  let exists=true;try{await Deno.lstat(path)}catch(error){if(error instanceof Deno.errors.NotFound)exists=false;else throw error}
  if(exists)throw Error('Отказ старого private carrier создал ZIP/success receipt');
 }
 console.log('PASS private NativeRun injection refused before private resolver, ZIP and receipt; genuine trusted audience проверяется public-runtime.ts');
}finally{await Deno.remove(root,{recursive:true});}
