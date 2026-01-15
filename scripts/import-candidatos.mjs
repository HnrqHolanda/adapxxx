import fs from "fs";
import admin from "firebase-admin";
import { parse } from "csv-parse/sync";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccount.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const csv = fs.readFileSync("./candidatos.csv", "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true });

const normalize = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
const toBool = (v) => String(v ?? "").trim().toLowerCase() !== "false";

const map = new Map(); // nomeLower -> doc
for (const r of rows) {
  const nome = normalize(r.Nome);
  if (!nome) continue;
  const tipo = normalize(r.Tipo || "cfg");
  const ativo = toBool(r.Ativo);

  const nomeLower = nome.toLowerCase();
  map.set(nomeLower, {
    Nome: nome,
    Tipo: tipo,
    Ativo: ativo,
    nomeLower,
    createdAt: Date.now(),
  });
}

const docs = Array.from(map.values());
console.log(`Vai inserir ${docs.length} candidatos...`);

let batch = db.batch();
let count = 0;

for (let i = 0; i < docs.length; i++) {
  const ref = db.collection("candidatos").doc();
  batch.set(ref, docs[i]);
  count++;

  if (count === 500) {
    await batch.commit();
    console.log(`✅ Commit 500 (até ${i + 1})`);
    batch = db.batch();
    count = 0;
  }
}

if (count > 0) {
  await batch.commit();
  console.log(`✅ Commit final ${count}`);
}

console.log("✅ Importação concluída!");
process.exit(0);
