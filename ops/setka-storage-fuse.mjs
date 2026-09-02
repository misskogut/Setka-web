const projectRef = process.env.SUPABASE_PROJECT_REF || 'gfchgaphzhxufwdhrcis';
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const cryoPath = process.env.SETKA_CRYOSLEEP_PATH || 'ops/SETKA_CRYOSLEEP.yml';
const warnAt = Number(process.env.SETKA_DISK_WARN_AT || '0.75');
const brakeAt = Number(process.env.SETKA_DISK_BRAKE_AT || '0.85');

if (!secret) {
  console.error('STORAGE_FUSE=NO_SECRET');
  process.exit(3);
}

const endpoint = `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`;
const auth = Buffer.from(`user:${secret}`).toString('base64');
const response = await fetch(endpoint, { headers: { Authorization: `Basic ${auth}` } });
if (!response.ok) {
  console.error(`STORAGE_FUSE=METRICS_UNAVAILABLE status=${response.status}`);
  process.exit(4);
}
const text = await response.text();

function labels(line) {
  const m = line.match(/\{([^}]*)\}/);
  if (!m) return {};
  return Object.fromEntries(m[1].split(',').map(x => x.split('=').map(y => y.replace(/^"|"$/g, ''))));
}
function value(line) {
  const m = line.match(/\}\s+([0-9.eE+-]+)$/);
  return m ? Number(m[1]) : NaN;
}
function pick(metric) {
  const lines = text.split('\n').filter(line => line.startsWith(metric + '{'));
  const candidates = lines.map(line => ({ line, l: labels(line), v: value(line) }))
    .filter(x => x.l.service_type === 'db' && x.l.mountpoint === '/' && Number.isFinite(x.v));
  return candidates[0]?.v ?? NaN;
}

const avail = pick('node_filesystem_avail_bytes');
const size = pick('node_filesystem_size_bytes');
if (!Number.isFinite(avail) || !Number.isFinite(size) || size <= 0) {
  console.error('STORAGE_FUSE=METRICS_MISSING');
  process.exit(5);
}

const usedRatio = 1 - (avail / size);
const usedPct = usedRatio * 100;
console.log(`STORAGE_FUSE_DISK_USED_PCT=${usedPct.toFixed(3)}`);
console.log(`STORAGE_FUSE_DISK_AVAIL_BYTES=${Math.round(avail)}`);
console.log(`STORAGE_FUSE_DISK_SIZE_BYTES=${Math.round(size)}`);

if (usedRatio >= brakeAt) {
  console.log('STORAGE_FUSE=TRIP');
  process.exit(42);
}
if (usedRatio >= warnAt) {
  console.log('STORAGE_FUSE=WARN');
  process.exit(10);
}
console.log('STORAGE_FUSE=GREEN');
