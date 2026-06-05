import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

// 순서 중요: 긴 패턴 먼저
const REPLACEMENTS = [
  ['클린 파트너', '클린파트너'],
  ['청소 파트너', '클린파트너'],   // 최근 추가분
  ['공간 운영자', '공간파트너'],
  ['공간 파트너', '공간파트너'],   // 최근 추가분 + 기존
  ['작업자', '클린파트너'],
  ['워커', '클린파트너'],
  ['호스트', '공간파트너'],
  ['운영자', '공간파트너'],
]

const roots = ['app', 'components']
const exts = ['.tsx', '.ts']
const base = process.cwd()

function walk(dir) {
  const out = []
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (exts.some(e => p.endsWith(e))) out.push(p)
  }
  return out
}

let totalFiles = 0, totalReps = 0
for (const root of roots) {
  const dir = join(base, root)
  for (const file of walk(dir)) {
    let content = readFileSync(file, 'utf8')
    let orig = content
    let fileReps = 0
    for (const [from, to] of REPLACEMENTS) {
      const count = (content.match(new RegExp(from, 'g')) || []).length
      if (count > 0) { content = content.split(from).join(to); fileReps += count }
    }
    if (content !== orig) {
      writeFileSync(file, content, 'utf8')
      totalFiles++; totalReps += fileReps
      console.log(`  ${file.replace(base, '')}: ${fileReps}건`)
    }
  }
}
console.log(`\n총 ${totalFiles}개 파일, ${totalReps}건 치환`)
