/* Natural Earth land, 1:110m scale, public domain. */
const resetGlobeOnReload =
 performance.getEntriesByType('navigation')[0]?.type === 'reload' &&
 ['', '#top'].includes(location.hash);

if (resetGlobeOnReload) history.scrollRestoration = 'manual';

async function setupGlobeFlight() {
 const land = await d3.json('data/globe-land.geojson');
 const flight = document.querySelector('.flight');
 const scene = flight.querySelector('.flight-scene');
 const canvas = document.getElementById('flight-globe');
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const cities = {
  London: [-0.1276, 51.5072],
  'New York': [-74.006, 40.7128],
  'San Diego': [-117.1611, 32.7157],
  'New Delhi': [77.209, 28.6139]
 };
 const range = [2081, 2100];
 const londonCase = 'ssp585';
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const kicker = document.getElementById('flight-kicker');
 const title = document.getElementById('flight-title');
 const description = document.getElementById('flight-description');
 const reveal = document.getElementById('flight-reveal');
 const cityButtons = [...flight.querySelectorAll('[data-city]')];
 const globe = {type: 'Sphere'};
 const grid = d3.geoGraticule().step([20, 20])();
 const projection = d3.geoOrthographic().clipAngle(90);
 const path = d3.geoPath(projection, ctx);
 const destinations = Object.keys(cities);
 let selectedCity = 'London';
 let chapter = 0;
 let copyKey = '';
 let frameRequested = false;
 let camera = {center: [-34, 30], zoom: 1};
 let disk;
 let travel;
 let drag;

 function arrive(stage, city, destination) {
  selectedCity = city;
  chapter = stage;
  camera = {center: destination, zoom: 2.62};
  copyKey = '';
 }

 function highlightCity(city) {
  cityButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.city === city)));
 }

 function goTo(city, destination) {
  highlightCity(city);
  if (reduced.matches) {
   travel = undefined;
   arrive(1, city, destination);
  } else {
   const angle = d3.geoDistance(camera.center, destination);
   travel = {
    start: performance.now(), duration: 1350 + angle * 450,
    city, destination,
    route: d3.geoInterpolate(camera.center, destination),
    startZoom: camera.zoom, pullback: Math.min(1.25, angle * 1.15)
   };
   kicker.textContent = 'In flight';
  }
  requestRender();
 }

 function cancelTravel() {
  if (!travel) return;
  travel = undefined;
  copyKey = '';
  requestRender();
 }

 function hitsGlobe(event) {
  const bounds = canvas.getBoundingClientRect();
  return disk && Math.hypot(event.clientX - bounds.left - disk.x, event.clientY - bounds.top - disk.y) <= disk.radius;
 }

 function zoomBy(factor) {
  cancelTravel();
  camera.zoom = Math.max(.65, Math.min(5, camera.zoom * factor));
  requestRender();
 }

 function rotateBy(longitude, latitude) {
  cancelTravel();
  camera.center = [
   ((camera.center[0] + longitude + 180) % 360 + 360) % 360 - 180,
   Math.max(-89, Math.min(89, camera.center[1] + latitude))
  ];
  const nearest = d3.least(destinations, city => d3.geoDistance(camera.center, cities[city]));
  if (d3.geoDistance(camera.center, cities[nearest]) <= 14 * Math.PI / 180 &&
      (chapter !== 1 || selectedCity !== nearest)) {
   selectedCity = nearest;
   chapter = 1;
  }
  requestRender();
 }

 function copyFor(stage) {
  const key = stage === 1 ? `${stage}:${selectedCity}` : String(stage);
  if (key === copyKey) return;
  copyKey = key;
  reveal.hidden = stage !== 1;
  highlightCity(stage === 1 ? selectedCity : null);

  if (stage === 0) {
   kicker.textContent = 'A warming world';
   title.innerHTML = 'Beyond the <em>yearly average.</em>';
   description.textContent = 'If two cities warm by nearly the same amount over a year, will their Aprils look the same?';
  } else {
   const value = periodAnnual(selectedCity, londonCase, range);
   kicker.textContent = '2081–2100 · SSP5-8.5';
   title.textContent = selectedCity;
   description.textContent = `The model projects ${fmt(value)} °C of average warming near ${selectedCity} relative to 1985–2014. What changes when we look inside the year?`;

  }
 }

 function drawGlobe(stage, elapsed) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
   canvas.width = Math.round(width * ratio);
   canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const mobile = width < 740;
  const base = Math.min(width * (mobile ? .41 : .29), height * (mobile ? .30 : .43));
  const {center, zoom} = camera;
  const scale = base * zoom;
  const x = width * (mobile ? .52 : .72);
  const y = height * (mobile ? .36 : .51);
  disk = {x, y, radius: scale};
  projection.translate([x, y]).scale(scale).rotate([-center[0], -center[1]]);
  const cloudLevel = travel && chapter === 0 && !reduced.matches
   ? Math.exp(-((elapsed - .68) ** 2) / .012) : 0;
  scene.style.setProperty('--cloud-opacity', (cloudLevel * .82).toFixed(3));
  scene.style.setProperty('--cloud-offset', `${Math.round((elapsed - .68) * 650)}px`);

  ctx.save();
  ctx.beginPath();
  path(globe);
  ctx.shadowColor = '#638fff';
  ctx.shadowBlur = mobile ? 21 : 42;
  const ocean = ctx.createRadialGradient(x - scale * .25, y - scale * .42, 6, x, y, scale);
  ocean.addColorStop(0, '#27466e');
  ocean.addColorStop(.66, '#101e3b');
  ocean.addColorStop(1, '#0a142e');
  ctx.fillStyle = ocean;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  path(land);
  const continents = ctx.createLinearGradient(x - scale, y - scale * .5, x + scale, y + scale);
  continents.addColorStop(0, '#7c8796');
  continents.addColorStop(.52, '#536777');
  continents.addColorStop(1, '#27394d');
  ctx.fillStyle = continents;
  ctx.fill();
  ctx.strokeStyle = '#9eb7c380';
  ctx.lineWidth = .65;
  ctx.stroke();

  ctx.beginPath();
  path(grid);
  ctx.strokeStyle = '#b6ceff27';
  ctx.lineWidth = .6;
  ctx.stroke();

  ctx.beginPath();
  path(globe);
  ctx.strokeStyle = '#adc9ffb0';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  for (const city of destinations) {
   if (d3.geoDistance(center, cities[city]) >= Math.PI / 2) continue;
   const [px, py] = projection(cities[city]);
   if (px < 10 || py < 12 || px > width - 10 || py > height - 12) continue;
   const active = city === (travel?.city ?? (stage === 1 ? selectedCity : null));
   ctx.save();
   ctx.shadowBlur = active ? 19 : 10;
   ctx.shadowColor = '#ffc08b';
   ctx.beginPath();
   ctx.arc(px, py, active ? 5.5 : 3.2, 0, 2 * Math.PI);
   ctx.fillStyle = '#ffd7ac';
   ctx.fill();
   ctx.restore();
   ctx.font = active ? '600 14px Arial' : '12px Arial';
   ctx.strokeStyle = '#101525';
   ctx.lineWidth = 3;
   ctx.fillStyle = '#fff1dc';
   const labelWidth = ctx.measureText(city).width;
   const labelX = px + labelWidth + 12 > width ? px - labelWidth - 9 : px + 9;
   ctx.strokeText(city, labelX, py - 8);
   ctx.fillText(city, labelX, py - 8);
  }
 }

 function render(now = performance.now()) {
  frameRequested = false;
  if (travel) {
   const elapsed = Math.max(0, Math.min(1, (now - travel.start) / travel.duration));
   if (elapsed < 1) {
    const progress = d3.easeCubicInOut(elapsed);
    camera = {
     center: travel.route(progress),
     zoom: d3.interpolateNumber(travel.startZoom, 2.62)(progress) - travel.pullback * Math.sin(Math.PI * progress)
    };
    drawGlobe(-1, elapsed);
    requestRender();
    return;
   }
   arrive(1, travel.city, travel.destination);
   travel = undefined;
  }
  copyFor(chapter);
  drawGlobe(chapter, 0);
 }

 function requestRender() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(render);
 }

 canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || !hitsGlobe(event)) return;
  cancelTravel();
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('is-dragging');
 });
 canvas.addEventListener('pointermove', event => {
  canvas.classList.toggle('over-globe', hitsGlobe(event));
  if (event.pointerId !== drag?.id) return;
  const sensitivity = 75 / disk.radius;
  rotateBy((drag.x - event.clientX) * sensitivity, (event.clientY - drag.y) * sensitivity);
  drag.x = event.clientX;
  drag.y = event.clientY;
 });
 canvas.addEventListener('lostpointercapture', () => {
  drag = undefined;
  canvas.classList.remove('is-dragging');
 });
 canvas.addEventListener('wheel', event => {
  if (!hitsGlobe(event) || !event.deltaY) return;
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1);
  zoomBy(Math.exp(-Math.max(-240, Math.min(240, delta)) * (event.ctrlKey ? .012 : .0025)));
 }, {passive: false});
 canvas.addEventListener('keydown', event => {
  const directions = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10]};
  if (directions[event.key]) rotateBy(...directions[event.key]);
  else if (event.key === '+' || event.key === '=') zoomBy(1.2);
  else if (event.key === '-') zoomBy(1 / 1.2);
  else return;
  event.preventDefault();
 });

 cityButtons.forEach(button => button.addEventListener('click', () => {
  const city = button.dataset.city;
  goTo(city, cities[city]);
 }));
 reveal.addEventListener('click', () => {
  const selector = document.getElementById('match-case');
  const option = [...selector.options].find(item => item.textContent === 'London · SSP5-8.5');
  if (option) {
   selector.value = option.value;
   selector.dispatchEvent(new Event('change'));
  }
  if (!document.getElementById('match-chart').classList.contains('is-monthly')) {
   document.getElementById('match-toggle').click();
  }
 });
 flight.hidden = false;
 if (resetGlobeOnReload && ['', '#top'].includes(location.hash)) {
  window.scrollTo({top: 0, behavior: 'instant'});
 } else if (location.hash && location.hash !== '#top') {
  // The globe adds scroll height above the charts once its map has loaded.
  document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior: 'instant'});
 }
 new ResizeObserver(requestRender).observe(scene);
 reduced.addEventListener('change', () => { cancelTravel(); requestRender(); });
 render();
}
