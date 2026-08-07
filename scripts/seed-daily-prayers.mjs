// Bulk-carga oraciones diarias a Turso desde un .docx con el mismo formato
// que usa el equipo editorial (estilos de párrafo: CCDay, CCDate, CCPrayer, CCPsalm).
//
// Uso:
//   node scripts/seed-daily-prayers.mjs --file public/para-iniciar-el-dia.docx --table daily
//   node scripts/seed-daily-prayers.mjs --file public/para-terminar-el-dia.docx --table closing
//   node scripts/seed-daily-prayers.mjs ... --dry-run     (solo muestra qué insertaría)
//   node scripts/seed-daily-prayers.mjs ... --overwrite   (actualiza si la fecha ya existe)

import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

config();

const args = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1];
}
const has = (name) => args.includes(`--${name}`);

const filePath = flag("file", "public/para-iniciar-el-dia.docx");
const tableName = flag("table", "daily"); // "daily" | "closing"
const dryRun = has("dry-run");
const overwrite = has("overwrite");

const dailyPrayers = sqliteTable("daily_prayers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  quote: text("quote"),
  source: text("source"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

const closingPrayers = sqliteTable("closing_prayers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  quote: text("quote"),
  source: text("source"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

const table = tableName === "closing" ? closingPrayers : dailyPrayers;

function toSlug(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

const MONTHS = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

function parseSpanishDate(text) {
  // "30 de noviembre de 2025"
  const match = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i.exec(text);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function unescapeXml(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractDocumentXml(docxPath) {
  return execFileSync("unzip", ["-p", docxPath, "word/document.xml"], {
    maxBuffer: 1024 * 1024 * 50,
  }).toString("utf-8");
}

function paragraphTextWithBreaks(paragraphXml) {
  // Word agrega atributos (w:rsidRPr, etc.) a algunos <w:r> pero no a todos, así que el tag
  // de apertura no puede darse por literal "<w:r>": hay que aceptar "<w:r ...>" también.
  const runs = [...paragraphXml.matchAll(/<w:r(?:\s[^>]*)?>(.*?)<\/w:r>/gs)].map((m) => m[1]);
  const parts = [];
  for (const run of runs) {
    const t = /<w:t[^>]*>(.*?)<\/w:t>/s.exec(run);
    if (!t) continue;
    parts.push((run.includes("<w:br") ? "\n" : "") + unescapeXml(t[1]));
  }
  return parts.join("");
}

// El 4º párrafo de cada bloque trae dos runs separados por <w:br/>:
// "Inspirado en el Salmo X, Y" (source) y la cita entre comillas (quote).
// Si no hay <w:br/>, todo cae en source.
function parsePsalmParagraph(text) {
  const breakIndex = text.indexOf("\n");
  if (breakIndex === -1) {
    return { source: text.trim() || null, quote: null };
  }
  return {
    source: text.slice(0, breakIndex).trim() || null,
    quote: text.slice(breakIndex + 1).trim() || null,
  };
}

function splitAfterDash(text) {
  // "Día 01 — Título" -> "Título" ; "Domingo 30 ... — Subtítulo" -> "Subtítulo"
  const idx = text.indexOf("—");
  return idx === -1 ? text.trim() : text.slice(idx + 1).trim();
}

// Los .docx que nos pasan no siempre usan estilos de párrafo con nombre (CCDay, CCPrayer, ...);
// a veces todo el texto viene sin w:pStyle. Tampoco podemos agrupar por posición fija de 4, porque
// algunos documentos intercalan encabezados de mes o notas de cierre entre las entradas. En vez de
// eso, recorremos los párrafos no vacíos con una máquina de estados: cualquier párrafo que no
// encaje en la secuencia día → fecha → oración → salmo se ignora (encabezados, cierres, etc.).
function parseEntries(xml) {
  const paragraphs = [...xml.matchAll(/<w:p[ >].*?<\/w:p>/gs)].map((m) => m[0]);
  const texts = paragraphs.map((p) => paragraphTextWithBreaks(p)).filter((t) => t.trim() !== "");

  const entries = [];
  let state = "day";
  let day, dateRaw, prayer;

  for (const text of texts) {
    if (state === "day") {
      if (/^Día\s*\d+/i.test(text)) {
        day = text;
        state = "date";
      }
      // cualquier otro párrafo (encabezado de mes, cierre, etc.) se ignora en este estado
    } else if (state === "date") {
      dateRaw = text;
      state = "prayer";
    } else if (state === "prayer") {
      prayer = text;
      state = "psalm";
    } else if (state === "psalm") {
      const iso = parseSpanishDate(dateRaw);
      if (!iso) {
        throw new Error(`Entrada "${day}": no pude leer la fecha en "${dateRaw}"`);
      }
      const { source, quote } = parsePsalmParagraph(text);
      entries.push({
        date: iso,
        slug: toSlug(iso),
        title: splitAfterDash(day),
        subtitle: splitAfterDash(dateRaw) || null,
        description: prayer.trim(),
        quote,
        source,
      });
      state = "day";
    }
  }

  if (state !== "day") {
    throw new Error(`El documento terminó a mitad de una entrada (último día leído: "${day}").`);
  }

  return entries;
}

async function main() {
  console.log(`Leyendo ${filePath} ...`);
  const xml = extractDocumentXml(filePath);
  const records = parseEntries(xml);
  console.log(`Se encontraron ${records.length} oraciones.`);

  const dateCounts = new Map();
  for (const r of records) dateCounts.set(r.date, (dateCounts.get(r.date) ?? 0) + 1);
  const duplicates = [...dateCounts.entries()].filter(([, n]) => n > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `El documento tiene fechas repetidas, revisa el .docx: ${duplicates.map(([d, n]) => `${d} (x${n})`).join(", ")}`,
    );
  }

  if (dryRun) {
    console.log(JSON.stringify(records.slice(0, 3), null, 2));
    console.log(`(dry-run) No se escribió nada en la base de datos.`);
    return;
  }

  const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;
  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    throw new Error("Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el entorno (.env).");
  }

  const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
  const db = drizzle(client);

  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const query = overwrite
      ? db
          .insert(table)
          .values(record)
          .onConflictDoUpdate({
            target: table.date,
            set: {
              slug: record.slug,
              title: record.title,
              subtitle: record.subtitle,
              description: record.description,
              quote: record.quote,
              source: record.source,
            },
          })
      : db.insert(table).values(record).onConflictDoNothing({ target: table.date });

    const result = await query;
    if (result.rowsAffected > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Listo. Insertadas/actualizadas: ${inserted}. Omitidas (ya existían): ${skipped}.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
