import {finish} from '../_extensions/project-download/infrastructure/runtime.ts';
import {toFileUrl,join} from 'stdlib/path';
const {resolveArtifact}=await import(toFileUrl(join(Deno.env.get('CORE')!,'_extensions/course-core/artifacts/resolve.ts')).href);
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
 const count=await finish(root,{run,evaluateResources:async()=>({files:[]}),resolveArtifact});
 const receipt=JSON.parse(await Deno.readTextFile(root+'/_generated/project-download/artifacts-receipt.json'));
 if(count!==1 || receipt.audience!=='full' || receipt.profiles.length!==0 || receipt.archives[0].audience!=='full') throw Error('Receipt must bind trusted course.view without audience-named profiles');
 console.log('Trusted full audience recorded without named profile.');
}finally{await Deno.remove(root,{recursive:true});}
