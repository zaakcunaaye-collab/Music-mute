const $=s=>document.querySelector(s);
const videoInput=$("#videoInput"), fileName=$("#fileName"), muteBtn=$("#muteBtn");
const downloadBtn=$("#downloadBtn"), progressWrap=$("#progressWrap"), progress=$("#progress"), status=$("#status");
let selectedFile=null, outputUrl=null;

function setTheme(v){
  document.body.classList.toggle("light",v==="light" || (v==="system" && matchMedia("(prefers-color-scheme:light)").matches));
  document.documentElement.style.setProperty("--theme-color",v==="light"?"#f5f5f5":"#080808");
  localStorage.setItem("mm-theme",v);
  $("#themeSelect").value=v;
}
setTheme(localStorage.getItem("mm-theme")||"dark");

$("#settingsBtn").onclick=()=>$("#settings").classList.remove("hidden");
$("#settingsClose").onclick=()=>$("#settings").classList.add("hidden");
$("#themeSelect").onchange=e=>setTheme(e.target.value);

const adsEnabled=localStorage.getItem("mm-ads")!=="0";
$("#adsToggle").checked=adsEnabled;
$("#adsToggle").onchange=e=>localStorage.setItem("mm-ads",e.target.checked?"1":"0");

function showOpeningAd(){
  if(!navigator.onLine || localStorage.getItem("mm-ads")==="0") return;
  const o=$("#adOverlay"), timer=$("#adTimer"), close=$("#closeAd");
  o.classList.remove("hidden"); o.setAttribute("aria-hidden","false"); close.disabled=true;
  let n=10; timer.textContent=n;
  const id=setInterval(()=>{n--;timer.textContent=n;if(n<=0){clearInterval(id);close.disabled=false;close.textContent="Continue";}},1000);
  close.onclick=()=>{o.classList.add("hidden");o.setAttribute("aria-hidden","true")};
}
window.addEventListener("load",showOpeningAd);

videoInput.onchange=e=>{
  selectedFile=e.target.files[0];
  if(!selectedFile)return;
  fileName.textContent=selectedFile.name;
  muteBtn.disabled=false;
  downloadBtn.classList.add("hidden");
};

async function loadFFmpeg(){
  if(!window.FFmpeg) throw new Error("FFmpeg library could not load. Check your internet connection.");
  const {FFmpeg, fetchFile}=FFmpeg;
  const ffmpeg=new FFmpeg();
  if(!ffmpeg.loaded){
    ffmpeg.on("progress",({progress:p})=>{
      progress.style.width=Math.max(0,Math.min(100,p*100))+"%";
    });
    status.textContent="Loading video engine…";
    await ffmpeg.load({
      coreURL:"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
      wasmURL:"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm"
    });
  }
  return {ffmpeg,fetchFile};
}

muteBtn.onclick=async()=>{
  if(!selectedFile)return;
  muteBtn.disabled=true; progressWrap.classList.remove("hidden"); downloadBtn.classList.add("hidden");
  try{
    const {ffmpeg,fetchFile}=await loadFFmpeg();
    const ext=(selectedFile.name.split(".").pop()||"mp4").toLowerCase();
    const input=`input.${ext}`, output="music-mute.webm";
    status.textContent="Removing audio…"; progress.style.width="5%";
    await ffmpeg.writeFile(input,await fetchFile(selectedFile));
    await ffmpeg.exec(["-i",input,"-an","-c:v","libvpx-vp9","-crf","30","-b:v","0",output]);
    const data=await ffmpeg.readFile(output);
    if(outputUrl)URL.revokeObjectURL(outputUrl);
    outputUrl=URL.createObjectURL(new Blob([data.buffer],{type:"video/webm"}));
    downloadBtn.href=outputUrl; downloadBtn.classList.remove("hidden");
    progress.style.width="100%"; status.textContent="Done — audio removed.";
  }catch(err){
    console.error(err); status.textContent="Could not process this video: "+err.message;
  }finally{muteBtn.disabled=false;}
};

$("#urlBtn").onclick=()=>{
  const url=$("#urlInput").value.trim(), out=$("#urlStatus");
  if(!url){out.textContent="Paste a video URL first.";return}
  out.textContent="This field accepts direct video-file URLs only when the server permits browser access (CORS). Page URLs such as YouTube/TikTok need a permitted server/API.";
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(console.error);
