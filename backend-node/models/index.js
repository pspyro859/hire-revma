// MySQL helper module - replaces Mongoose models
const { getPool } = require('../config/database');

// ─── JSON helpers ─────────────────────────────────────────────────────────────
const parseJSON = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
};

const toJSON = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
};

// ─── User helpers ─────────────────────────────────────────────────────────────
const User = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM users WHERE ${keys}`, vals);
    return rows[0] ? formatUser(rows[0]) : null;
  },
  async find(where = {}) {
    if (Object.keys(where).length === 0) {
      const [rows] = await getPool().query('SELECT * FROM users ORDER BY created_at DESC');
      return rows.map(formatUser);
    }
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM users WHERE ${keys} ORDER BY created_at DESC`, vals);
    return rows.map(formatUser);
  },
  async create(data) {
    await getPool().query('INSERT INTO users SET ?', [data]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE users SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async countDocuments(where = {}) {
    if (Object.keys(where).length === 0) {
      const [rows] = await getPool().query('SELECT COUNT(*) as count FROM users');
      return rows[0].count;
    }
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT COUNT(*) as count FROM users WHERE ${keys}`, vals);
    return rows[0].count;
  }
};

function formatUser(row) {
  return row;
}

// ─── Machine helpers ──────────────────────────────────────────────────────────
const Machine = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM machines WHERE ${keys}`, vals);
    return rows[0] ? formatMachine(rows[0]) : null;
  },
  async find(where = {}) {
    if (Object.keys(where).length === 0) {
      const [rows] = await getPool().query('SELECT * FROM machines ORDER BY name');
      return rows.map(formatMachine);
    }
    const conditions = [];
    const vals = [];
    for (const [k, v] of Object.entries(where)) {
      conditions.push(`\`${k}\` = ?`);
      vals.push(v);
    }
    const [rows] = await getPool().query(`SELECT * FROM machines WHERE ${conditions.join(' AND ')} ORDER BY name`, vals);
    return rows.map(formatMachine);
  },
  async create(data) {
    const row = { ...data, specifications: toJSON(data.specifications) };
    await getPool().query('INSERT INTO machines SET ?', [row]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    if (updateData.specifications !== undefined) {
      updateData.specifications = toJSON(updateData.specifications);
    }
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE machines SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async deleteMany(where = {}) {
    if (Object.keys(where).length === 0) {
      await getPool().query('DELETE FROM machines');
    } else {
      const [keys, vals] = buildWhere(where);
      await getPool().query(`DELETE FROM machines WHERE ${keys}`, vals);
    }
  },
  async insertMany(docs) {
    for (const doc of docs) {
      const row = { ...doc, specifications: toJSON(doc.specifications) };
      await getPool().query('INSERT INTO machines SET ?', [row]);
    }
  },
  async countDocuments(where = {}) {
    if (Object.keys(where).length === 0) {
      const [rows] = await getPool().query('SELECT COUNT(*) as count FROM machines');
      return rows[0].count;
    }
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT COUNT(*) as count FROM machines WHERE ${keys}`, vals);
    return rows[0].count;
  }
};

function formatMachine(row) {
  return { ...row, specifications: parseJSON(row.specifications) };
}

// ─── Agreement helpers ────────────────────────────────────────────────────────
const Agreement = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM agreements WHERE ${keys}`, vals);
    return rows[0] ? formatAgreement(rows[0]) : null;
  },
  async find(where = {}, opts = {}) {
    let sql = 'SELECT * FROM agreements';
    const vals = [];
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([k, v]) => { vals.push(v); return `\`${k}\` = ?`; });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await getPool().query(sql, vals);
    return rows.map(formatAgreement);
  },
  async create(data) {
    const row = {
      ...data,
      checklist: toJSON(data.checklist),
      photos: toJSON(data.photos)
    };
    await getPool().query('INSERT INTO agreements SET ?', [row]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    if (updateData.checklist !== undefined) updateData.checklist = toJSON(updateData.checklist);
    if (updateData.photos !== undefined) updateData.photos = toJSON(updateData.photos);
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE agreements SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async deleteMany(where = {}) {
    if (Object.keys(where).length === 0) {
      await getPool().query('DELETE FROM agreements');
    } else {
      const [keys, vals] = buildWhere(where);
      await getPool().query(`DELETE FROM agreements WHERE ${keys}`, vals);
    }
  }
};

function formatAgreement(row) {
  return {
    ...row,
    checklist: parseJSON(row.checklist) || [],
    photos: parseJSON(row.photos) || []
  };
}

// ─── Inquiry helpers ──────────────────────────────────────────────────────────
const Inquiry = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM inquiries WHERE ${keys}`, vals);
    return rows[0] ? formatInquiry(rows[0]) : null;
  },
  async find(where = {}) {
    let sql = 'SELECT * FROM inquiries';
    const vals = [];
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([k, v]) => { vals.push(v); return `\`${k}\` = ?`; });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await getPool().query(sql, vals);
    return rows.map(formatInquiry);
  },
  async create(data) {
    const row = { ...data, equipment: toJSON(data.equipment) };
    await getPool().query('INSERT INTO inquiries SET ?', [row]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    if (updateData.equipment !== undefined) updateData.equipment = toJSON(updateData.equipment);
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE inquiries SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async deleteMany(where = {}) {
    if (Object.keys(where).length === 0) {
      await getPool().query('DELETE FROM inquiries');
    } else {
      const [keys, vals] = buildWhere(where);
      await getPool().query(`DELETE FROM inquiries WHERE ${keys}`, vals);
    }
  },
  async countDocuments(where = {}) {
    if (Object.keys(where).length === 0) {
      const [rows] = await getPool().query('SELECT COUNT(*) as count FROM inquiries');
      return rows[0].count;
    }
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT COUNT(*) as count FROM inquiries WHERE ${keys}`, vals);
    return rows[0].count;
  }
};

function formatInquiry(row) {
  return { ...row, equipment: parseJSON(row.equipment) || [] };
}

// ─── Quote helpers ────────────────────────────────────────────────────────────
const Quote = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM quotes WHERE ${keys}`, vals);
    return rows[0] ? formatQuote(rows[0]) : null;
  },
  async find(where = {}) {
    let sql = 'SELECT * FROM quotes';
    const vals = [];
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([k, v]) => { vals.push(v); return `\`${k}\` = ?`; });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await getPool().query(sql, vals);
    return rows.map(formatQuote);
  },
  async create(data) {
    const row = {
      ...data,
      line_items: toJSON(data.line_items),
      id_documents: toJSON(data.id_documents)
    };
    await getPool().query('INSERT INTO quotes SET ?', [row]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    if (updateData.line_items !== undefined) updateData.line_items = toJSON(updateData.line_items);
    if (updateData.id_documents !== undefined) updateData.id_documents = toJSON(updateData.id_documents);
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE quotes SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async deleteMany(where = {}) {
    if (Object.keys(where).length === 0) {
      await getPool().query('DELETE FROM quotes');
    } else {
      const [keys, vals] = buildWhere(where);
      await getPool().query(`DELETE FROM quotes WHERE ${keys}`, vals);
    }
  }
};

function formatQuote(row) {
  return {
    ...row,
    line_items: parseJSON(row.line_items) || [],
    id_documents: parseJSON(row.id_documents) || []
  };
}

// ─── Terms helpers ────────────────────────────────────────────────────────────
const Terms = {
  async findOne(where) {
    const [keys, vals] = buildWhere(where);
    const [rows] = await getPool().query(`SELECT * FROM terms WHERE ${keys}`, vals);
    return rows[0] || null;
  },
  async find(where = {}) {
    let sql = 'SELECT * FROM terms';
    const vals = [];
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([k, v]) => { vals.push(v); return `\`${k}\` = ?`; });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY display_order ASC';
    const [rows] = await getPool().query(sql, vals);
    return rows;
  },
  async create(data) {
    await getPool().query('INSERT INTO terms SET ?', [data]);
    return this.findOne({ id: data.id });
  },
  async updateOne(where, update) {
    const updateData = update.$set || update;
    const [wKeys, wVals] = buildWhere(where);
    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const setVals = Object.values(updateData);
    const [result] = await getPool().query(
      `UPDATE terms SET ${setClauses} WHERE ${wKeys}`,
      [...setVals, ...wVals]
    );
    return { matchedCount: result.affectedRows };
  },
  async deleteOne(where) {
    const [keys, vals] = buildWhere(where);
    const [result] = await getPool().query(`DELETE FROM terms WHERE ${keys}`, vals);
    return { deletedCount: result.affectedRows };
  },
  async deleteMany(where = {}) {
    if (Object.keys(where).length === 0) {
      await getPool().query('DELETE FROM terms');
    } else {
      const [keys, vals] = buildWhere(where);
      await getPool().query(`DELETE FROM terms WHERE ${keys}`, vals);
    }
  },
  async insertMany(docs) {
    for (const doc of docs) {
      await getPool().query('INSERT INTO terms SET ?', [doc]);
    }
  }
};

// ─── Utility: build WHERE clause ─────────────────────────────────────────────
function buildWhere(where) {
  const keys = Object.entries(where).map(([k]) => `\`${k}\` = ?`).join(' AND ');
  const vals = Object.values(where);
  return [keys, vals];
}

module.exports = {
  User,
  Machine,
  Agreement,
  Inquiry,
  Quote,
  Terms,
  parseJSON,
  toJSON
};
