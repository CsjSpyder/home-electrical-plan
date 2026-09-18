(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kinds={lamp:['灯具','#cd7730','灯'],switch:['开关','#b94d55','开'],strip:['灯带','#947044','带'],sensor:['感应设备','#68884e','感'],outlet:['插座','#52768a','电'],curtain:['窗帘','#96833e','帘'],camera:['监控','#ad607c','监'],network:['网络','#426ea0','网'],speaker:['音箱','#348c83','音']};
  const layers={lighting:['灯光开关',['lamp','switch','strip','sensor']],power:['电源窗帘',['outlet','curtain']],network:['网络智能',['network','camera','speaker']],all:['全部',Object.keys(kinds)]};
  let project,layer='lighting',selected=null,view,gesture=null;
  const pointers=new Map(),svg=$('#plan'),canvas=$('#canvas');
  const quantity=items=>{const n=items.reduce((sum,p)=>sum+(p.qty??0),0),u=items.filter(p=>p.qty==null).length;return `${n}${u?` + ${u}处数量待定`:''}`;};
  const active=()=>project.points.filter(p=>p.status!=='取消');
  const current=()=>active().filter(p=>layers[layer][1].includes(p.kind)&&(!$('#region').value||p.region===$('#region').value));
  function fit(){view={x:-30,y:-25,w:project.background.width+60,h:project.background.height+50};draw();}
  function draw(){
    if(!project)return;
    svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
    const points=current().filter(p=>p.x!=null&&p.y!=null),ids=new Set(points.map(p=>p.id));
    let links='';
    if($('#links').checked)for(const p of points){const s=points.find(s=>s.id===p.controller?.switchId);if(s&&ids.has(s.id))links+=`<line x1="${s.x}" y1="${s.y}" x2="${p.x}" y2="${p.y}" stroke="#48718a" stroke-width="2" stroke-dasharray="7 5"/>`;}
    svg.innerHTML=`<image href="${project.background.dataUrl}" width="${project.background.width}" height="${project.background.height}" pointer-events="none"/>${links}${points.sort((a,b)=>Number(a.id===selected)-Number(b.id===selected)).map(p=>{const k=kinds[p.kind];return `<g class="pin" data-id="${esc(p.id)}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(p.id+' '+p.name+' 数量'+(p.qty??'待定'))}"><circle r="24" fill="transparent"/><circle class="halo" r="17" fill="none" stroke="${p.id===selected?k[1]:'transparent'}" stroke-width="3"/><circle r="12" fill="${k[1]}" stroke="white" stroke-width="2" ${p.status==='预留'?'stroke-dasharray="3 2"':''}/><text text-anchor="middle" y="4" fill="white" font-size="${p.kind==='switch'?9:11}" pointer-events="none">${p.kind==='switch'?`${p.keys??'?'}键`:k[2]}</text><text class="pin-label" x="${p.labelDx??17}" y="${p.labelDy??-15}" fill="${k[1]}">${esc(p.id)} ×${p.qty??'?'}</text></g>`;}).join('')}`;
    $('#zoom').textContent=Math.round((project.background.width+60)/view.w*100)+'%';
  }
  function refresh(){
    $('#layers').innerHTML=Object.entries(layers).map(([id,l])=>`<button data-layer="${id}" aria-pressed="${id===layer}">${l[0]}</button>`).join('');
    const points=current();
    $('#summary').innerHTML=`全屋设备 <strong>${quantity(active())}</strong> · 当前 <strong>${quantity(points)}</strong> / ${points.length} 处<br>含预留 ${quantity(points.filter(p=>p.status==='预留'))} · 待定位 ${points.filter(p=>p.x==null).length} 处 · 按数量字段汇总，开关按面板计`;
    draw();renderList();
  }
  function renderList(){
    const q=$('#search').value.trim().toLowerCase(),points=current().filter(p=>`${p.id} ${p.name} ${p.region}`.toLowerCase().includes(q));
    $('#rows').innerHTML=points.map(p=>`<button class="row" data-open="${esc(p.id)}" style="--color:${kinds[p.kind][1]}"><strong>${esc(p.id)}</strong>${esc(p.name)}<small>${esc(p.region)} · ${esc(p.status)} · 数量 ${p.qty??'待定'}${p.x==null?' · 待定位':''}</small></button>`).join('')||'<p class="subtle">没有符合条件的点位。可更换图层、区域或搜索词。</p>';
  }
  function show(id){
    const p=project.points.find(p=>p.id===id);if(!p)return;selected=id;draw();
    $('#detailId').textContent=p.id;$('#detailId').style.color=kinds[p.kind][1];$('#detailTitle').textContent=p.name;
    const fields=[['区域',p.region],['类别',kinds[p.kind][0]],['状态',p.status],[p.kind==='switch'?'面板数量':'设备数量',p.qty??'待定'],['安装高度',p.height==null?'待定':p.height+' mm'],['定位状态',p.x==null?'待定位':'已定位']];
    if(p.kind==='switch')fields.push(['面板键数',p.keys==null?'待定':p.keys+' 键']);
    for(const [key,label] of [['sockets','电源插口数'],['fixed','固定接线端数'],['weak','弱电线路数']])fields.push([label,p[key]??'待定']);
    for(const [key,label] of [['location','位置说明'],['spec','规格 / 电源用途'],['purpose','用途'],['shared','共用说明'],['notes','备注']])if(p[key])fields.push([label,p[key]]);
    fields.push(['控制开关',p.controller?`${p.controller.switchId} 第${p.controller.key}键`:'未指定']);
    let html='<dl>'+fields.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>';
    const related=p.kind==='switch'?project.points.filter(x=>x.controller?.switchId===id):p.controller?project.points.filter(x=>x.id===p.controller.switchId):[];
    if(p.kind==='switch'||related.length)html+=`<section class="detail-section"><h3>${p.kind==='switch'?'关联灯具':'查看控制开关'}</h3>${related.map(x=>`<button class="related" data-open="${esc(x.id)}">${p.kind==='switch'?`第${x.controller.key}键 · `:''}${esc(x.id+' '+x.name)}${x.status==='取消'?'（已取消）':''} →</button>`).join('')||'<p class="subtle">未关联灯具</p>'}</section>`;
    const scenes=(project.mappings||[]).filter(m=>m.type==='场景'&&m.status!=='取消'&&(m.switchId===id||(m.targets||[]).includes(id)));
    if(scenes.length)html+=`<section class="detail-section"><h3>场景联动（原项目记录）</h3>${scenes.map(m=>`<p class="subtle">${esc(m.switchId)} 第${esc(m.key)}键 · ${esc(m.gesture)}<br>${esc(m.action)}<br>目标：${esc((m.targets||[]).join('、'))}</p>`).join('')}</section>`;
    html+='<p class="subtle">控制连线表示关联关系，不代表实际施工走线。本页仅查看，不控制真实设备。</p>';
    $('#detailBody').innerHTML=html;$('#list').close();if(!$('#details').open)$('#details').showModal();$('#details').scrollTop=0;
  }
  function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  function zoom(factor,anchor={x:view.x+view.w/2,y:view.y+view.h/2}){const base=project.background.width+60,next=Math.min(base*1.5,Math.max(base/8,view.w*factor)),f=next/view.w;view={x:anchor.x-(anchor.x-view.x)*f,y:anchor.y-(anchor.y-view.y)*f,w:next,h:view.h*f};draw();}
  function startGesture(){
    const ps=[...pointers.values()];
    if(ps.length===1)gesture={type:'pan',start:ps[0],view:{...view},scale:svg.getScreenCTM().a,moved:ps[0].suppressClick||false};
    else if(ps.length>=2){const [a,b]=ps;gesture={type:'pinch',distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),mid:point({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2}),view:{...view},moved:true};}
  }
  canvas.addEventListener('pointerdown',e=>{if(!project||e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,id:e.target.closest('[data-id]')?.dataset.id});canvas.setPointerCapture(e.pointerId);startGesture();});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{...old,clientX:e.clientX,clientY:e.clientY});if(gesture.type==='pan'){const dx=e.clientX-gesture.start.clientX,dy=e.clientY-gesture.start.clientY;if(Math.hypot(dx,dy)>6)gesture.moved=true;if(gesture.moved){view={...gesture.view,x:gesture.view.x-dx/gesture.scale,y:gesture.view.y-dy/gesture.scale};draw();}}else{const [a,b]=[...pointers.values()];if(!b)return;const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(distance>0){view={...gesture.view};zoom(gesture.distance/distance,gesture.mid);}}});
  function endPointer(e,cancel=false){if(!pointers.has(e.pointerId))return;const g=gesture;pointers.delete(e.pointerId);if(!cancel&&g?.type==='pan'&&!g.moved&&g.start.id)show(g.start.id);for(const [id,p] of pointers)pointers.set(id,{...p,suppressClick:true});gesture=null;if(pointers.size)startGesture();}
  canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));
  canvas.addEventListener('wheel',e=>{if(!project)return;e.preventDefault();zoom(e.deltaY>0?1.15:1/1.15,point(e));},{passive:false});
  svg.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){const id=e.target.closest('[data-id]')?.dataset.id;if(id){e.preventDefault();show(id);}}});
  $('#layers').onclick=e=>{const b=e.target.closest('[data-layer]');if(b){layer=b.dataset.layer;refresh();}};
  $('#region').onchange=()=>project&&refresh();$('#links').onchange=draw;
  $('#search').oninput=()=>project&&renderList();$('#listButton').onclick=()=>{if(project){renderList();$('#list').showModal();}};
  document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)show(b.dataset.open);});
  $('#fit').onclick=()=>project&&fit();$('#in').onclick=()=>project&&zoom(.75);$('#out').onclick=()=>project&&zoom(1/.75);
  fetch('plan.json').then(r=>{if(!r.ok)throw Error('项目加载失败');return r.json();}).then(p=>{
    if(p.schema!=='electrical-plan-v1'||!Array.isArray(p.points)||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.background?.dataUrl||''))throw Error('项目格式无效');
    if(p.points.some(x=>!kinds[x.kind]))throw Error('项目包含未知设备类型');
    project=p;$('#title').textContent=p.name;document.title=p.name+' · 电位图只读查看';
    $('#region').innerHTML='<option value="">全部区域</option>'+[...new Set(p.points.map(x=>x.region))].map(r=>`<option>${esc(r)}</option>`).join('');
    $('#version').textContent='项目快照：'+new Date(p.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});fit();refresh();
  }).catch(err=>{$('#summary').textContent=err.message+'，请刷新重试。';});
})();
