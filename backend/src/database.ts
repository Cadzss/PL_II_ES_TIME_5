// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Inicialização do BD
import path from 'node:path';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';

const dbDir = path.join(process.cwd(), 'db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`);

  // Tabela USUARIO
  db.run(`
    CREATE TABLE IF NOT EXISTS USUARIO (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_usuario VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      telefone VARCHAR(50),
      senha VARCHAR(255) NOT NULL
    )
  `);

  // Tabela INSTITUICAO
  db.run(`
    CREATE TABLE IF NOT EXISTS INSTITUICAO (
      id_instituicao INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_instituicao VARCHAR(255) NOT NULL,
      fk_usuario_id_usuario INTEGER NOT NULL,
      FOREIGN KEY (fk_usuario_id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
    )
  `);

  // Tabela CURSO
  db.run(`
    CREATE TABLE IF NOT EXISTS CURSO (
      id_curso INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_curso VARCHAR(255) NOT NULL,
      fk_instituicao_id_instituicao INTEGER NOT NULL,
      FOREIGN KEY (fk_instituicao_id_instituicao) REFERENCES INSTITUICAO(id_instituicao) ON DELETE RESTRICT
    )
  `);

  // Tabela DISCIPLINA
  db.run(`
    CREATE TABLE IF NOT EXISTS DISCIPLINA (
      id_disciplina INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_disciplina VARCHAR(255) NOT NULL,
      sigla VARCHAR(50),
      codigo VARCHAR(50),
      periodo VARCHAR(50),
      formula_calculo TEXT,
      fk_curso_id_curso INTEGER NOT NULL,
      FOREIGN KEY (fk_curso_id_curso) REFERENCES CURSO(id_curso) ON DELETE RESTRICT
    )
  `);

  // Tabela TURMA
  db.run(`
    CREATE TABLE IF NOT EXISTS TURMA (
      id_turma INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_turma VARCHAR(255) NOT NULL,
      fk_disciplina_id_disciplina INTEGER NOT NULL,
      fk_curso_id_curso INTEGER NOT NULL,
      FOREIGN KEY (fk_disciplina_id_disciplina) REFERENCES DISCIPLINA(id_disciplina) ON DELETE RESTRICT
      FOREIGN KEY (fk_curso_id_curso) REFERENCES CURSO(id_curso) ON DELETE RESTRICT
    )
  `);

  // Tabela ALUNO
  db.run(`
    CREATE TABLE IF NOT EXISTS ALUNO (
      id_aluno INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_completo VARCHAR(255) NOT NULL,
      matricula VARCHAR(255) NOT NULL
    )
  `);

  // Tabela COMPONENTE_NOTA
  db.run(`
    CREATE TABLE IF NOT EXISTS COMPONENTE_NOTA (
      id_componente INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_componente VARCHAR(255) NOT NULL,
      sigla VARCHAR(50),
      descricao TEXT,
      fk_disciplina_id_disciplina INTEGER NOT NULL,
      FOREIGN KEY (fk_disciplina_id_disciplina) REFERENCES DISCIPLINA(id_disciplina) ON DELETE RESTRICT
    )
  `);

  // Tabela REGISTRO_NOTA
  db.run(`
    CREATE TABLE IF NOT EXISTS REGISTRO_NOTA (
      valor_nota DECIMAL(4,2),
      fk_componente_nota_id_componente INTEGER,
      fk_aluno_id_aluno INTEGER,
      fk_turma_id_turma INTEGER,
      PRIMARY KEY (fk_componente_nota_id_componente, fk_aluno_id_aluno),
      FOREIGN KEY (fk_componente_nota_id_componente) REFERENCES COMPONENTE_NOTA(id_componente),
      FOREIGN KEY (fk_aluno_id_aluno) REFERENCES ALUNO(id_aluno),
      FOREIGN KEY (fk_turma_id_turma) REFERENCES TURMA(id_turma)
    )
  `);

  // Tabela AUDITORIA_NOTA
  db.run(`
    CREATE TABLE IF NOT EXISTS AUDITORIA_NOTA (
      valor_antigo DECIMAL(4,2),
      valor_novo DECIMAL(4,2),
      data_hora DATETIME,
      mensagem TEXT,
      id_log INTEGER PRIMARY KEY AUTOINCREMENT
    )
  `);

  // Tabela MATRICULA_TURMA
  db.run(`
    CREATE TABLE IF NOT EXISTS MATRICULA_TURMA (
      valor_final_calculado DECIMAL(4,2),
      valor_ajustado DECIMAL(4,2),
      opcao_ajustada BOOLEAN,
      fk_turma_id_turma INTEGER,
      fk_aluno_id_aluno INTEGER,
      PRIMARY KEY (fk_turma_id_turma, fk_aluno_id_aluno),
      FOREIGN KEY (fk_turma_id_turma) REFERENCES TURMA(id_turma),
      FOREIGN KEY (fk_aluno_id_aluno) REFERENCES ALUNO(id_aluno)
    )
  `);

  // Tabela tokens_recuperacao
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens_recuperacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expira_em DATETIME NOT NULL,
      usado INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
    )
  `);
});

export default db;