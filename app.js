/* D3 v7. CMIP6 CESM2: nearest-grid-cell temperature anomalies, not observations. */
'use strict';
const colors={ssp126:'#087d79',ssp245:'#a66a05',ssp585:'#c34442'};
const names={ssp126:'SSP1-2.6',ssp245:'SSP2-4.5',ssp585:'SSP5-8.5'};
const scenarios=Object.keys(names),locations=['San Diego','New York','London','New Delhi'];
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const state={location:'San Diego',scenarios:[...scenarios],range:[2081,2100],view:'smooth'};
const W=960,H=340,M={top:28,right:25,bottom:48,left:61};
let annual=[],monthly=[],baseline,annualByLocation,monthlyIndex,brush,brushG,trendX,trendSvg;
const tip=d3.select('#tooltip'),fmt=d3.format('+.2f'),fmtOne=d3.format('+.1f');
function hideTip(){tip.attr('hidden',true)}
function showTip(event,html){
 tip.html(html).attr('hidden',null);
 let cx=event.clientX,cy=event.clientY;
 if(!Number.isFinite(cx)){const rect=event.target.getBoundingClientRect();cx=rect.left+rect.width/2;cy=rect.top;}
 const rect=tip.node().getBoundingClientRect();
 tip.style('left',`${Math.max(8,Math.min(innerWidth-rect.width-8,cx+15))}px`).style('top',`${Math.max(8,Math.min(innerHeight-rect.height-8,cy+15))}px`);
}
function period(){return state.range.join('–')}
function localAnnual(location,s){return annualByLocation.get(location).get(s)}
function periodAnnual(location,s,range=state.range){const[a,b]=range;return d3.mean(localAnnual(location,s).filter(d=>d.year>=a&&d.year<=b),d=>d.anomaly_c)}
function seasonalData(location=state.location,range=state.range){
 const[a,b]=range,result=[];
 for(const s of scenarios)for(let month=1;month<=12;month++){
  const values=monthlyIndex.get(location).get(s).get(month).filter(d=>d.year>=a&&d.year<=b);
  result.push({scenario:s,month,value:d3.mean(values,d=>d.temperature_c)-baseline.get(location).get(month)});
 }
 return result;
}
function skeleton(id,x,yDomain,xTicks,title,desc){
 const host=d3.select(id);host.selectAll('*').remove();
 const svg=host.append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img').attr('aria-labelledby',`${id.slice(1)}-title ${id.slice(1)}-desc`);
 svg.append('title').attr('id',`${id.slice(1)}-title`).text(title);
 svg.append('desc').attr('id',`${id.slice(1)}-desc`).text(desc);
 const y=d3.scaleLinear().domain(yDomain).nice().range([H-M.bottom,M.top]);
 svg.append('g').attr('class','grid').attr('transform',`translate(${M.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-M.left-M.right)).tickFormat(''));
 svg.append('g').attr('transform',`translate(${M.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(10).tickFormat(d=>`${d>0?'+':''}${d}°`));
 svg.append('g').attr('transform',`translate(0,${H-M.bottom})`).call(d3.axisBottom(x).tickValues(xTicks).tickSize(0).tickPadding(12).tickFormat(id==='#trend'?d3.format('d'):d=>monthNames[d-1].slice(0,3)));
 svg.append('text').attr('class','axis-label').attr('x',M.left).attr('y',14).text('Temperature change (°C)');
 if(y.domain()[0]<=0)svg.append('line').attr('class','zero-line').attr('x1',M.left).attr('x2',W-M.right).attr('y1',y(0)).attr('y2',y(0));
 return{svg,y};
}
function line(x,y,key){return d3.line().defined(d=>Number.isFinite(d[key])).x(d=>x(d.year)).y(d=>y(d[key]))}
function renderTrend(){
 trendX=d3.scaleLinear().domain([2015,2100]).range([M.left,W-M.right]);
 // Keep the same scale when pathways or the smoothing mode change.
 const all=scenarios.flatMap(s=>localAnnual(state.location,s));
 const extent=d3.extent(all,d=>d.anomaly_c);
 const{svg,y}=skeleton('#trend',trendX,[Math.min(-1,extent[0]),Math.max(1,extent[1])],[2020,2040,2060,2080,2100],`Temperature change near ${state.location}`,`Three pathways from 2015 to 2100. ${state.view==='smooth'?'Thick lines are trailing 20-year averages; faint lines show annual values.':'Lines show annual values.'} Drag to select years, or use the year form beneath the chart.`);
 trendSvg=svg;
 for(const s of state.scenarios){
  const rows=localAnnual(state.location,s);
  if(state.view==='smooth')svg.append('path').datum(rows).attr('class','raw-series').attr('stroke',colors[s]).attr('d',line(trendX,y,'anomaly_c'));
  svg.append('path').datum(rows).attr('class','series').attr('stroke',colors[s]).attr('stroke-dasharray',s==='ssp245'?'8 4':s==='ssp126'?'2 5':null).attr('d',line(trendX,y,state.view==='smooth'?'rolling_20yr_anomaly_c':'anomaly_c'));
 }
 brush=d3.brushX().extent([[M.left,M.top],[W-M.right,H-M.bottom]]).on('start',hideTip).on('brush end',event=>{
  if(!event.sourceEvent)return;
  if(!event.selection){brushG.call(brush.move,state.range.map(trendX));return;}
  let[a,b]=event.selection.map(trendX.invert).map(Math.round);
  a=Math.max(2015,Math.min(2099,a));b=Math.max(a+1,Math.min(2100,b));state.range=[a,b];
  renderLinked();
  if(event.type==='end')brushG.call(brush.move,state.range.map(trendX));
 });
 brushG=svg.append('g').attr('class','brush').call(brush);
 brushG.call(brush.move,state.range.map(trendX));
 const focus=svg.append('line').attr('class','crosshair').attr('y1',M.top).attr('y2',H-M.bottom).attr('visibility','hidden');
 svg.on('pointermove',event=>{
  if(event.buttons){focus.attr('visibility','hidden');return hideTip();}
  const[x,py]=d3.pointer(event,svg.node());if(x<M.left||x>W-M.right||py<M.top||py>H-M.bottom){focus.attr('visibility','hidden');return hideTip();}
  const year=Math.round(trendX.invert(x));focus.attr('x1',trendX(year)).attr('x2',trendX(year)).attr('visibility','visible');
  let html=`<strong>${state.location} · ${year}</strong>`;
  for(const s of state.scenarios){const row=localAnnual(state.location,s).find(d=>d.year===year),value=row[state.view==='smooth'?'rolling_20yr_anomaly_c':'anomaly_c'];html+=`<br>${names[s]}: ${Number.isFinite(value)?fmt(value)+' °C':'20-year window not yet complete'}`;}
  showTip(event,html);
 }).on('pointerleave',()=>{focus.attr('visibility','hidden');hideTip();});
 d3.select('#trend-note').text(state.view==='smooth'?'Thick patterned lines: 20-year trailing averages. Faint lines: individual years. Each average is labeled by the last year of its window; the first full future window ends in 2034.':'Patterned lines show individual annual anomalies. The year selector updates the monthly view and location comparison below; it does not crop this full timeline.');
}
function renderSeason(data){
 const filtered=data.filter(d=>state.scenarios.includes(d.scenario));
 const x=d3.scaleLinear().domain([1,12]).range([M.left,W-M.right]);
 // Scale covers all three pathways at this location and period, even when some are hidden.
 const ext=d3.extent(data,d=>d.value);
 const{svg,y}=skeleton('#season',x,[Math.min(0,ext[0]),Math.max(1,ext[1])],d3.range(1,13),`Monthly warming near ${state.location}, ${period()}`,`Each calendar month's mean for ${period()} minus that same month's mean in 1985–2014. All values are in degrees Celsius. The complete numeric table is in Data and methods.`);
 for(const s of state.scenarios){svg.append('path').datum(filtered.filter(d=>d.scenario===s)).attr('class','series').attr('stroke',colors[s]).attr('stroke-dasharray',s==='ssp245'?'8 4':s==='ssp126'?'2 5':null).attr('d',d3.line().x(d=>x(d.month)).y(d=>y(d.value)));}
 const html=d=>`<strong>${state.location} · ${monthNames[d.month-1]}</strong><br>${names[d.scenario]} · ${period()}<br>${fmt(d.value)} °C vs this month's baseline`;
 svg.selectAll('circle').data(filtered).join('circle').attr('cx',d=>x(d.month)).attr('cy',d=>y(d.value)).attr('r',4.5).attr('fill',d=>colors[d.scenario]).attr('stroke','white').attr('stroke-width',1.5).attr('tabindex',0).attr('role','img').attr('aria-label',d=>`${monthNames[d.month-1]}, ${names[d.scenario]}, ${fmt(d.value)} degrees Celsius relative to 1985–2014`).on('pointerenter',function(e,d){showTip(e,html(d));}).on('pointerleave',hideTip).on('focus',function(e,d){showTip(e,html(d));}).on('blur',hideTip);
 const focus=svg.append('line').attr('class','crosshair').attr('y1',M.top).attr('y2',H-M.bottom).attr('visibility','hidden');
 // Hovering anywhere within the plot compares all active pathways for that month.
 svg.on('pointermove',event=>{
  const[px,py]=d3.pointer(event,svg.node());if(px<M.left||px>W-M.right||py<M.top||py>H-M.bottom){focus.attr('visibility','hidden');return hideTip();}
  const month=Math.max(1,Math.min(12,Math.round(x.invert(px))));focus.attr('x1',x(month)).attr('x2',x(month)).attr('visibility','visible');
  showTip(event,`<strong>${state.location} · ${monthNames[month-1]}</strong><br>${period()}<br>`+filtered.filter(d=>d.month===month).map(d=>`${names[d.scenario]}: ${fmt(d.value)} °C`).join('<br>'));
 }).on('pointerleave',()=>{focus.attr('visibility','hidden');hideTip();});
 const s=state.scenarios.at(-1),rows=filtered.filter(d=>d.scenario===s),peak=d3.greatest(rows,d=>d.value),low=d3.least(rows,d=>d.value);
 d3.select('#season-insight').text(`Near ${state.location}, ${names[s]} shows its largest monthly change in ${monthNames[peak.month-1]} (${fmt(peak.value)} °C) during ${period()}, compared with ${fmt(low.value)} °C in ${monthNames[low.month-1]}. The annual average hides this seasonal contrast.`);
}
function renderComparison(){
 const magnitude=d3.scaleSequential(d3.interpolateRgb('#f0f4fb','#7c9fd3')).domain([0,8]).clamp(true);
 const tbody=d3.select('#comparison-table tbody');tbody.selectAll('*').remove();
 for(const location of locations){
  const tr=tbody.append('tr');tr.append('th').attr('scope','row').append('button').attr('type','button').attr('aria-pressed',String(location===state.location)).attr('aria-label',`Explore ${location}`).text(location).on('click',()=>selectLocation(location));
  for(const s of scenarios){const value=periodAnnual(location,s);tr.append('td').style('background',magnitude(value)).attr('class',state.scenarios.includes(s)?null:'inactive').attr('aria-label',`${location}, ${names[s]}: ${fmt(value)} degrees Celsius${state.scenarios.includes(s)?'':', inactive pathway'}`).text(`${fmtOne(value)} °C`);}
 }
 d3.selectAll('#comparison-table thead th[data-scenario]').classed('inactive',function(){return!state.scenarios.includes(this.dataset.scenario)});
 if(state.scenarios.length>1){
  const low=state.scenarios[0],high=state.scenarios.at(-1),gap=periodAnnual(state.location,high)-periodAnnual(state.location,low);
  d3.select('#compare-insight').text(`Near ${state.location}, the average change under ${names[high]} is ${fmt(gap)} °C relative to ${names[low]} during ${period()}. Select another location to see how the pathway difference changes.`);
 }else{
  const s=state.scenarios[0],values=locations.map(location=>({location,value:periodAnnual(location,s)})),warm=d3.greatest(values,d=>d.value),cool=d3.least(values,d=>d.value);
  d3.select('#compare-insight').text(`Under ${names[s]}, average change during ${period()} ranges from ${fmt(cool.value)} °C near ${cool.location} to ${fmt(warm.value)} °C near ${warm.location}. The same pathway produces different local outcomes.`);
 }
}
function renderTable(data){
 d3.select('#monthly-caption').text(`${state.location} · ${period()} · change relative to each month's 1985–2014 average. Inactive pathways are labeled in the table.`);
 const tbody=d3.select('#monthly-table tbody');tbody.selectAll('*').remove();
 for(let month=1;month<=12;month++){
  const tr=tbody.append('tr');tr.append('th').attr('scope','row').text(monthNames[month-1]);
  for(const s of scenarios){const value=data.find(d=>d.month===month&&d.scenario===s).value;tr.append('td').text(`${fmt(value)}${state.scenarios.includes(s)?'':' (inactive)'}`);}
 }
}
function renderLinked(){
 hideTip();const data=seasonalData();renderSeason(data);renderComparison();renderTable(data);
 document.querySelectorAll('.place').forEach(e=>e.textContent=state.location);
 ['selected-period','season-period','compare-period'].forEach(id=>document.getElementById(id).textContent=period());
 document.getElementById('start').value=state.range[0];document.getElementById('end').value=state.range[1];
 document.getElementById('status').textContent=`${state.location} · ${period()} · ${state.range[1]-state.range[0]+1} years · ${state.scenarios.length} pathway${state.scenarios.length===1?'':'s'} selected. All changes are relative to 1985–2014.`;
 document.querySelectorAll('[data-range]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.range===state.range.join(','))));
 document.getElementById('year-error').hidden=true;
}
function selectLocation(location){state.location=location;document.getElementById('location').value=location;hideTip();renderTrend();renderLinked();}
function selectRange(a,b){state.range=[a,b];hideTip();brushG.call(brush.move,state.range.map(trendX));renderLinked();}
function bindControls(){
 document.getElementById('location').addEventListener('change',e=>selectLocation(e.target.value));
 document.querySelectorAll('#scenarios input').forEach(input=>input.addEventListener('change',e=>{
  const active=[...document.querySelectorAll('#scenarios input:checked')].map(el=>el.value);
  if(!active.length){e.target.checked=true;document.getElementById('status').textContent='Keep at least one emissions pathway selected.';return;}
  state.scenarios=active;hideTip();renderTrend();renderLinked();
 }));
 document.querySelectorAll('input[name=view]').forEach(input=>input.addEventListener('change',e=>{state.view=e.target.value;hideTip();renderTrend();}));
 document.getElementById('year-form').addEventListener('submit',e=>{
  e.preventDefault();const a=Number(document.getElementById('start').value),b=Number(document.getElementById('end').value);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<2015||b>2100||a>=b){const error=document.getElementById('year-error');error.textContent='Choose whole years from 2015 to 2100. The end year must be after the start year.';error.hidden=false;return;}
  selectRange(a,b);
 });
 document.querySelectorAll('[data-range]').forEach(el=>el.addEventListener('click',()=>selectRange(...el.dataset.range.split(',').map(Number))));
 document.getElementById('reset').addEventListener('click',()=>{
  Object.assign(state,{location:'San Diego',scenarios:[...scenarios],range:[2081,2100],view:'smooth'});
  document.getElementById('location').value=state.location;document.querySelectorAll('#scenarios input').forEach(e=>e.checked=true);document.querySelector('input[name=view][value=smooth]').checked=true;hideTip();renderTrend();renderLinked();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
}
function setupWarmingMatch() {
 const range = [2081, 2100];
 const formatAnnual = d3.format('+.3f');
 const cases = locations.flatMap(location => {
  const monthlyValues = seasonalData(location, range);
  return scenarios.map(scenario => ({
   location,
   scenario,
   label: `${location} · ${names[scenario]}`,
   annual: periodAnnual(location, scenario, range),
   months: monthlyValues.filter(d => d.scenario === scenario).map(d => d.value)
  }));
 });
 const color = d3.scaleLinear()
  .domain([-1, 0, 2, 4, 6, 8])
  .range(['#f3f6fc', '#e9effa', '#c3d3ef', '#8aa7df', '#526fb1', '#293c78'])
  .clamp(true);
 const chart = d3.select('#match-chart');
 const caseSelect = d3.select('#match-case');
 const toggle = d3.select('#match-toggle');
 const result = d3.select('#match-result');
 let showMonths = false;
 let first, match, selectedMonth;

 caseSelect.selectAll('option').data(cases).join('option')
  .attr('value', (_, index) => index).text(d => d.label);
 caseSelect.property('value', cases.findIndex(d => d.location === 'London' && d.scenario === 'ssp585'));

 const strips = chart.selectAll('.year-strip').data([0, 1]).join('div').attr('class', 'year-strip');
 const captions = strips.append('div').attr('class', 'year-caption');
 captions.append('span');
 captions.append('strong');
 const tracks = strips.append('div').attr('class', 'year-track').attr('aria-hidden', 'true');
 tracks.selectAll('span').data(d3.range(12)).join('span');
 const monthPicker = chart.append('div').attr('class', 'year-months')
  .attr('role', 'group').attr('aria-label', 'Inspect monthly warming');
 const monthButtons = monthPicker.selectAll('button').data(monthNames).join('button')
  .attr('type', 'button').html(month => `<span aria-hidden="true">${month.slice(0, 3)}</span>`)
  .on('click', (_, month) => {
   selectedMonth = monthNames.indexOf(month);
   updateSelection();
  });

 const gaps = d3.select('.year-gaps');

 function updateSelection() {
  tracks.selectAll('span').classed('selected', month => month === selectedMonth);
  monthButtons.attr('aria-pressed', (_, index) => String(index === selectedMonth));
  if (showMonths) {
   const a = first.months[selectedMonth], b = match.months[selectedMonth];
   gaps.select('#annual-gap').text(`${Math.abs(first.annual - match.annual).toFixed(2)} °C`);
   gaps.select('#month-gap-label').text(`${monthNames[selectedMonth]} gap`);
   gaps.select('#month-gap').text(`${Math.abs(a - b).toFixed(2)} °C`);
   result.text(`${monthNames[selectedMonth]}: ${first.location} ${fmt(a)} °C, ${match.location} ${fmt(b)} °C. That’s a ${Math.abs(a - b).toFixed(2)} °C gap.`);
  } else {
   result.text(`Their annual averages are about ${Math.abs(first.annual - match.annual).toFixed(2)} °C apart.`);
  }
 }

 function updateView() {
  chart.classed('is-monthly', showMonths);
  gaps.property('hidden', !showMonths);
  toggle.text(showMonths ? 'Show the annual average' : 'Reveal the months');
  monthPicker.property('hidden', !showMonths);
  updateSelection();
 }

 function updatePair() {
  first = cases[Number(caseSelect.property('value'))];
  match = d3.least(cases.filter(d => d.location !== first.location), d => Math.abs(d.annual - first.annual));
  selectedMonth = d3.greatest(d3.range(12), month => Math.abs(first.months[month] - match.months[month]));

  captions.select('span').text(index => [first, match][index].label);
  captions.select('strong').text(index => `${formatAnnual([first, match][index].annual)} °C annual`);
  tracks.each(function(index) {
   const row = [first, match][index];
   d3.select(this).selectAll('span')
    .style('--annual', color(row.annual))
    .style('--month', month => color(row.months[month]));
  });
  monthButtons.attr('aria-label', (name, month) =>
   `${name}: ${first.location} ${fmt(first.months[month])} °C, ${match.location} ${fmt(match.months[month])} °C`);
  updateView();
 }

 caseSelect.property('disabled', false).on('change', updatePair);
 toggle.property('disabled', false).on('click', () => {
  showMonths = !showMonths;
  updateView();
 });
 chart.property('hidden', false);
 updatePair();
}

async function init(){
 try{
  [annual,monthly]=await Promise.all(['annual','monthly'].map(file=>d3.csv(`data/climate_${file}.csv`,row=>{
   const r=d3.autoType(row);
   if(file==='annual')r.rolling_20yr_anomaly_c=r.rolling_20yr_anomaly_c===null?NaN:r.rolling_20yr_anomaly_c;
   return r;
  })));
  annualByLocation=d3.group(annual.filter(d=>scenarios.includes(d.scenario)),d=>d.location,d=>d.scenario);
  monthlyIndex=d3.group(monthly.filter(d=>scenarios.includes(d.scenario)),d=>d.location,d=>d.scenario,d=>d.month);
  baseline=d3.rollup(monthly.filter(d=>d.scenario==='historical'&&d.year>=1985&&d.year<=2014),rows=>d3.mean(rows,d=>d.temperature_c),d=>d.location,d=>d.month);
  for(const location of locations)for(const s of scenarios)if(localAnnual(location,s).length!==86)throw new Error(`Incomplete annual series: ${location}/${s}`);
  bindControls();renderTrend();renderLinked();setupWarmingMatch();
  setupGlobeFlight().catch(error => console.warn('Globe preview unavailable', error));
 }catch(error){console.error(error);document.getElementById('match-result').textContent='Temperature projections could not load. Try reloading the page.';document.getElementById('status').textContent='The climate data could not be loaded. Please reload the page. For local use, serve this folder with an HTTP server as described in the README.';}
}
init();
