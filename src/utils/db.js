const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')

const dbPath = path.join(__dirname, '../../dev.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

const initTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      avatar TEXT,
      phone TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctorProfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      categoryId INTEGER NOT NULL,
      realName TEXT NOT NULL,
      title TEXT NOT NULL,
      hospital TEXT NOT NULL,
      expertise TEXT NOT NULL,
      description TEXT,
      certificate TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      price REAL DEFAULT 0,
      consultationCount INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      doctorId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDING',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      completedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (doctorId) REFERENCES doctorProfiles(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultationId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (consultationId) REFERENCES consultations(id),
      FOREIGN KEY (senderId) REFERENCES users(id)
    );
  `)

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count
  if (categoryCount === 0) {
    const categories = [
      { name: '内科', description: '内科常见病诊治', icon: 'internal', sortOrder: 1 },
      { name: '外科', description: '外科疾病诊疗', icon: 'surgical', sortOrder: 2 },
      { name: '儿科', description: '儿童健康咨询', icon: 'pediatrics', sortOrder: 3 },
      { name: '妇科', description: '妇科健康咨询', icon: 'gynecology', sortOrder: 4 },
      { name: '皮肤科', description: '皮肤疾病诊疗', icon: 'dermatology', sortOrder: 5 },
      { name: '中医科', description: '中医调理咨询', icon: 'chinese', sortOrder: 6 }
    ]
    
    const insertCategory = db.prepare('INSERT INTO categories (name, description, icon, sortOrder) VALUES (?, ?, ?, ?)')
    categories.forEach(cat => {
      insertCategory.run(cat.name, cat.description, cat.icon, cat.sortOrder)
    })
    console.log('默认分类已创建')
  }

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('ADMIN').count
  if (adminCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)')
      .run('admin', 'admin@example.com', hashedPassword, 'ADMIN')
    console.log('默认管理员已创建: admin@example.com / admin123')
  }

  const testDoctorCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('doctor@example.com').count
  if (testDoctorCount === 0) {
    const hashedPassword = bcrypt.hashSync('doctor123', 10)
    const result = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)')
      .run('testdoctor', 'doctor@example.com', hashedPassword, 'DOCTOR')
    const userId = result.lastInsertRowid
    db.prepare(`
      INSERT INTO doctorProfiles (userId, categoryId, realName, title, hospital, expertise, certificate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED')
    `).run(userId, 1, '李医生', '副主任医师', '北京第一医院', '高血压、冠心病诊治', '/uploads/test_certificate.pdf')
    console.log('测试医生已创建: doctor@example.com / doctor123')
  }

  const testUserCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('user@example.com').count
  if (testUserCount === 0) {
    const hashedPassword = bcrypt.hashSync('user123', 10)
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)')
      .run('testuser', 'user@example.com', hashedPassword, 'USER')
    console.log('测试用户已创建: user@example.com / user123')
  }
}

initTables()

const run = (sql, params = []) => {
  const stmt = db.prepare(sql)
  return stmt.run(...params)
}

const get = (sql, params = []) => {
  const stmt = db.prepare(sql)
  return stmt.get(...params)
}

const all = (sql, params = []) => {
  const stmt = db.prepare(sql)
  return stmt.all(...params)
}

module.exports = { db, run, get, all }
