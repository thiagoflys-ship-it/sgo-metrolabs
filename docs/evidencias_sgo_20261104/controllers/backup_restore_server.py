"""Executado por SSH no servidor: backup somente leitura e restore sem rede, sem trocar produção."""
import subprocess, pathlib, json, hashlib, os, stat, time

STAGE = pathlib.Path('/opt/metrolabs/qa/sgo-retomada-20261104-1157a80ec5b4')
ROOT = pathlib.Path('/opt/metrolabs/sgo')
BACK = STAGE / 'backup-verificado'
BACK.mkdir(mode=0o700, exist_ok=False)
PG_IMAGE = 'sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea'
NAME = 'sgo-retomada-restore-1157a80ec5b4'

def run(args, **kw):
    return subprocess.run(args, check=True, **kw)

def inspect(name):
    return json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]

APP_ID = '46330c2eefc6230cfefa4fb6c5a4627995542ddf9b3af941a66dd91b15be514f'
assert inspect('sgo-app-1')['Id'] == APP_ID
assert inspect('sgo-app-1')['State']['Running']
before_running = {x['Id']: {'image': x['Image'], 'pid': x['State']['Pid']} for x in
                  json.loads(subprocess.check_output(['docker', 'inspect', *subprocess.check_output(['docker', 'ps', '-q'], text=True).split()]))}

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def manifest(root, hashes=True):
    rows = []
    for p in sorted([root, *root.rglob('*')]):
        s = p.lstat()
        row = {'path': str(p.relative_to(root)), 'mode': stat.S_IMODE(s.st_mode), 'uid': s.st_uid, 'gid': s.st_gid,
               'kind': 'link' if p.is_symlink() else 'dir' if p.is_dir() else 'file', 'size': s.st_size if p.is_file() else 0}
        if p.is_symlink(): row['target'] = os.readlink(p)
        elif p.is_file() and hashes: row['sha256'] = digest(p)
        rows.append(row)
    return rows

def table_sql(name):
    q = '"' + name.replace('"', '""') + '"'
    return "SELECT count(*)::text AS count, md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text)), '')) AS digest FROM public." + q + ' t'

node = r"""
import pg from 'pg';
const c = new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect();
await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await c.query("SET TIME ZONE 'UTC'");
console.log(JSON.stringify({snapshot:(await c.query('SELECT pg_export_snapshot() AS s')).rows[0].s}));
const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
const hashes={};
for(const {tablename:n} of tables){ const q='"'+n.replaceAll('"','""')+'"';
 hashes[n]=(await c.query("SELECT count(*)::text AS count, md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text)), '')) AS digest FROM public."+q+' t')).rows[0]; }
console.log(JSON.stringify({tables:hashes}));
process.stdin.once('data',async()=>{await c.query('COMMIT');await c.end();});process.stdin.resume();
"""
source = None
created = False
proof = {'passed': False, 'productionChanged': False}
try:
    files = manifest(ROOT / 'dados')
    (BACK / 'files-source.json').write_text(json.dumps(files))
    source = subprocess.Popen(['docker', 'exec', '-i', 'sgo-app-1', 'node', '--input-type=module', '-e', node],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    snapshot = json.loads(source.stdout.readline())['snapshot']
    with (BACK / 'banco.dump').open('wb') as f:
        run(['docker', 'exec', 'sgo-db-1', 'pg_dump', '-U', 'sgo', '-d', 'sgo', '-Fc', '--snapshot=' + snapshot], stdout=f)
    tables = json.loads(source.stdout.readline())['tables']
    (BACK / 'tables-source.json').write_text(json.dumps(tables))
    source.stdin.write('done\n'); source.stdin.flush(); source.stdin.close()
    source.wait(timeout=30)
    assert source.returncode == 0
    run(['tar', '-czf', str(BACK / 'dados.tgz'), '-C', str(ROOT), 'dados'])
    # Detecta movimentação durante a cópia sem alterar ou pausar a produção.
    after = manifest(ROOT / 'dados', hashes=False)
    assert [{k: v for k, v in row.items() if k != 'sha256'} for row in files] == after, 'arquivos mudaram durante backup'
    restored = BACK / 'fs-restaurado'
    restored.mkdir(mode=0o700)
    run(['tar', '-xzf', str(BACK / 'dados.tgz'), '-C', str(restored)])
    restored_files = manifest(restored / 'dados')
    assert files == restored_files, 'restore FS divergiu em bytes, dono ou modo'
    run(['docker', 'run', '-d', '--name', NAME, '--network', 'none', '-e', 'POSTGRES_USER=sgo', '-e', 'POSTGRES_DB=sgo',
         '-e', 'POSTGRES_PASSWORD=qa-restore-sintetico-20261104', PG_IMAGE], capture_output=True)
    created = True
    for i in range(60):
        if subprocess.run(['docker', 'exec', NAME, 'pg_isready', '-U', 'sgo', '-d', 'sgo'], capture_output=True).returncode == 0: break
        time.sleep(1)
    else: raise RuntimeError('restore PG não ficou pronto')
    with (BACK / 'banco.dump').open('rb') as f:
        run(['docker', 'exec', '-i', NAME, 'pg_restore', '--exit-on-error', '-U', 'sgo', '-d', 'sgo'], stdin=f, capture_output=True)
    pg_restored = {}
    for name in tables:
        sql = "SET TIME ZONE 'UTC'; SELECT row_to_json(x) FROM (" + table_sql(name) + ') x;'
        out = subprocess.check_output(['docker', 'exec', NAME, 'psql', '-X', '-q', '-t', '-A', '-U', 'sgo', '-d', 'sgo', '-c', sql], text=True)
        pg_restored[name] = json.loads(out.strip())
    assert tables == pg_restored, 'restore PG divergiu do snapshot exportado'
    (BACK / 'tables-restored.json').write_text(json.dumps(pg_restored))
    current = {k: inspect(k) for k in before_running}
    assert all(current[k]['Image'] == x['image'] and current[k]['State']['Pid'] == x['pid'] and current[k]['State']['Running'] for k, x in before_running.items())
    proof.update(passed=True, snapshot=snapshot, tables=len(tables), filesystemEntries=len(files),
                 regularFiles=sum(x['kind'] == 'file' for x in files), dumpSha256=digest(BACK / 'banco.dump'),
                 filesArchiveSha256=digest(BACK / 'dados.tgz'), restoreContainer=NAME,
                 existingRunningContainersPreserved=len(before_running))
finally:
    if source and source.poll() is None:
        try: source.stdin.write('done\n'); source.stdin.flush(); source.wait(timeout=15)
        except Exception: source.terminate()
    if created: subprocess.run(['docker', 'stop', NAME], capture_output=True)
    (STAGE / 'backup-restore-result.json').write_text(json.dumps(proof, indent=2))
print(json.dumps(proof))
