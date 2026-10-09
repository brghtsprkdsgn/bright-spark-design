// Generate a game catalog from Pages CMS entries whenever Cloudflare publishes.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const folder = path.join(root, 'data', 'games');
const games = [];
const asWebPath = input => {
  if (typeof input !== 'string' || !input.trim()) return '';
  let clean = input.trim().replace(/\\/g, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.includes('..') || /^\/\//.test(clean) || /^[a-z]+:/i.test(clean)) return '';
  return clean.split('/').map((part, idx) => idx === 0 ? '' : encodeURIComponent(part)).join('/');
};
if (fs.existsSync(folder)) {
  for (const name of fs.readdirSync(folder).filter(n => n.endsWith('.json')).sort()) {
    try {
      const item = JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
      const title = String(item.title || '').trim();
      const gameFile = asWebPath(item.game_file);
      if (!title || !gameFile || !/\.html?$/i.test(gameFile)) continue;
      const decoded = decodeURIComponent(gameFile);
      if (!fs.existsSync(path.join(root, decoded.replace(/^\//, '')))) {
        console.warn(`Game file not found for ${title}: ${decoded}`);
        continue;
      }
      games.push({ title, description: String(item.description || ''),
        category: String(item.category || 'Classroom Games'),
        thumbnail: asWebPath(item.thumbnail), game_file: gameFile,
        featured: Boolean(item.featured) });
    } catch (e) { console.warn(`Skipping invalid game entry: ${name}`, e.message); }
  }
}
games.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify({ games }, null, 2) + '\n');
console.log(`Built catalog.json with ${games.length} playable games.`);


// Additional resource collections: keep games and their existing JSON format untouched.
const collections = [
  ['brain-breaks','Brain Breaks'],
  ['teacher-tools','Teacher Tools'],
  ['bell-ringers','Bell Ringers & Warm-Ups'],
  ['math-resources','Math Resources'],
  ['other-resources','Other Resources']
];
const resources = [];
for (const [directory, category] of collections) {
  const location = path.join(root, 'data', directory);
  if (!fs.existsSync(location)) continue;
  for (const filename of fs.readdirSync(location).filter(n=>n.endsWith('.json')).sort()) {
    try {
      const item = JSON.parse(fs.readFileSync(path.join(location,filename),'utf8'));
      const title = String(item.title || '').trim();
      if (!title) continue;
      const html = asWebPath(item.html_file);
      const download = asWebPath(item.download_file);
      const exists = (url) => {
        if (!url) return false;
        let decoded;
        try { decoded = decodeURIComponent(url); } catch { return false; }
        return fs.existsSync(path.join(root,decoded.replace(/^\//,'')));
      };
      const link = exists(html) ? html : exists(download) ? download : '';
      if (!link) { console.warn(`Resource ${title} has no published file yet; skipping.`); continue; }
      resources.push({title, description:String(item.description||''), category,
        thumbnail:asWebPath(item.thumbnail), resource_file:link,
        resource_type:link === html ? 'interactive' : 'download', featured:Boolean(item.featured)});
    } catch(e) { console.warn(`Skipping resource ${filename}: ${e.message}`); }
  }
}
resources.sort((a,b)=>Number(b.featured)-Number(a.featured)||a.title.localeCompare(b.title));
fs.writeFileSync(path.join(root,'resources-catalog.json'),JSON.stringify({resources},null,2)+'\n');
console.log(`Built resources-catalog.json with ${resources.length} resources.`);
