import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';

const router = Router();

// garante a pasta do DB
const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// cria tabela se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      telefone TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// POST /api/cadastros
router.post('/', (req: Request, res: Response) => {
  const { nome, email, telefone } = req.body ?? {};
  if (!nome || !email) {
    return res.status(400).json({ error: 'nome e email são obrigatórios' });
  }

  const sql = 'INSERT INTO usuarios (nome, email, telefone) VALUES (?, ?, ?)';
  db.run(sql, [nome, email, telefone ?? null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ id: this.lastID, nome, email, telefone: telefone ?? null });
  });
});

// GET /api/cadastros
router.get('/', (_req: Request, res: Response) => {
  db.all('SELECT * FROM usuarios ORDER BY criado_em DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

export default router;
