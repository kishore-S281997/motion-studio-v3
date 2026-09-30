import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const FPS = 60
const W = 800
const H = 450

const uid = () => Math.random().toString(36).slice(2, 9)
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
const lerp = (a, b, t) => a + (b - a) * t

const makeKey = (t, props) => ({ t, ...props })

const defaultLayer = (type, index = 0) => {
  const base = {
    id: uid(),
    type,
    name: type === 'rect' ? 'Rectangle' : type === 'circle' ? 'Circle' : 'Text',
    x: 400 + index * 20,
    y: 225 + index * 10,
    scale: 1,
    rotation: 0,
    opacity: 1,
    color: type === 'rect' ? '#7c5cff' : type === 'circle' ? '#31d0aa' : '#f4f5f7',
    width: type === 'rect' ? 220 : type === 'circle' ? 120 : 320,
    height: type === 'rect' ? 120 : type === 'circle' ? 120 : 72,
    radius: type === 'rect' ? 18 : 60,
    text: type === 'text' ? 'Motion Studio' : '',
    fontSize: type === 'text' ? 46 : 0,
    fontWeight: type === 'text' ? 700 : 400,
    keys: [
      makeKey(0, { x: 400 + index * 20, y: 225 + index * 10, scale: 1, rotation: 0, opacity: 1 }),
      makeKey(3, { x: 400 + index * 20, y: 225 + index * 10, scale: 1, rotation: 0, opacity: 1 })
    ]
  }
  return base
}

const initialLayers = [
  { ...defaultLayer('rect'), name: 'Card', x: 400, y: 250, width: 360, height: 190, radius: 28, color: '#171b25', keys: [makeKey(0,{x:400,y:250,scale:.92,rotation:-2,opacity:1}), makeKey(0.5,{x:400,y:250,scale:1,rotation:0,opacity:1}), makeKey(3,{x:400,y:250,scale:1,rotation:0,opacity:1})] },
  { ...defaultLayer('circle',1), name: 'Accent', x: 400, y: 180, color: '#7c5cff', width: 120, height: 120, radius: 60, keys: [makeKey(0,{x:160,y:180,scale:.7,rotation:0,opacity:0}), makeKey(.6,{x:400,y:180,scale:1,rotation:0,opacity:1}), makeKey(3,{x:400,y:180,scale:1,rotation:0,opacity:1})] },
  { ...defaultLayer('text',2), name: 'Headline', x: 400, y: 300, text: 'Motion Studio', fontSize: 42, color:'#f5f7ff', keys: [makeKey(0,{x:400,y:320,scale:.8,rotation:0,opacity:0}), makeKey(.55,{x:400,y:300,scale:1,rotation:0,opacity:1}), makeKey(3,{x:400,y:300,scale:1,rotation:0,opacity:1})] }
]

function interpolate(keys, time) {
  if (!keys?.length) return { x:0,y:0,scale:1,rotation:0,opacity:1 }
  if (time <= keys[0].t) return { ...keys[0] }
  if (time >= keys[keys.length - 1].t) return { ...keys[keys.length - 1] }
  let a = keys[0], b = keys[keys.length - 1]
  for (let i=0;i<keys.length-1;i++) {
    if (time >= keys[i].t && time <= keys[i+1].t) { a=keys[i]; b=keys[i+1]; break }
  }
  const t = (time-a.t)/(b.t-a.t || 1)
  return {
    x: lerp(a.x,b.x,t), y: lerp(a.y,b.y,t),
    scale: lerp(a.scale,b.scale,t), rotation: lerp(a.rotation,b.rotation,t),
    opacity: lerp(a.opacity,b.opacity,t)
  }
}

function addOrReplaceKey(layer, time, values) {
  const next = layer.keys.filter(k => Math.abs(k.t-time) > 0.025)
  next.push(makeKey(Number(time.toFixed(3)), values))
  next.sort((a,b)=>a.t-b.t)
  return { ...layer, keys: next }
}

function lottieColor(hex) {
  const h = hex.replace('#','')
  const r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255
  return [r,g,b,1]
}

function keyframesToLottie(keys, prop) {
  return {
    a: 1,
    k: keys.map((k,i)=>({ t: Math.round(k.t*FPS), s:[k[prop]], e:[keys[i+1]?.[prop] ?? k[prop]] }))
  }
}

function makeLottie(layers, duration) {
  const outLayers = layers.map((layer, idx) => {
    const p = {
      a: 1,
      p: keyframesToLottie(layer.keys,'x'),
      s: { a: 1, k: layer.keys.map((k,i)=>({t:Math.round(k.t*FPS),s:[k.scale*100,k.scale*100,100],e:[(layer.keys[i+1]?.scale ?? k.scale)*100,(layer.keys[i+1]?.scale ?? k.scale)*100,100]})) },
      r: keyframesToLottie(layer.keys,'rotation'),
      o: { a: 1, k: layer.keys.map((k,i)=>({t:Math.round(k.t*FPS),s:[k.opacity*100],e:[(layer.keys[i+1]?.opacity ?? k.opacity)*100]})) }
    }
    // Convert x-only position into standard [x,y] position keyframes.
    p.p = {a:1,k:layer.keys.map((k,i)=>({t:Math.round(k.t*FPS),s:[k.x,k.y,0],e:[layer.keys[i+1]?.x ?? k.x,layer.keys[i+1]?.y ?? k.y,0]}))}
    const common = {ddd:0,ind:idx+1,ty:layer.type==='text'?5:4,nm:layer.name,sr:1,ks:{o:p.o,r:p.r,p:p.p,a:{a:0,k:[0,0,0]},s:p.s}}
    if (layer.type === 'text') {
      common.t = { d:{k:[{s:{sz:[layer.fontSize,layer.fontSize],t:layer.text,f:'Arial',fc:lottieColor(layer.color).slice(0,3),j:0,tr:0,lh:layer.fontSize*1.2,ls:0},t:0}]}, p:{} }
    } else {
      const fill = {ty:'fl',c:{a:0,k:lottieColor(layer.color)},o:{a:0,k:100},r:1}
      const shape = layer.type === 'circle'
        ? {ty:'el',p:{a:0,k:[0,0]},s:{a:0,k:[layer.width,layer.height]},nm:'Ellipse'}
        : {ty:'rc',p:{a:0,k:[0,0]},s:{a:0,k:[layer.width,layer.height]},r:{a:0,k:layer.radius},nm:'Rectangle'}
      common.shapes = [shape, fill, {ty:'tr',p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}]
    }
    return common
  })
  return {
    v:'5.13.0', fr:FPS, ip:0, op:Math.round(duration*FPS), w:W, h:H, nm:'Motion Studio Animation',
    ddd:0, assets:[], layers:outLayers
  }
}

function App() {
  const [layers,setLayers] = useState(initialLayers)
  const [selectedId,setSelectedId] = useState(initialLayers[1].id)
  const [duration,setDuration] = useState(3)
  const [time,setTime] = useState(0)
  const [playing,setPlaying] = useState(false)
  const [loop,setLoop] = useState(true)
  const [prompt,setPrompt] = useState('')
  const [snap,setSnap] = useState(true)
  const [zoom,setZoom] = useState(100)
  const raf = useRef(null)
  const last = useRef(null)
  const stageRef = useRef(null)
  const dragRef = useRef(null)

  const selected = layers.find(l=>l.id===selectedId) || layers[0]
  const current = selected ? interpolate(selected.keys, time) : null

  useEffect(()=>{
    if (!playing) return
    const tick = (now)=>{
      if (last.current == null) last.current=now
      const dt=(now-last.current)/1000
      last.current=now
      setTime(prev=>{
        const next=prev+dt
        if (next>=duration) {
          if(loop) return next%duration
          setPlaying(false); return duration
        }
        return next
      })
      raf.current=requestAnimationFrame(tick)
    }
    raf.current=requestAnimationFrame(tick)
    return ()=>{ cancelAnimationFrame(raf.current); last.current=null }
  },[playing,duration,loop])

  const updateSelected = (patch)=>{
    setLayers(prev=>prev.map(l=>l.id===selectedId?{...l,...patch}:l))
  }
  useEffect(()=>{
    const move = (e)=>{
      if(!dragRef.current || !stageRef.current) return
      const r=stageRef.current.getBoundingClientRect()
      const sx=W/r.width, sy=H/r.height
      const nx=clamp((e.clientX-r.left)*sx-dragRef.current.dx, -200, W+200)
      const ny=clamp((e.clientY-r.top)*sy-dragRef.current.dy, -100, H+100)
      const base=interpolate(selected?.keys || [], time)
      const nextX=snap ? Math.round(nx/5)*5 : nx
      const nextY=snap ? Math.round(ny/5)*5 : ny
      const values={...base,x:nextX,y:nextY}
      setLayers(prev=>prev.map(l=>l.id===selectedId?addOrReplaceKey(l,time,values):l))
    }
    const up=()=>{dragRef.current=null}
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',up)
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}
  },[selectedId,time,snap,selected?.keys])
  const setProp = (prop,val)=>{
    const n=Number(val)
    if(!selected) return
    const base=interpolate(selected.keys,time)
    const values={...base,[prop]:n}
    setLayers(prev=>prev.map(l=>l.id===selectedId?addOrReplaceKey(l,time,values):l))
  }
  const addLayer=(type)=>{
    const layer=defaultLayer(type,layers.length)
    setLayers(prev=>[...prev,layer]); setSelectedId(layer.id)
  }
  const deleteSelected=()=>{
    if(layers.length<=1) return
    const idx=layers.findIndex(l=>l.id===selectedId)
    const next=layers.filter(l=>l.id!==selectedId)
    setLayers(next); setSelectedId(next[Math.max(0,idx-1)].id)
  }
  const duplicateSelected=()=>{
    if(!selected) return
    const copy={...selected,id:uid(),name:selected.name+' Copy',keys:selected.keys.map(k=>({...k}))}
    setLayers(prev=>[...prev,copy]); setSelectedId(copy.id)
  }
  const applyPrompt=()=>{
    const q=prompt.toLowerCase()
    if(!selected) return
    let layer=selected
    let keys=[...layer.keys]
    let changed=false
    const base=interpolate(keys,time)
    if(q.includes('bounce')){
      keys=keys.filter(k=>k.t<=time+0.001)
      const start={...base}, up={...base,y:base.y-70}, down={...base,y:base.y+8}
      keys.push(makeKey(time,start),makeKey(time+.22,up),makeKey(time+.44,down),makeKey(time+.66,start))
      changed=true
    }
    if(q.includes('slide')||q.includes('from left')){
      const end={...base}
      keys=keys.filter(k=>k.t<=time+0.001)
      keys.push(makeKey(time,{...end,x:120,opacity:0}),makeKey(time+.6,{...end,x:end.x,opacity:1}))
      changed=true
    }
    if(q.includes('fade')){
      keys=keys.filter(k=>k.t<=time+0.001)
      keys.push(makeKey(time,{...base,opacity:0}),makeKey(time+.5,{...base,opacity:1}))
      changed=true
    }
    const colorMatch=q.match(/\b(red|blue|green|purple|yellow|orange|pink|white|black)\b/)
    const colors={red:'#ff5c6c',blue:'#4ea1ff',green:'#31d0aa',purple:'#7c5cff',yellow:'#ffd45a',orange:'#ff9d4d',pink:'#ff6fae',white:'#f5f7ff',black:'#111318'}
    if(colorMatch){ layer={...layer,color:colors[colorMatch[1]]}; changed=true }
    const dur=q.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|sec|s)\b/)
    if(dur) setDuration(clamp(Number(dur[1]),.5,30))
    const rot=q.match(/rotate\s*(-?\d+(?:\.\d+)?)\s*(?:degrees?|deg)?/)
    if(rot){ keys=keys.filter(k=>Math.abs(k.t-time)>.025); keys.push(makeKey(time,{...base,rotation:Number(rot[1])})); changed=true }
    const scale=q.match(/(?:scale|size)\s*(?:to\s*)?(\d+(?:\.\d+)?)x?/)
    if(scale){ keys=keys.filter(k=>Math.abs(k.t-time)>.025); keys.push(makeKey(time,{...base,scale:clamp(Number(scale[1]),.1,5)})); changed=true }
    if(q.includes('bigger')||q.includes('larger')){ keys=keys.filter(k=>Math.abs(k.t-time)>.025); keys.push(makeKey(time,{...base,scale:base.scale*1.25})); changed=true }
    if(q.includes('smaller')){ keys=keys.filter(k=>Math.abs(k.t-time)>.025); keys.push(makeKey(time,{...base,scale:base.scale*.8})); changed=true }
    if(q.includes('loop')) setLoop(true)
    if(changed){
      keys.sort((a,b)=>a.t-b.t)
      setLayers(prev=>prev.map(l=>l.id===selectedId?{...layer,keys}:l))
    }
    setPrompt('')
  }
  const exportLottie=()=>{
    const blob=new Blob([JSON.stringify(makeLottie(layers,duration),null,2)],{type:'application/json'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='motion-studio-animation.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  const saveProject=()=>{
    const blob=new Blob([JSON.stringify({version:3,duration,loop,layers},null,2)],{type:'application/json'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='motion-studio-project.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  const loadProject=(e)=>{
    const file=e.target.files?.[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=()=>{ try { const p=JSON.parse(reader.result); if(p.layers) {setLayers(p.layers);setDuration(p.duration||3);setLoop(p.loop??true);setSelectedId(p.layers[0].id);setTime(0)} } catch {} }
    reader.readAsText(file)
  }

  const stageScale=zoom/100
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brandMark">M</div><div><strong>Motion Studio</strong><span>V3 · Lottie editor</span></div></div>
      <div className="topActions">
        <button className="ghost" onClick={saveProject}>Save Project</button>
        <label className="ghost fileBtn">Open Project<input type="file" accept=".json" onChange={loadProject}/></label>
        <button className="primary" onClick={exportLottie}>Export Lottie JSON</button>
      </div>
    </header>

    <div className="workspace">
      <aside className="leftPanel">
        <div className="panelTitle">Layers <span>{layers.length}</span></div>
        <div className="addRow">
          <button onClick={()=>addLayer('rect')}>＋ Rectangle</button>
          <button onClick={()=>addLayer('circle')}>＋ Circle</button>
          <button onClick={()=>addLayer('text')}>＋ Text</button>
        </div>
        <div className="layers">
          {[...layers].reverse().map(layer=><div key={layer.id} className={'layer '+(layer.id===selectedId?'selected':'')} onClick={()=>setSelectedId(layer.id)}>
            <button className="eye" onClick={e=>{e.stopPropagation();setLayers(prev=>prev.map(l=>l.id===layer.id?{...l,visible:l.visible===false}:l))}}>{layer.visible===false?'○':'●'}</button>
            <div className="thumb">{layer.type==='text'?'T':layer.type==='circle'?'○':'□'}</div>
            <div className="layerInfo"><b>{layer.name}</b><small>{layer.type} · {layer.keys.length} keyframes</small></div>
            <span className="dots">⋮</span>
          </div>)}
        </div>
        <div className="panelHint">Tip: select a layer, move the playhead, change a property, and a keyframe is created automatically.</div>
      </aside>

      <main className="main">
        <div className="canvasToolbar">
          <div className="toolbarGroup">
            <button className={playing?'active':''} onClick={()=>setPlaying(v=>!v)}>{playing?'❚❚':'▶'}</button>
            <button onClick={()=>setTime(0)}>↺</button>
            <span className="timeReadout">{time.toFixed(2)}s / {duration.toFixed(2)}s</span>
          </div>
          <div className="toolbarGroup">
            <label>Zoom <input type="range" min="50" max="150" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><span>{zoom}%</span></label>
            <button className={snap?'active':''} onClick={()=>setSnap(v=>!v)}>Snap</button>
          </div>
        </div>
        <div className="canvasWrap">
          <div ref={stageRef} className="stage" style={{transform:`scale(${stageScale})`}}>
            <div className="safeArea"></div>
            {layers.map(layer=>{
              const v=interpolate(layer.keys,time)
              const style={left:layer.x,top:layer.y,transform:`translate(-50%,-50%) translate(${v.x-layer.x}px,${v.y-layer.y}px) scale(${v.scale}) rotate(${v.rotation}deg)`,opacity:layer.visible===false?0:v.opacity}
              return <div key={layer.id} className={'object '+layer.type+(layer.id===selectedId?' selection':'')} style={{...style,color:layer.color,width:layer.width,height:layer.height,background:layer.type==='text'?'transparent':layer.color,borderRadius:layer.type==='circle'?'50%':layer.radius}} onPointerDown={e=>{
                e.stopPropagation()
                setSelectedId(layer.id)
                const r=stageRef.current?.getBoundingClientRect()
                if(r) dragRef.current={dx:v.x-(e.clientX-r.left)*(W/r.width),dy:v.y-(e.clientY-r.top)*(H/r.height)}
              }}>
                {layer.type==='text'&&layer.text}
                {layer.id===selectedId&&<div className="handles"><i/><i/><i/><i/></div>}
              </div>
            })}
          </div>
        </div>
        <div className="promptBar">
          <span className="spark">✦</span>
          <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyPrompt()} placeholder="Try: “make it bounce”, “slide from left”, “rotate 20 degrees”, “make it red”"/>
          <button onClick={applyPrompt}>Apply</button>
        </div>
      </main>

      <aside className="rightPanel">
        <div className="panelTitle">Inspector</div>
        {selected&&<div className="inspector">
          <div className="selectedName"><span className="miniIcon">{selected.type==='text'?'T':selected.type==='circle'?'○':'□'}</span><input value={selected.name} onChange={e=>updateSelected({name:e.target.value})}/></div>
          <Section title="Transform">
            <div className="grid2">
              <Field label="X" value={Math.round(current.x)} onChange={v=>setProp('x',v)}/>
              <Field label="Y" value={Math.round(current.y)} onChange={v=>setProp('y',v)}/>
              <Field label="Scale" value={Number(current.scale.toFixed(2))} step=".05" onChange={v=>setProp('scale',v)}/>
              <Field label="Rotation" value={Math.round(current.rotation)} onChange={v=>setProp('rotation',v)}/>
              <Field label="Opacity" value={Math.round(current.opacity*100)} suffix="%" min="0" max="100" onChange={v=>setProp('opacity',Number(v)/100)}/>
            </div>
          </Section>
          <Section title="Appearance">
            <label className="colorRow"><span>Color</span><input type="color" value={selected.color} onChange={e=>updateSelected({color:e.target.value})}/><code>{selected.color}</code></label>
            {selected.type==='text'&&<><label className="textField">Text<input value={selected.text} onChange={e=>updateSelected({text:e.target.value})}/></label><Field label="Font size" value={selected.fontSize} onChange={v=>updateSelected({fontSize:Number(v)})}/></>}
            {selected.type!=='text'&&<div className="grid2"><Field label="Width" value={selected.width} onChange={v=>updateSelected({width:Number(v)})}/><Field label="Height" value={selected.height} onChange={v=>updateSelected({height:Number(v)})}/></div>}
          </Section>
          <Section title="Animation">
            <button className="keyButton" onClick={()=>setProp('x',current.x)}>◆ Add keyframe at {time.toFixed(2)}s</button>
            <div className="keyList">{selected.keys.map(k=><button key={k.t} onClick={()=>setTime(k.t)} className={Math.abs(k.t-time)<.025?'keyActive':''}><span>◆</span>{k.t.toFixed(2)}s</button>)}</div>
          </Section>
          <div className="inspectorActions"><button onClick={duplicateSelected}>Duplicate</button><button className="danger" onClick={deleteSelected}>Delete</button></div>
        </div>}
      </aside>
    </div>

    <footer className="timeline">
      <div className="timelineControls">
        <button onClick={()=>setPlaying(v=>!v)}>{playing?'❚❚':'▶'}</button>
        <button onClick={()=>setTime(Math.max(0,time-.1))}>‹</button>
        <button onClick={()=>setTime(Math.min(duration,time+.1))}>›</button>
        <label>Duration <input type="number" min=".5" max="30" step=".1" value={duration} onChange={e=>setDuration(clamp(Number(e.target.value)||3,.5,30))}/> s</label>
        <label className="loop"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop</label>
      </div>
      <div className="timelineBody">
        <div className="ruler">{Array.from({length:Math.ceil(duration)+1},(_,i)=><span key={i} style={{left:`${(i/duration)*100}%`}}>{i}s</span>)}</div>
        <div className="tracks">
          {layers.map(layer=><div className={'track '+(layer.id===selectedId?'trackSelected':'')} key={layer.id} onClick={()=>setSelectedId(layer.id)}>
            <div className="trackName">{layer.name}</div>
            <div className="trackLane">{layer.keys.map(k=><button key={k.t} className="diamond" style={{left:`${(k.t/duration)*100}%`}} onClick={e=>{e.stopPropagation();setTime(k.t)}} title={`${k.t.toFixed(2)}s`}>◆</button>)}</div>
          </div>)}
          <button className="playhead" style={{left:`calc(120px + (100% - 120px) * ${time/duration})`}} onClick={()=>{}} aria-label="playhead"/>
        </div>
      </div>
    </footer>
  </div>
}

function Section({title,children}){return <section className="section"><h3>{title}</h3>{children}</section>}
function Field({label,value,onChange,step='1',suffix='',min='-9999',max='9999'}){return <label className="field"><span>{label}</span><div><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/>{suffix&&<em>{suffix}</em>}</div></label>}

createRoot(document.getElementById('root')).render(<App />)
