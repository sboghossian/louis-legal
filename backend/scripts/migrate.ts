/**
 * Migration runner — `npm run migrate`.
 *
 * Reads every `*.sql` file under backend/migrations/ in alphabetical
 * order (date-stamped filenames give us natural ordering) and applies
 * the ones that haven't been recorded in the `_migrations` table.
 *
 * Connection:
 *   - SUPABASE_DB_URL  — full Postgres URL from Supabase Dashboard
 *                        → Settings → Database → Connection string.
 *                        Use the *direct* (port 5432) connection, not
 *                        the pooler, so transactions work.
 *   - Falls back to `PGHOST/PGUSER/...` if SUPABASE_DB_URL is unset.
 *
 * If the runner can't connect (no env var configured, host unreachable),
 * it prints the migration filenames and exits 1 so the operator knows
 * to paste them into Supabase's SQL editor manually.
 */

import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client, type ClientConfig } from "pg";

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

function listMigrations(): { id: string; path: string }[] {
    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    return files.map((f) => ({
        id: f.replace(/\.sql$/i, ""),
        path: join(MIGRATIONS_DIR, f),
    }));
}

function clientConfig(): ClientConfig | null {
    const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (url) {
        return {
            connectionString: url,
            ssl: { rejectUnauthorized: false },
        };
    }
    // Allow legacy PGHOST / etc.
    if (process.env.PGHOST && process.env.PGUSER) {
        return {
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE ?? "postgres",
            port: Number(process.env.PGPORT ?? 5432),
            ssl: { rejectUnauthorized: false },
        };
    }
    return null;
}

async function main(): Promise<void> {
    const migrations = listMigrations();
    if (migrations.length === 0) {
        console.log("No migrations found in backend/migrations/.");
        return;
    }

    const config = clientConfig();
    if (!config) {
        console.error(
            "[migrate] No database connection configured. Set SUPABASE_DB_URL in backend/.env",
        );
        console.error(
            "[migrate] Get it from Supabase Dashboard → Settings → Database → Connection string → Direct.",
        );
        console.error("[migrate] Migrations waiting to be applied:");
        for (const m of migrations) console.error(`  · ${m.id}`);
        console.error(
            "[migrate] Or paste each .sql file's contents into the Supabase SQL editor manually.",
        );
        process.exit(1);
    }

    const client = new Client(config);
    await client.connect();
    console.log("[migrate] Connected to Postgres.");

    // Bootstrap the ledger table so we can check what's applied.
    await client.query(`
        create table if not exists public._migrations (
          id text primary key,
          applied_at timestamptz not null default now()
        );
    `);

    const { rows: applied } = await client.query<{ id: string }>(
        "select id from public._migrations",
    );
    const appliedIds = new Set(applied.map((r) => r.id));

    let appliedCount = 0;
    for (const m of migrations) {
        if (appliedIds.has(m.id)) {
            console.log(`[migrate] ✓ ${m.id} (already applied)`);
            continue;
        }
        const sql = readFileSync(m.path, "utf-8");
        console.log(`[migrate] → Applying ${m.id} ...`);
        try {
            await client.query("BEGIN");
            await client.query(sql);
            // The migration files INSERT their own row into _migrations,
            // but we also do it here defensively in case a hand-written
            // file forgets — `on conflict do nothing` makes it safe.
            await client.query(
                "insert into public._migrations (id) values ($1) on conflict (id) do nothing",
                [m.id],
            );
            await client.query("COMMIT");
            console.log(`[migrate] ✓ ${m.id} applied`);
            appliedCount += 1;
        } catch (err) {
            await client.query("ROLLBACK");
            console.error(`[migrate] ✗ ${m.id} failed:`, err);
            await client.end();
            process.exit(1);
        }
    }

    await client.end();
    console.log(
        `[migrate] Done. ${appliedCount} migration(s) applied${appliedCount === 0 ? " (DB already up to date)" : ""}.`,
    );
}

main().catch((err) => {
    console.error("[migrate] Unexpected error:", err);
    process.exit(1);
});
