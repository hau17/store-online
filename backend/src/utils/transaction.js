const pool = require('../config/db');

// Chạy work(conn) trong 1 transaction: commit nếu work chạy xong, rollback nếu work ném lỗi.
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Mã đơn/phiếu nhập sinh bằng COUNT(*) + 1 nên 2 request đồng thời có thể ra cùng 1 mã, request
// sau bị UNIQUE chặn (ER_DUP_ENTRY). Chạy lại toàn bộ work (đã rollback sạch) tối đa `attempts` lần.
async function retryOnDuplicateCode(work, { uniqueKey, errorCode, message, attempts = 3 }) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      const isCodeConflict = err.code === 'ER_DUP_ENTRY' && String(err.sqlMessage || err.message).includes(uniqueKey);
      if (!isCodeConflict) throw err;
      if (attempt >= attempts) {
        const conflictErr = new Error(message);
        conflictErr.statusCode = 409;
        conflictErr.errorCode = errorCode;
        throw conflictErr;
      }
    }
  }
}

module.exports = { withTransaction, retryOnDuplicateCode };
