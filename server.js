require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const countries = require('./data/countries.json');
const geoDataModule = require('countrycitystatejson/countries');
const geoData = geoDataModule.default || geoDataModule;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'bangladesh-postcodes.json');
const UPAZILA_FILE = path.join(__dirname, 'data', 'bangladesh-upazilas.json');
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE_NAME = 'gpc_admin_session';
const loginAttempts = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false, limit: '3mb' }));

function loadData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : (parsed.records || []);
    rows.forEach(r => { if (!r.id && !r._id) r.id = crypto.createHash('sha256').update([r.en?.division,r.en?.district,r.en?.thana,r.en?.suboffice,r.en?.postcode].join('|')).digest('hex').slice(0,24); });
    return Array.isArray(parsed) ? { records: rows, meta: {} } : { records: rows, meta: parsed };
  } catch { return { records: [], meta: {} }; }
}
function saveRecords(records, meta = {}) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ...meta, records }, null, 2), 'utf8');
}
function clean(v) { return String(v ?? '').trim().toLowerCase(); }
function normalizeArea(v) { return clean(v).replace(/[^a-z0-9]/g, '').replace(/brahamanbaria/g, 'brahmanbaria'); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function validSession(token) {
  if (!token || !SESSION_SECRET) return false;
  const [body, signature] = token.split('.');
  if (!body || !signature) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  try { const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return data.exp > Date.now() && data.user === ADMIN_USER; }
  catch { return false; }
}
function requireAdmin(req, res, next) {
  if (validSession(req.cookies?.[COOKIE_NAME])) return next();
  return res.status(401).json({ error: 'Please log in as administrator.' });
}
// Minimal cookie parser, avoiding an extra dependency.
app.use((req, res, next) => {
  req.cookies = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('='); if (i > -1) req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/countries', (req, res) => {
  const q = clean(req.query.q);
  const region = clean(req.query.region);
  const postalSystem = clean(req.query.postalSystem);
  const searchableFields = ['name', 'code', 'alpha2', 'alpha3', 'numeric', 'numericCode', 'capital', 'region', 'subregion', 'callingCode', 'tld'];
  const results = countries.filter(country => {
    const matchesQuery = !q || searchableFields.some(field => clean(country[field]).includes(q));
    const matchesRegion = !region || clean(country.region).includes(region);
    const matchesPostalSystem = !postalSystem || clean(country.postalSystem).includes(postalSystem);
    return matchesQuery && matchesRegion && matchesPostalSystem;
  });
  res.json({
    count: results.length,
    total: countries.length,
    filters: { q: req.query.q || '', region: req.query.region || '', postalSystem: req.query.postalSystem || '' },
    countries: results
  });
});
app.get('/api/global-search', (req, res) => {
  const q = clean(req.query.q);
  if (q.length < 2) return res.json({ countries: [], results: [], message: 'Type at least 2 characters.' });
  const countryMatches = countries.filter(c => clean(c.name).includes(q) || clean(c.code).includes(q)).slice(0, 12);
  const results = loadData().records.filter(r => {
    const e = r.en || {}, b = r.bn || {};
    return [e.division,e.district,e.thana,e.suboffice,e.postcode,b.division,b.district,b.thana,b.suboffice,b.postcode].some(v => clean(v).includes(q));
  }).slice(0, 30);
  res.json({ countries: countryMatches, results, total: countryMatches.length + results.length, verified: false });
});
app.get('/api/bd/summary', (req, res) => {
  const records = loadData().records;
  const divisions = [...new Set(records.map(r => r.en?.division).filter(Boolean))].sort();
  const districts = [...new Set(records.map(r => r.en?.district).filter(Boolean))].sort();
  res.json({ records: records.length, divisions: divisions.length, districts: districts.length, dataAvailable: records.length > 0 });
});
app.get('/api/bd/upazilas', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(UPAZILA_FILE, 'utf8'));
    const normalize = value => clean(value).replace(/[^a-z0-9]/g, '');
    const divisionAliases = { chittagong: 'chattogram', barisal: 'barishal' };
    const wantedDivision = normalize(divisionAliases[clean(req.query.division)] || req.query.division || '');
    const wantedDistrict = normalize(req.query.district || '');
    let items = data.items || [];
    if (wantedDivision) items = items.filter(item => normalize(divisionAliases[clean(item.division.en)] || item.division.en) === wantedDivision);
    if (wantedDistrict) items = items.filter(item => normalize(item.district.en) === wantedDistrict);
    res.json({ count: items.length, upazilas: items, source: data.source, verified: false });
  } catch {
    res.status(500).json({ error: 'Upazila dataset could not be loaded.' });
  }
});
app.get('/api/bd/locations', (req, res) => {
  let rows = loadData().records;
  const { division, district, thana } = req.query;
  if (division) rows = rows.filter(r => clean(r.en?.division) === clean(division));
  if (district) rows = rows.filter(r => clean(r.en?.district) === clean(district));
  if (thana) rows = rows.filter(r => clean(r.en?.thana) === clean(thana));
  const unique = key => [...new Set(rows.map(r => r.en?.[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  res.json({ divisions: unique('division'), districts: unique('district'), thanas: unique('thana'), postOffices: unique('suboffice') });
});
app.get('/api/bd/search', (req, res) => {
  const { division, district, thana, suboffice, postcode, q } = req.query;
  const results = loadData().records.filter(r => {
    const e = r.en || {}, b = r.bn || {};
    if (division && clean(e.division) !== clean(division)) return false;
    if (district && clean(e.district) !== clean(district)) return false;
    if (thana && normalizeArea(e.thana) !== normalizeArea(thana)) return false;
    if (suboffice && clean(e.suboffice) !== clean(suboffice)) return false;
    if (postcode && String(e.postcode) !== String(postcode).trim()) return false;
    if (q && ![e.division,e.district,e.thana,e.suboffice,e.postcode,b.division,b.district,b.thana,b.suboffice,b.postcode].join(' ').toLowerCase().includes(clean(q))) return false;
    return true;
  });
  res.json({ count: results.length, results, verified: false });
});

app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const attempt = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (attempt.until > Date.now() && attempt.count >= 6) return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes and try again.' });
  if (!ADMIN_HASH || !SESSION_SECRET) return res.status(503).json({ error: 'Admin setup incomplete. Configure ADMIN_PASSWORD_HASH and SESSION_SECRET in .env.' });
  const usernameOk = safeEqual(req.body.username || '', ADMIN_USER);
  const passwordOk = await bcrypt.compare(String(req.body.password || ''), ADMIN_HASH).catch(() => false);
  if (!usernameOk || !passwordOk) {
    const next = attempt.until > Date.now() ? attempt : { count: 0, until: Date.now() + 15 * 60 * 1000 };
    next.count += 1; loginAttempts.set(ip, next);
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  loginAttempts.delete(ip);
  const token = sign({ user: ADMIN_USER, exp: Date.now() + 8 * 60 * 60 * 1000 });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' });
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' }); res.json({ ok: true }); });
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ ok: true, username: ADMIN_USER }));
app.get('/api/admin/records', requireAdmin, (req, res) => res.json({ records: loadData().records }));
function normalizeRecord(body) {
  const en = body.en || body;
  const bn = body.bn || {};
  const record = {
    id: String(body.id || crypto.randomUUID()),
    en: {
      division: String(en.division || '').trim(), district: String(en.district || '').trim(),
      thana: String(en.thana || '').trim(), suboffice: String(en.suboffice || '').trim(),
      postcode: String(en.postcode || '').trim()
    },
    bn: {
      division: String(bn.division || '').trim(), district: String(bn.district || '').trim(),
      thana: String(bn.thana || '').trim(), suboffice: String(bn.suboffice || '').trim(),
      postcode: String(bn.postcode || '').trim()
    },
    verified: Boolean(body.verified)
  };
  if (!record.en.division || !record.en.district || !record.en.thana || !record.en.suboffice || !record.en.postcode) throw new Error('Division, district, thana, post office and postal code are required.');
  if (!/^\d{4}$/.test(record.en.postcode)) throw new Error('Bangladesh postal code must contain 4 digits.');
  return record;
}
app.post('/api/admin/records', requireAdmin, (req, res) => {
  try {
    const data = loadData(); const record = normalizeRecord(req.body);
    if (data.records.some(r => String(r.en?.postcode) === record.en.postcode && clean(r.en?.suboffice) === clean(record.en.suboffice) && clean(r.en?.thana) === clean(record.en.thana))) return res.status(409).json({ error: 'A matching post office and postal code already exists.' });
    data.records.push(record); saveRecords(data.records, data.meta); res.status(201).json({ ok: true, record });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/records/:id', requireAdmin, (req, res) => {
  try {
    const data = loadData(); const index = data.records.findIndex(r => String(r.id || r._id || '') === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Record not found.' });
    const record = normalizeRecord({ ...req.body, id: req.params.id }); data.records[index] = record;
    saveRecords(data.records, data.meta); res.json({ ok: true, record });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/records/:id', requireAdmin, (req, res) => {
  const data = loadData(); const next = data.records.filter(r => String(r.id || r._id || '') !== req.params.id);
  if (next.length === data.records.length) return res.status(404).json({ error: 'Record not found.' });
  saveRecords(next, data.meta); res.json({ ok: true });
});
app.post('/api/admin/import', requireAdmin, (req, res) => {
  try {
    const lines = String(req.body.csv || '').trim().split(/\r?\n/);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV needs a header row and at least one data row.' });
    const parse = line => { const out=[]; let cur='', quoted=false; for(let i=0;i<line.length;i++){const c=line[i]; if(c==='"' && line[i+1]==='"' && quoted){cur+='"';i++;} else if(c==='"') quoted=!quoted; else if(c===','&&!quoted){out.push(cur.trim());cur='';} else cur+=c;} out.push(cur.trim()); return out; };
    const headers = parse(lines[0]).map(h=>h.toLowerCase());
    const required=['division','district','thana','suboffice','postcode'];
    if (!required.every(h=>headers.includes(h))) return res.status(400).json({ error: 'Required CSV columns: division,district,thana,suboffice,postcode. Optional: bn_division,bn_district,bn_thana,bn_suboffice,bn_postcode,verified.' });
    const data=loadData(); let added=0, skipped=0;
    for(const line of lines.slice(1)){ if(!line.trim()) continue; const cols=parse(line); const row={}; headers.forEach((h,i)=>row[h]=cols[i]||'');
      try { const record=normalizeRecord({en:{division:row.division,district:row.district,thana:row.thana,suboffice:row.suboffice,postcode:row.postcode},bn:{division:row.bn_division,district:row.bn_district,thana:row.bn_thana,suboffice:row.bn_suboffice,postcode:row.bn_postcode},verified:row.verified==='true'});
        const duplicate=data.records.some(r=>String(r.en?.postcode)===record.en.postcode&&clean(r.en?.suboffice)===clean(record.en.suboffice)&&clean(r.en?.thana)===clean(record.en.thana));
        if(duplicate){skipped++;continue;} data.records.push(record);added++;
      } catch { skipped++; }
    }
    saveRecords(data.records,data.meta); res.json({ok:true,added,skipped,total:data.records.length});
  } catch(e){res.status(400).json({error:e.message});}
});
app.get('/api/admin/export.csv', requireAdmin, (req,res) => {
  const rows=loadData().records; const headers=['division','district','thana','suboffice','postcode','bn_division','bn_district','bn_thana','bn_suboffice','bn_postcode','verified'];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[headers.join(','),...rows.map(r=>{const e=r.en||{},b=r.bn||{};return [e.division,e.district,e.thana,e.suboffice,e.postcode,b.division,b.district,b.thana,b.suboffice,b.postcode,r.verified===true].map(q).join(',');})].join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="bangladesh-postcodes.csv"'); res.send('\uFEFF'+csv);
});
app.get('/api/countries/:code/divisions', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const country = countries.find(item => String(item.code || item.alpha2 || '').toUpperCase() === code);
  if (!country) return res.status(404).json({ error: 'Country not found', divisions: [] });
  if (code === 'BD') {
    const rows = loadData().records;
    const divisions = [...new Set(rows.map(row => row.en?.division).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    return res.json({ country: country.name, count: divisions.length, divisions, source: 'local-bangladesh-dataset' });
  }
  try {
    const divisions = geoData.getStatesByShort(code) || [];
    return res.json({ country: country.name, count: divisions.length, divisions, source: 'bundled-local-dataset' });
  } catch (error) {
    return res.status(500).json({ error: 'Local division dataset could not be loaded.', divisions: [] });
  }
});
app.get('/api/countries/:code', (req, res) => {
  const identifier = clean(req.params.code);
  const country = countries.find(item =>
    [item.code, item.alpha2, item.alpha3, item.numeric, item.numericCode]
      .some(value => clean(value) === identifier)
  );
  if (!country) return res.status(404).json({ error: 'Country not found' });
  res.json(country);
});
app.get('/admin', (req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT,()=>console.log(`Global Postal Codes running at http://localhost:${PORT}`));
