import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
const repo=dirname(dirname(fromFileUrl(import.meta.url))),root=await Deno.makeTempDir({prefix:"download-render-"});
const quarto=Deno.env.get("QUARTO")||"quarto";
function assert(v:unknown,m:string){if(!v)throw Error(m)}
async function render(profile:string,success=true){const r=await new Deno.Command(quarto,{args:["render","--profile",profile,"--fail-if-warnings"],cwd:root,env:{CUE:"не-должен-вызываться"},stdout:"piped",stderr:"piped"}).output();assert(r.success===success,new TextDecoder().decode(r.stdout)+new TextDecoder().decode(r.stderr));}
try{
 await copy(join(repo,"_extensions"),join(root,"_extensions"));
 await Deno.mkdir(root+"/data");await Deno.writeTextFile(root+"/data/public.csv","1,2\n");await Deno.mkdir(root+"/nested");
 await Deno.writeTextFile(root+"/_quarto.yml",`project:
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
    private-data: {path: /data, profiles: [full]}
`);
 await Deno.writeTextFile(root+"/index.qmd","# Материалы\n");
 const body='# Данные\n\n{{< project-download public-data >}}\n\n::: {.content-visible when-profile="full"}\n{{< project-download private-data >}}\n:::\n';
 await Deno.writeTextFile(root+"/nested/page.qmd",body);
 for(const profile of ["full","student"])await Deno.writeTextFile(root+`/_quarto-${profile}.yml`,"lang: ru\n");
 await render("full");assert((await Deno.stat(root+"/_site/_downloads/private-data.zip")).size>0,"Архив full");
 await render("student");let absent=false;try{await Deno.stat(root+"/_site/_downloads/private-data.zip")}catch{absent=true}assert(absent,"Архив скрытого профиля остался");
 const html=await Deno.readTextFile(root+"/_site/nested/page.html");assert(html.includes('href="../_downloads/public-data.zip"')&&!html.includes("private-data"),"Относительная ссылка и отбор профиля");
 // Координатор может переопределить output-dir за пределами исходников.
 const outside=await Deno.makeTempDir({prefix:"download-output-"});
 try {
   const redirected=await new Deno.Command(quarto,{args:["render","--profile","student","--output-dir",outside],cwd:root,stdout:"piped",stderr:"piped"}).output();
   assert(redirected.success,new TextDecoder().decode(redirected.stderr));
   assert((await Deno.stat(outside+"/_downloads/public-data.zip")).size>0,"Архив не учитывает output-dir координатора");
 } finally {await Deno.remove(outside,{recursive:true});}
 // Мост включается отдельно и ограничивается student видимого задания.
 await Deno.mkdir(root+"/projects/demo/student",{recursive:true});
 await Deno.mkdir(root+"/projects/demo/reference",{recursive:true});
 await Deno.writeTextFile(root+"/projects/demo/student/Main.java","ОТКРЫТЫЙ_СТАРТ");
 await Deno.writeTextFile(root+"/projects/demo/reference/Secret.java","ЗАКРЫТОЕ_РЕШЕНИЕ");
 await Deno.mkdir(root+"/_generated/course-spec",{recursive:true});
 await Deno.writeTextFile(root+"/_generated/course-spec/course.json",JSON.stringify({exercises:[{id:"exr-demo",source:"nested/page.qmd",project:"/projects/demo"}]}));
 const originalConfig=await Deno.readTextFile(root+"/_quarto.yml");
 await Deno.writeTextFile(root+"/_quarto.yml",originalConfig.replace("project-download:\n","project-download:\n  course-model: true\n"));
 await Deno.writeTextFile(root+"/nested/page.qmd",'# Проект\n\n{{< project-download exr-demo >}}\n');
 await render("student");
 const bridgeArchive=new TextDecoder().decode(await Deno.readFile(root+"/_site/_downloads/exr-demo.zip"));
 assert(bridgeArchive.includes("ОТКРЫТЫЙ_СТАРТ")&&!bridgeArchive.includes("ЗАКРЫТОЕ_РЕШЕНИЕ"),"Мост включает только student");
 await Deno.writeTextFile(root+"/_quarto.yml",originalConfig);
 await Deno.writeTextFile(root+"/nested/page.qmd",body);
 await render("student");
 await Deno.writeTextFile(root+"/nested/page.qmd",'# Ошибка\n\n{{< project-download missing >}}\n');await render("student",false);
 absent=false;try{await Deno.stat(root+"/_site/_downloads/public-data.zip")}catch{absent=true}assert(absent,"Старый архив пережил ошибку новой сборки");
 console.log("Quarto: независимость от Core/CUE, вложенные ссылки, full → student, очистка после ошибки проверены.");
}finally{await Deno.remove(root,{recursive:true})}
