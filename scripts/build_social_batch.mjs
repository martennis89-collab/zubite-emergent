import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { batch } from "./social_batch_content.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "frontend", "public", "social-kit", "batches", batch.slug);
const assets = path.join(out, "assets");
const fontsDir = path.join(root, "frontend", "public", "fonts", "taste");
const fontConfigDir = path.join(root, ".codex-tmp", "social-fontconfig");
fs.mkdirSync(fontConfigDir, { recursive: true });
const fontConfigFile = path.join(fontConfigDir, "fonts.conf");
fs.writeFileSync(fontConfigFile, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontsDir.replaceAll("\\", "/")}</dir><cachedir>${path.join(fontConfigDir,"cache").replaceAll("\\", "/")}</cachedir><config></config></fontconfig>`, "utf8");
process.env.FONTCONFIG_FILE = fontConfigFile;
process.env.FONTCONFIG_PATH = fontConfigDir;
const sharp = require("../frontend/node_modules/sharp");
const ffmpeg = require("../.codex-tmp/social-tools/node_modules/@ffmpeg-installer/ffmpeg").path;
const fontkit = require("../.codex-tmp/social-tools/node_modules/fontkit");

const colors = { paper: "#F5F4F2", white: "#FFFFFF", ink: "#0A0A0A", muted: "#525252", faint: "#737373", border: "#E5E5E5", orange: "#FF6B00", deepOrange: "#CC5400", emerald: "#007956", live: "#00D294", soft: "#D0FAE5" };
const b64 = p => fs.readFileSync(p).toString("base64");
const fontCss = "";
const typefaces = {
  manropeRegular: fontkit.openSync(path.join(fontsDir,"Manrope-Regular.ttf")),
  manropeMedium: fontkit.openSync(path.join(fontsDir,"Manrope-Medium.ttf")),
  manropeBold: fontkit.openSync(path.join(fontsDir,"Manrope-Bold.ttf"))
};

function esc(value="") { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function dataUri(file) { const ext=path.extname(file).slice(1); return `data:image/${ext};base64,${b64(file)}`; }
function ensure(dir) { fs.mkdirSync(dir,{recursive:true}); }
function face(family="Manrope",weight=400) { if(family==="Plex") return typefaces.manropeMedium; if(weight>=700) return typefaces.manropeBold; if(weight>=500) return typefaces.manropeMedium; return typefaces.manropeRegular; }
function shaped(value,{size=32,family="Manrope",weight=400,letter=0}={}) { try { const font=face(family,weight), run=font.layout(String(value)), scale=size/font.unitsPerEm; const width=run.positions.reduce((sum,p)=>sum+p.xAdvance*scale,0)+Math.max(0,run.glyphs.length-1)*letter; return {font,run,scale,width}; } catch(error) { throw new Error(`Font shaping failed for ${family}/${weight}: ${String(value)}`,{cause:error}); } }
function measureText(value,options={}) { return shaped(value,options).width; }
function pathText(value,{x=0,y=0,size=32,family="Manrope",weight=400,letter=0,fill=colors.ink,anchor="start",opacity=1}={}) { const {run,scale,width}=shaped(value,{size,family,weight,letter}); let cursor=anchor==="end"?x-width:anchor==="middle"?x-width/2:x; return run.glyphs.map((glyph,i)=>{const pos=run.positions[i], gx=cursor+pos.xOffset*scale, gy=y-pos.yOffset*scale; cursor+=pos.xAdvance*scale+(i<run.glyphs.length-1?letter:0); return `<path d="${glyph.path.toSVG()}" transform="translate(${gx.toFixed(3)} ${gy.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})" fill="${fill}" opacity="${opacity}"/>`;}).join(""); }
function logo(x=72,y=82,dark=false,size=34) { const base=dark?colors.white:colors.ink, main="Zubite", gap=-1, mainWidth=measureText(main,{size,weight:700,letter:-2}); return `${pathText(main,{x,y,size,weight:700,letter:-2,fill:base})}${pathText(".bg",{x:x+mainWidth+gap,y,size,weight:700,letter:-2,fill:colors.emerald})}`; }
function lineText(lines,{x,y,size=68,leading=1.02,fill=colors.ink,weight=700,anchor="start",family="Manrope",letter=-2.5,maxWidth=Infinity}={}) { const fitted=Math.min(size,...lines.map(line=>{const width=measureText(line,{size,family,weight,letter});return width>maxWidth?size*maxWidth/width:size;})); return lines.map((line,i)=>pathText(line,{x,y:y+i*fitted*leading,size:fitted,family,weight,letter,fill,anchor})).join(""); }
function pill(x,y,text,{fill=colors.soft,color=colors.emerald,stroke="none",size=17}={}) { const label=text.toUpperCase(), w=Math.max(150,measureText(label,{size,family:"Plex",weight:600,letter:1.2})+42); return `<g><rect x="${x}" y="${y}" width="${w}" height="46" rx="23" fill="${fill}" stroke="${stroke}"/>${pathText(label,{x:x+21,y:y+30,size,family:"Plex",weight:600,letter:1.2,fill:color})}</g>`; }
function imageTag(file,x,y,w,h,{rx=0,position="xMidYMid slice",opacity=1}={}) { return `<image href="${dataUri(path.join(assets,file))}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${position}" opacity="${opacity}" ${rx?`clip-path="url(#imgclip)"`:""}/>`; }
function svgWrap(w,h,body,extraDefs="") { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><style>${fontCss}</style>${extraDefs}</defs>${body}</svg>`; }

function factSvg(post,w,h) {
  const story=h>1500, titleY=story?1180:865, titleSize=story?82:68, subY=titleY+(post.headline.length-1)*titleSize*1.03+82;
  const sourceY=story?h-180:h-128, disclosureY=story?h-135:h-88, ctaY=story?1045:755;
  const body=`
    ${imageTag(post.asset,0,0,w,h)}
    <rect width="${w}" height="${h}" fill="url(#shade)"/>
    ${logo(72,88,true,34)}
    ${pill(72,118,"ПРОВЕРЕН ФАКТ",{fill:"rgba(0,121,86,.88)",color:colors.white,size:16})}
    <line x1="72" y1="${titleY-48}" x2="226" y2="${titleY-48}" stroke="${colors.orange}" stroke-width="8" stroke-linecap="round"/>
    ${lineText(post.headline,{x:72,y:titleY,size:titleSize,leading:1.03,fill:colors.white,letter:-2.8})}
    ${pathText(post.subline,{x:72,y:subY,size:story?29:24,weight:500,fill:"#E8E8E8"})}
    ${pill(72,ctaY,post.cta,{fill:colors.orange,color:colors.white,size:story?18:15})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:72,y:sourceY,size:story?18:15,family:"Plex",weight:600,letter:1.2,fill:"#C8C8C8"})}
    ${pathText("AI-ГЕНЕРИРАНА ПРЕДСТАВИТЕЛНА ВИЗУАЛИЗАЦИЯ",{x:72,y:disclosureY,size:story?16:13,family:"Plex",weight:600,letter:.8,fill:"#9A9A9A"})}`;
  const defs=`<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".03"/><stop offset=".43" stop-color="#000" stop-opacity=".08"/><stop offset=".67" stop-color="#050505" stop-opacity=".82"/><stop offset="1" stop-color="#050505" stop-opacity=".98"/></linearGradient>`;
  return svgWrap(w,h,body,defs);
}

function carouselCover(post,slide,index) {
  const img=slide.image||post.asset;
  const body=`
    <rect width="1080" height="1350" fill="${colors.paper}"/>
    <circle cx="942" cy="90" r="190" fill="${colors.soft}"/>
    ${logo(72,86,false,34)}
    ${pathText(`${String(index+1).padStart(2,"0")} / 07`,{x:1008,y:84,size:17,family:"Plex",weight:600,letter:1.8,fill:colors.emerald,anchor:"end"})}
    <rect x="604" y="160" width="404" height="1018" rx="40" fill="${colors.ink}"/>
    <clipPath id="coverclip"><rect x="620" y="176" width="372" height="986" rx="28"/></clipPath>
    <image href="${dataUri(path.join(assets,img))}" x="620" y="176" width="372" height="986" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverclip)"/>
    ${pill(72,178,post.coverKicker||"КАРУСЕЛ",{fill:colors.soft,color:colors.emerald,size:15})}
    ${lineText(slide.title,{x:72,y:360,size:66,leading:1.02,fill:colors.ink,letter:-3.2})}
    ${lineText(slide.body,{x:72,y:690,size:32,leading:1.45,fill:colors.muted,weight:500,letter:-.7})}
    <line x1="72" y1="1120" x2="232" y2="1120" stroke="${colors.orange}" stroke-width="8" stroke-linecap="round"/>
    ${pathText("ПЛЪЗНИ НАЛЯВО →",{x:72,y:1180,size:16,family:"Plex",weight:600,letter:1.4,fill:colors.faint})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:72,y:1274,size:14,family:"Plex",weight:600,letter:1,fill:colors.faint})}`;
  return svgWrap(1080,1350,body);
}

function carouselContent(post,slide,index) {
  const hasImage=Boolean(slide.image), imageX=hasImage?660:760;
  const imageBlock=hasImage?`
    <clipPath id="imgclip"><rect x="660" y="170" width="348" height="430" rx="34"/></clipPath>
    ${imageTag(slide.image,660,170,348,430,{rx:34})}
    <rect x="660" y="170" width="348" height="430" rx="34" fill="none" stroke="${colors.border}" stroke-width="2"/>`:`
    <circle cx="874" cy="318" r="166" fill="${colors.soft}"/>
    <circle cx="874" cy="318" r="72" fill="none" stroke="${colors.emerald}" stroke-width="2"/>
    <circle cx="874" cy="318" r="14" fill="${colors.orange}"/>`;
  const body=`
    <rect width="1080" height="1350" fill="${colors.paper}"/>
    <path d="M0 0H1080V118L0 300Z" fill="${colors.white}"/>
    ${logo(72,82,false,34)}
    ${pathText(`${String(index+1).padStart(2,"0")} / 07`,{x:1008,y:80,size:17,family:"Plex",weight:600,letter:1.8,fill:colors.emerald,anchor:"end"})}
    ${pathText(slide.number,{x:72,y:390,size:150,family:"Plex",weight:600,letter:-8,fill:colors.soft})}
    ${imageBlock}
    ${lineText(slide.title,{x:72,y:660,size:68,leading:1.05,fill:colors.ink,letter:-3.2})}
    ${lineText(slide.body,{x:72,y:860,size:30,leading:1.55,fill:colors.muted,weight:500,letter:-.5})}
    <rect x="72" y="1056" width="936" height="142" rx="28" fill="${colors.white}" stroke="${colors.border}" stroke-width="2"/>
    <circle cx="112" cy="1098" r="9" fill="${colors.live}"/>${pathText("ПОЛЕЗНО УТОЧНЕНИЕ",{x:140,y:1106,size:16,family:"Plex",weight:600,letter:1.4,fill:colors.emerald})}
    ${pathText(slide.note,{x:112,y:1158,size:25,weight:500,fill:colors.ink})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:72,y:1280,size:14,family:"Plex",weight:600,letter:1,fill:colors.faint})}`;
  return svgWrap(1080,1350,body);
}

function carouselFinal(post,slide,index) {
  const body=`
    <rect width="1080" height="1350" fill="${colors.ink}"/>
    <circle cx="920" cy="190" r="250" fill="${colors.emerald}" opacity=".28"/>
    <circle cx="920" cy="190" r="126" fill="none" stroke="${colors.live}" stroke-width="2" opacity=".8"/>
    ${logo(72,86,true,34)}
    ${pathText(`${String(index+1).padStart(2,"0")} / 07`,{x:1008,y:84,size:17,family:"Plex",weight:600,letter:1.8,fill:colors.live,anchor:"end"})}
    <line x1="72" y1="350" x2="232" y2="350" stroke="${colors.orange}" stroke-width="8" stroke-linecap="round"/>
    ${lineText(slide.title,{x:72,y:470,size:82,leading:1.03,fill:colors.white,letter:-3.7})}
    ${lineText(slide.body,{x:72,y:820,size:34,leading:1.5,fill:"#D4D4D4",weight:500,letter:-.5})}
    ${pill(72,1040,post.cta,{fill:colors.orange,color:colors.white,size:16})}
    ${pathText("Ориентир, не диагноза.",{x:72,y:1214,size:24,weight:500,fill:"#C8C8C8"})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:72,y:1274,size:14,family:"Plex",weight:600,letter:1,fill:"#8A8A8A"})}`;
  return svgWrap(1080,1350,body);
}

function carouselStory(post) {
  const img=post.asset;
  const title=post.coverHeadline||post.slides[0].title;
  const body=`
    <rect width="1080" height="1920" fill="${colors.paper}"/>
    <clipPath id="storyclip"><rect x="0" y="0" width="1080" height="1080"/></clipPath>
    <image href="${dataUri(path.join(assets,img))}" x="0" y="0" width="1080" height="1080" preserveAspectRatio="xMidYMid slice" clip-path="url(#storyclip)"/>
    <rect x="0" y="0" width="1080" height="1100" fill="url(#fade)"/>
    ${logo(84,100,true,34)}
    ${pill(84,1140,"НОВ КАРУСЕЛ",{fill:colors.soft,color:colors.emerald,size:18})}
    ${lineText(title,{x:84,y:1280,size:82,leading:1.02,fill:colors.ink,letter:-3.7})}
    ${pathText(post.coverKicker,{x:84,y:1650,size:31,weight:500,fill:colors.muted})}
    ${pill(84,1720,"Отвори публикацията",{fill:colors.orange,color:colors.white,size:18})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:84,y:1850,size:16,family:"Plex",weight:600,letter:1.1,fill:colors.faint})}`;
  const defs=`<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".15"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="${colors.paper}" stop-opacity="1"/></linearGradient>`;
  return svgWrap(1080,1920,body,defs);
}

function reelFrameSvg(post,frame,index) {
  const body=`
    ${imageTag(frame.image,0,0,1080,1920)}
    <rect width="1080" height="1920" fill="url(#reelshade)"/>
    ${logo(84,100,true,34)}
    ${pathText(`${String(index+1).padStart(2,"0")} / ${String(post.reelFrames.length).padStart(2,"0")}`,{x:996,y:98,size:17,family:"Plex",weight:600,letter:1.8,fill:colors.live,anchor:"end"})}
    ${pill(84,1110,frame.kicker,{fill:"rgba(0,121,86,.9)",color:colors.white,size:17})}
    ${lineText(frame.title,{x:84,y:1260,size:78,leading:1.04,fill:colors.white,letter:-3.4,maxWidth:912})}
    <line x1="84" y1="1580" x2="244" y2="1580" stroke="${colors.orange}" stroke-width="8" stroke-linecap="round"/>
    ${pathText("Ориентир, не диагноза.",{x:84,y:1650,size:26,weight:500,fill:"#E5E5E5"})}
    ${pathText("AI-ГЕНЕРИРАНИ ПРЕДСТАВИТЕЛНИ КАДРИ",{x:84,y:1770,size:15,family:"Plex",weight:600,letter:1.1,fill:"#A3A3A3"})}
    ${pathText(`ИЗТОЧНИК: ${post.sourceShort.toUpperCase()}`,{x:84,y:1820,size:15,family:"Plex",weight:600,letter:1.1,fill:"#A3A3A3"})}`;
  const defs=`<linearGradient id="reelshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".45" stop-color="#000" stop-opacity=".05"/><stop offset=".66" stop-color="#000" stop-opacity=".65"/><stop offset="1" stop-color="#000" stop-opacity=".96"/></linearGradient>`;
  return svgWrap(1080,1920,body,defs);
}

async function writeSvgAndPng(svg,fileBase,w,h) {
  fs.writeFileSync(`${fileBase}.svg`,svg,"utf8");
  await sharp(Buffer.from(svg)).resize(w,h).png({compressionLevel:9}).toFile(`${fileBase}.png`);
}

async function buildPost(post) {
  const dir=path.join(out,"posts",`${post.id}-${post.slug}`); ensure(dir);
  fs.writeFileSync(path.join(dir,"caption.txt"),post.caption+"\n","utf8");
  fs.writeFileSync(path.join(dir,"alt.txt"),post.alt+"\n","utf8");
  if(post.format==="Hyperreal Fact") {
    await writeSvgAndPng(factSvg(post,1080,1350),path.join(dir,"feed"),1080,1350);
    await writeSvgAndPng(factSvg(post,1080,1920),path.join(dir,"story"),1080,1920);
  } else if(post.format==="Carousel") {
    const frames=path.join(dir,"carousel"); ensure(frames);
    for(let i=0;i<post.slides.length;i++) {
      const slide=post.slides[i];
      const svg=slide.kind==="cover"?carouselCover(post,slide,i):slide.kind==="final"?carouselFinal(post,slide,i):carouselContent(post,slide,i);
      await writeSvgAndPng(svg,path.join(frames,`frame-${String(i+1).padStart(2,"0")}`),1080,1350);
    }
    await writeSvgAndPng(carouselStory(post),path.join(dir,"story"),1080,1920);
  } else if(post.format==="Reel") {
    const frames=path.join(dir,"reel-frames"); ensure(frames);
    for(let i=0;i<post.reelFrames.length;i++) await writeSvgAndPng(reelFrameSvg(post,post.reelFrames[i],i),path.join(frames,`frame-${String(i+1).padStart(2,"0")}`),1080,1920);
    const coverSvg=reelFrameSvg(post,post.reelFrames[0],0);
    await writeSvgAndPng(coverSvg,path.join(dir,"cover-story"),1080,1920);
    await sharp(path.join(dir,"cover-story.png")).extract({left:0,top:285,width:1080,height:1350}).png().toFile(path.join(dir,"cover-feed.png"));
    buildReel(post,dir);
    writeSrt(post,dir);
    writeShotList(post,dir);
  }
}

function buildReel(post,dir) {
  const frameDir=path.join(dir,"reel-frames");
  const transition=.35, args=["-y"];
  post.reelFrames.forEach((frame,i)=>args.push("-loop","1","-t",String(frame.duration),"-i",path.join(frameDir,`frame-${String(i+1).padStart(2,"0")}.png`)));
  const filters=post.reelFrames.map((frame,i)=>`[${i}:v]scale=1120:1991,crop=1080:1920:x='20+8*sin(t*0.55+${i})':y='35-12*t/${frame.duration}',fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
  let previous="v0", elapsed=post.reelFrames[0].duration;
  for(let i=1;i<post.reelFrames.length;i++){const output=`x${i}`, offset=elapsed-transition*i;filters.push(`[${previous}][v${i}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(2)}[${output}]`);previous=output;elapsed+=post.reelFrames[i].duration;}
  args.push("-filter_complex",filters.join(";"),"-map",`[${previous}]`,"-c:v","libx264","-profile:v","high","-level","4.1","-movflags","+faststart","-an",path.join(dir,"reel-1080x1920.mp4"));
  const result=spawnSync(ffmpeg,args,{encoding:"utf8"});
  if(result.status!==0) throw new Error(`ffmpeg failed for ${post.id}: ${result.stderr}`);
}

function tc(sec) { const ms=Math.round(sec*1000), h=Math.floor(ms/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000), z=ms%1000; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(z).padStart(3,"0")}`; }
function writeSrt(post,dir) { const transition=.35, starts=[]; let sum=0; post.reelFrames.forEach((f,i)=>{starts.push(sum-i*transition);sum+=f.duration;}); const chunks=post.reelFrames.map((f,i)=>`${i+1}\n${tc(starts[i])} --> ${tc(i<post.reelFrames.length-1?starts[i+1]:starts[i]+f.duration)}\n${f.title.join(" ")}\n`); fs.writeFileSync(path.join(dir,"captions.srt"),chunks.join("\n"),"utf8"); }
function writeShotList(post,dir) { const rows=post.reelFrames.map((f,i)=>`| ${i+1} | ${f.duration.toFixed(1)} сек | ${f.image} | ${f.kicker} | ${f.title.join(" ")} |`).join("\n"); const total=post.reelFrames.reduce((a,b)=>a+b.duration,0); fs.writeFileSync(path.join(dir,"shot-list.md"),`# ${post.topic}\n\nГотово вертикално видео: ${total.toFixed(1)} сек, 1080×1920, H.264, без звук. Ключовата информация е изписана на кадрите.\n\n| Кадър | Продължителност | Визуализация | Етикет | Екранен текст |\n|---:|---:|---|---|---|\n${rows}\n\nИзточници: ${post.sourceShort}. Ориентир, не диагноза.\n`,"utf8"); }

function csv(value) { const s=String(value??""); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
function writeManifest() {
  const manifest={...batch,posts:batch.posts.map(p=>({id:p.id,date:p.date,scheduledAt:`${p.date}T${batch.suggestedTime}:00+03:00`,format:p.format,topic:p.topic,platforms:p.platforms,cta:p.cta,sourceShort:p.sourceShort,directory:`posts/${p.id}-${p.slug}`}))};
  fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
  const headers=["date","suggested_time","timezone","format","topic","platforms","cta","asset_directory","caption_file","alt_file"];
  const rows=batch.posts.map(p=>[p.date,batch.suggestedTime,batch.timezone,p.format,p.topic,p.platforms.join(" | "),p.cta,`posts/${p.id}-${p.slug}`,`posts/${p.id}-${p.slug}/caption.txt`,`posts/${p.id}-${p.slug}/alt.txt`]);
  fs.writeFileSync(path.join(out,"schedule.csv"),[headers,...rows].map(r=>r.map(csv).join(",")).join("\n")+"\n","utf8");
  fs.writeFileSync(path.join(out,"captions.md"),`# ${batch.title}\n\n${batch.posts.map(p=>`## ${p.date} · ${p.format} · ${p.topic}\n\n${p.caption}`).join("\n\n---\n\n")}\n`,"utf8");
}

function writeGallery() {
  const cards=batch.posts.map(p=>{ const dir=`posts/${p.id}-${p.slug}`; const preview=p.format==="Carousel"?`${dir}/carousel/frame-01.png`:p.format==="Reel"?`${dir}/cover-feed.png`:`${dir}/feed.png`; const downloads=p.format==="Carousel"?`<a href="${dir}/carousel/frame-01.png" download>Корица PNG</a><a href="${dir}/story.png" download>Story PNG</a>`:p.format==="Reel"?`<a href="${dir}/reel-1080x1920.mp4" download>Reel MP4</a><a href="${dir}/cover-feed.png" download>Корица PNG</a>`:`<a href="${dir}/feed.png" download>Feed PNG</a><a href="${dir}/story.png" download>Story PNG</a>`; return `<article class="card"><img src="${preview}" alt="${esc(p.alt)}"><div><span>${p.date} · ${esc(p.format)}</span><h2>${esc(p.topic)}</h2><p>${esc(p.cta)}</p><nav>${downloads}<a href="${dir}/caption.txt" download>Caption</a></nav></div></article>`;}).join("\n");
  const html=`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zubite.bg · ${batch.title}</title><style>@font-face{font-family:Manrope;src:url('../../../fonts/taste/Manrope-Regular.ttf')}@font-face{font-family:Manrope;src:url('../../../fonts/taste/Manrope-Bold.ttf');font-weight:700}:root{--paper:#f5f4f2;--ink:#0a0a0a;--muted:#525252;--border:#e5e5e5;--orange:#ff6b00;--green:#007956;--soft:#d0fae5}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Manrope,Arial,sans-serif}.shell{width:min(1420px,calc(100% - 40px));margin:auto;padding:52px 0 90px}header{display:grid;grid-template-columns:1fr auto;gap:30px;padding-bottom:34px;border-bottom:1px solid var(--border)}.brand{font-size:30px;font-weight:700;letter-spacing:-.05em}.brand b{color:var(--green)}h1{max-width:900px;margin:18px 0 10px;font-size:clamp(44px,6vw,82px);line-height:.98;letter-spacing:-.06em}header p{margin:0;color:var(--muted)}header nav{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}a{display:inline-flex;min-height:42px;align-items:center;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:white;color:var(--ink);font-size:13px;font-weight:700;text-decoration:none}a:hover{border-color:var(--green);background:var(--soft)}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px;margin-top:36px}.card{overflow:hidden;border:1px solid var(--border);border-radius:20px;background:#fff;box-shadow:0 22px 50px -42px #000}.card>img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;background:#111}.card>div{padding:18px}.card span{color:var(--green);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.card h2{margin:10px 0 6px;font-size:18px;line-height:1.2}.card p{margin:0;color:var(--muted);font-size:13px}.card nav{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:16px}.card nav a{justify-content:center;padding:0 8px;font-size:11px}@media(max-width:1050px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:660px){.shell{width:min(100% - 24px,1420px);padding-top:28px}header{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}</style></head><body><main class="shell"><header><div><div class="brand">Zubite<b>.bg</b></div><h1>${batch.title}</h1><p>${batch.subtitle} · предложен час ${batch.suggestedTime} · ${batch.timezone}</p></div><nav><a href="schedule.csv" download>График CSV</a><a href="captions.md" download>Всички текстове</a><a href="manifest.json" download>Manifest JSON</a><a href="../../index.html">Към brand kit</a></nav></header><section class="grid">${cards}</section></main></body></html>`;
  fs.writeFileSync(path.join(out,"index.html"),html,"utf8");
}

function writeTextPostFiles(post) {
  const dir=path.join(out,"posts",`${post.id}-${post.slug}`); ensure(dir);
  fs.writeFileSync(path.join(dir,"caption.txt"),post.caption+"\n","utf8");
  fs.writeFileSync(path.join(dir,"alt.txt"),post.alt+"\n","utf8");
  if(post.format==="Reel") { writeSrt(post,dir); writeShotList(post,dir); }
}

async function main() {
  ensure(out);
  const render=process.argv.includes("--render");
  if(render) for(const post of batch.posts) await buildPost(post);
  else for(const post of batch.posts) writeTextPostFiles(post);
  writeManifest();
  writeGallery();
  console.log(`${render?"Rendered":"Updated text for"} ${batch.posts.length} posts in ${out}`);
}
main().catch(err=>{console.error(err);process.exit(1);});
