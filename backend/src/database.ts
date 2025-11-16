// autor: Cadu Spadari
// Importa módulos necessários do Node.js
import path from 'node:path';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';

// Define o caminho da pasta do banco de dados
const dbDir = path.join(process.cwd(), 'db');

// Cria a pasta do banco de dados se ela não existir
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Define o caminho completo do arquivo do banco de dados
const dbPath = path.join(dbDir, 'database.sqlite');

// Cria uma conexão com o banco de dados SQLite
const db = new sqlite3.Database(dbPath);

// Inicializa o banco de dados criando todas as tabelas necessárias
db.serialize(() => {
  // Cria a tabela de usuários (professores/docentes)
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT,
      senha TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria a tabela de instituições
  db.run(`
    CREATE TABLE IF NOT EXISTS instituicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria a tabela de cursos
  db.run(`
    CREATE TABLE IF NOT EXISTS cursos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      instituicao_id INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE CASCADE,
      UNIQUE(nome, instituicao_id)
    )
  `);

  // Cria a tabela de disciplinas
  db.run(`
    CREATE TABLE IF NOT EXISTS disciplinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria a tabela de turmas
  db.run(`
    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      curso_id INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
      UNIQUE(nome, curso_id)
    )
  `);

  // Cria a tabela de relacionamento entre turmas e disciplinas (muitos para muitos)
  db.run(`
    CREATE TABLE IF NOT EXISTS turma_disciplinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL,
      disciplina_id INTEGER NOT NULL,
      FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
      FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
      UNIQUE(turma_id, disciplina_id)
    )
  `);

  // Cria a tabela de alunos
  db.run(`
    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identificador TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria a tabela de relacionamento entre turmas e alunos (muitos para muitos)
  db.run(`
    CREATE TABLE IF NOT EXISTS turma_alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL,
      aluno_id INTEGER NOT NULL,
      FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
      UNIQUE(turma_id, aluno_id)
    )
  `);

  // Cria a tabela de tokens de recuperação de senha
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens_recuperacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expira_em DATETIME NOT NULL,
      usado INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);
});

// Exporta a conexão do banco de dados para ser usada em outros arquivos
export default db;

