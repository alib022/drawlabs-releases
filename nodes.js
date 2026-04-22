// Animated node canvas for the hero.
// Places nodes, draws curved wires, animates packets along the graph.

(function(){
  const canvas = document.getElementById('node-canvas');
  if(!canvas) return;
  const wires = document.getElementById('wires');

  // Node graph. Positions in normalized 0..1 across the usable area
  // (inside of palette on left, with padding on right).
  // Each node is centered on its (x,y) via translate(-50%,-50%).
  const NODES = [
    { id:'src-pacs',  x: 0.10, y: 0.20, kind:'source',    title:'PACS',            sub:'DICOM', body:[['studies/hr','3,412'],['modality','CT·MR']] },
    { id:'src-ehr',   x: 0.10, y: 0.72, kind:'source',    title:'Epic EHR',        sub:'FHIR',  body:[['resources','Patient·Obs'],['stream','live']] },
    { id:'guard',     x: 0.34, y: 0.46, kind:'guard',     title:'PHI Guard',       sub:'policy',body:[['policy','HIPAA Safe Harbor'],['violations','0']] },
    { id:'deid',      x: 0.58, y: 0.20, kind:'transform', title:'De-identify',     sub:'local', body:[['fields','18 of 18'],['mode','strict']] },
    { id:'fhir-tr',   x: 0.58, y: 0.72, kind:'transform', title:'FHIR → features', sub:'local', body:[['mapping','v3.2'],['rows','1.2M']] },
    { id:'agent',     x: 0.82, y: 0.46, kind:'agent',     title:'Radiology Agent', sub:'local-llm', body:[['model','qwen-14b·gguf'],['tokens/s','84']] },
  ];

  const EDGES = [
    ['src-pacs','guard'],
    ['src-ehr','guard'],
    ['guard','deid'],
    ['guard','fhir-tr'],
    ['deid','agent'],
    ['fhir-tr','agent']
  ];

  // tint mapping
  const KIND_ICON = {
    source:'IN', transform:'TR', guard:'PG', agent:'AI', sink:'OUT'
  };

  // Usable area starts after palette (198px = 180 panel + 16 left + pad)
  // and leaves room on the right for node width.
  const PAD_L = 212, PAD_R = 28, PAD_T = 18, PAD_B = 52;

  function render(){
    // wipe
    canvas.querySelectorAll('.node').forEach(n=>n.remove());

    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const areaW = W - PAD_L - PAD_R;
    const areaH = H - PAD_T - PAD_B;

    // nodes (centered via CSS transform)
    NODES.forEach(n=>{
      const el = document.createElement('div');
      el.className = 'node';
      el.dataset.kind = n.kind;
      el.dataset.id = n.id;
      el.style.left = (PAD_L + n.x * areaW) + 'px';
      el.style.top  = (PAD_T + n.y * areaH) + 'px';
      el.style.transform = 'translate(-50%, -50%)';
      el.innerHTML = `
        <span class="port in"></span>
        <span class="port out"></span>
        <div class="n-head">
          <span class="n-ico">${KIND_ICON[n.kind]}</span>
          <span class="n-title">${n.title}</span>
          <span class="n-kind">${n.sub}</span>
        </div>
        <div class="n-body">
          ${n.body.map(b=>`<div class="n-row"><span class="k">${b[0]}</span><span class="v">${b[1]}</span></div>`).join('')}
        </div>`;
      canvas.appendChild(el);
    });

    drawWires();
  }

  function nodeCenter(id){
    const el = canvas.querySelector(`.node[data-id="${id}"]`);
    const r = el.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return {
      el,
      left: r.left - c.left,
      top: r.top - c.top,
      right: r.right - c.left,
      midY: r.top - c.top + r.height/2,
      width: r.width,
      height: r.height
    };
  }

  function drawWires(){
    // Clear existing paths (keep defs)
    [...wires.querySelectorAll('path')].forEach(p=>p.remove());

    const cRect = canvas.getBoundingClientRect();
    wires.setAttribute('viewBox', `0 0 ${cRect.width} ${cRect.height}`);

    EDGES.forEach(([a,b],i)=>{
      const na = nodeCenter(a), nb = nodeCenter(b);
      const x1 = na.right, y1 = na.midY;
      const x2 = nb.left,  y2 = nb.midY;
      const dx = Math.max(40, (x2-x1)*0.5);
      const d = `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      path.dataset.a = a; path.dataset.b = b;
      wires.appendChild(path);
    });
  }

  // Packet animation
  function spawnPacket(pathEl, duration=1400){
    const packet = document.createElement('div');
    packet.className = 'packet';
    canvas.appendChild(packet);
    const len = pathEl.getTotalLength();
    const start = performance.now();
    function step(t){
      const p = Math.min(1, (t - start)/duration);
      const pt = pathEl.getPointAtLength(p*len);
      packet.style.left = (pt.x - 5) + 'px';
      packet.style.top  = (pt.y - 5) + 'px';
      packet.style.opacity = p<.08 ? p/.08 : (p>.92 ? (1-p)/.08 : 1);
      if(p < 1) requestAnimationFrame(step);
      else packet.remove();
    }
    requestAnimationFrame(step);
  }

  // Pulse cycle: walk through edges, light nodes + wires as packets travel.
  function cycle(){
    const phases = [
      { edges:[['src-pacs','guard'],['src-ehr','guard']], nodes:['src-pacs','src-ehr','guard'] },
      { edges:[['guard','deid'],['guard','fhir-tr']],      nodes:['guard','deid','fhir-tr'] },
      { edges:[['deid','agent'],['fhir-tr','agent']],      nodes:['deid','fhir-tr','agent'] }
    ];
    let i = 0;
    function step(){
      // reset
      canvas.querySelectorAll('.node.active').forEach(n=>n.classList.remove('active'));
      wires.querySelectorAll('path.active').forEach(p=>p.classList.remove('active'));

      const ph = phases[i % phases.length];
      ph.nodes.forEach(id=>{
        const n = canvas.querySelector(`.node[data-id="${id}"]`);
        if(n) n.classList.add('active');
      });
      ph.edges.forEach(([a,b])=>{
        const p = wires.querySelector(`path[data-a="${a}"][data-b="${b}"]`);
        if(p){ p.classList.add('active'); spawnPacket(p, 1300); }
      });

      i++;
      setTimeout(step, 1500);
    }
    step();
  }

  // Secondary illustration in "how it works" section — a smaller animated node cluster
  function renderHowIllus(){
    const root = document.getElementById('how-illus');
    if(!root) return;
    root.innerHTML = `
      <svg viewBox="0 0 400 400" width="100%" height="100%" style="position:absolute;inset:0">
        <defs>
          <linearGradient id="grad2" x1="0" x2="1">
            <stop offset="0" stop-color="oklch(0.72 0.20 290)"/>
            <stop offset="1" stop-color="oklch(0.82 0.15 220)"/>
          </linearGradient>
          <radialGradient id="glowA">
            <stop offset="0" stop-color="oklch(0.72 0.20 290)" stop-opacity=".6"/>
            <stop offset="1" stop-color="oklch(0.72 0.20 290)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="170" fill="url(#glowA)" opacity=".5"/>
        <g stroke="var(--line)" stroke-width="1" fill="none" opacity=".7">
          <circle cx="200" cy="200" r="150"/>
          <circle cx="200" cy="200" r="110"/>
          <circle cx="200" cy="200" r="70"/>
        </g>
        <g id="rings"></g>
        <g id="illus-edges" stroke="url(#grad2)" stroke-width="1.2" fill="none" opacity=".8"></g>
        <g id="illus-nodes"></g>
      </svg>
    `;
    const svg = root.querySelector('svg');
    const edgesG = svg.querySelector('#illus-edges');
    const nodesG = svg.querySelector('#illus-nodes');
    const center = { x:200, y:200 };

    const pts = [];
    const rings = [{r:70,n:3},{r:110,n:5},{r:150,n:6}];
    rings.forEach((ring,ri)=>{
      for(let i=0;i<ring.n;i++){
        const a = (i/ring.n)*Math.PI*2 + ri*0.3;
        pts.push({ x: center.x + Math.cos(a)*ring.r, y: center.y + Math.sin(a)*ring.r, r: ri });
      }
    });

    // draw edges between center + near points
    pts.forEach(p=>{
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',center.x);line.setAttribute('y1',center.y);
      line.setAttribute('x2',p.x);line.setAttribute('y2',p.y);
      edgesG.appendChild(line);
    });

    // center node
    const cNode = document.createElementNS('http://www.w3.org/2000/svg','rect');
    cNode.setAttribute('x',center.x-22);cNode.setAttribute('y',center.y-22);
    cNode.setAttribute('width',44);cNode.setAttribute('height',44);
    cNode.setAttribute('rx',8);
    cNode.setAttribute('fill','var(--bg-3)');
    cNode.setAttribute('stroke','url(#grad2)');cNode.setAttribute('stroke-width','1.5');
    nodesG.appendChild(cNode);
    const cLbl = document.createElementNS('http://www.w3.org/2000/svg','text');
    cLbl.setAttribute('x',center.x);cLbl.setAttribute('y',center.y+4);
    cLbl.setAttribute('text-anchor','middle');
    cLbl.setAttribute('font-family','JetBrains Mono');
    cLbl.setAttribute('font-size','11');
    cLbl.setAttribute('fill','var(--ink)');
    cLbl.textContent = 'RUNTIME';
    nodesG.appendChild(cLbl);

    pts.forEach((p,i)=>{
      const g = document.createElementNS('http://www.w3.org/2000/svg','circle');
      g.setAttribute('cx',p.x);g.setAttribute('cy',p.y);g.setAttribute('r', p.r===2?4:6);
      g.setAttribute('fill', p.r===2 ? 'var(--bg-3)' : 'var(--accent)');
      g.setAttribute('stroke','var(--line)');
      nodesG.appendChild(g);
      // pulse anim
      const dur = 2+Math.random()*2;
      const delay = Math.random()*2;
      const anim = document.createElementNS('http://www.w3.org/2000/svg','animate');
      anim.setAttribute('attributeName','opacity');
      anim.setAttribute('values','0.3;1;0.3');
      anim.setAttribute('dur', dur+'s');
      anim.setAttribute('begin', delay+'s');
      anim.setAttribute('repeatCount','indefinite');
      g.appendChild(anim);
    });
  }

  // Initial render, debounced resize
  let rafId;
  function go(){ render(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(drawWires); }
  go();
  renderHowIllus();
  window.addEventListener('resize', ()=>{
    clearTimeout(window.__rz);
    window.__rz = setTimeout(go, 120);
  });

  // start animation after a brief idle
  setTimeout(cycle, 400);

  // Step hover -> light different parts of the pipeline
  const STEP_MAP = {
    0:{ nodes:['src-pacs','src-ehr'], edges:[] },
    1:{ nodes:['agent'], edges:[] },
    2:{ nodes:['guard','deid','fhir-tr'], edges:[['guard','deid'],['guard','fhir-tr']] },
    3:{ nodes:['agent'], edges:[['fhir-tr','agent']] }
  };
  document.querySelectorAll('.step').forEach(s=>{
    s.addEventListener('mouseenter', ()=>{
      document.querySelectorAll('.step').forEach(x=>x.classList.remove('on'));
      s.classList.add('on');
    });
  });
})();
