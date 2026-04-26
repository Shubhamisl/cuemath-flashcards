import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase', 'migrations')
const TABLE_EXEMPTIONS = new Set<string>()

function readMigrationFiles(): Array<{ name: string; sql: string }> {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
    }))
}

export function listPublicTablesFromMigrations(): string[] {
  const tables = new Set<string>()

  for (const { sql } of readMigrationFiles()) {
    for (const match of sql.matchAll(/create table public\.([a-z_][a-z0-9_]*)/gi)) {
      tables.add(match[1])
    }
  }

  return [...tables].sort()
}

export function findRlsCoverageGaps(): string[] {
  const migrations = readMigrationFiles()
  const allSql = migrations.map((file) => file.sql).join('\n')

  return listPublicTablesFromMigrations().filter((table) => {
    if (TABLE_EXEMPTIONS.has(table)) return false

    const hasRlsEnable = new RegExp(
      `alter table public\\.${table}\\s+enable row level security;`,
      'i',
    ).test(allSql)
    const hasPolicy = new RegExp(`create policy [\\s\\S]*? on public\\.${table}\\b`, 'i').test(allSql)

    return !hasRlsEnable || !hasPolicy
  })
}
