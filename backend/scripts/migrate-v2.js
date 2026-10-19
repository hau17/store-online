// Áp dụng migration v2 lên database đang cấu hình trong .env. Chạy lại nhiều lần vẫn an toàn:
// bước nào đã áp dụng (cột/constraint đã có, ENUM đã đủ giá trị) thì bỏ qua.
const pool = require('../src/config/db');
const env = require('../src/config/env');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [env.DB_NAME, table, column]
  );
  return rows.length > 0;
}

async function columnType(table, column) {
  const [rows] = await pool.query(
    'SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [env.DB_NAME, table, column]
  );
  return rows[0]?.type || '';
}

async function constraintExists(table, name) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
    [env.DB_NAME, table, name]
  );
  return rows.length > 0;
}

async function step(label, shouldRun, sql) {
  if (!(await shouldRun())) {
    console.log(`- ${label}: đã có, bỏ qua`);
    return;
  }
  await pool.query(sql);
  console.log(`+ ${label}: OK`);
}

async function main() {
  await step(
    'users.locked_reason, users.locked_at',
    async () => !(await columnExists('users', 'locked_reason')),
    `ALTER TABLE users
       ADD COLUMN locked_reason VARCHAR(255) NULL AFTER is_active,
       ADD COLUMN locked_at DATETIME NULL AFTER locked_reason`
  );

  await step(
    "payments.status thêm 'cancelled'",
    async () => !(await columnType('payments', 'status')).includes("'cancelled'"),
    `ALTER TABLE payments
       MODIFY status ENUM('pending','success','failed','cancelled') NOT NULL DEFAULT 'pending'`
  );

  await step(
    "order_status_history.changed_by thêm 'customer'",
    async () => !(await columnType('order_status_history', 'changed_by')).includes("'customer'"),
    `ALTER TABLE order_status_history
       MODIFY changed_by ENUM('system','admin','customer') NOT NULL DEFAULT 'system'`
  );

  const [negativeRows] = await pool.query('SELECT id, title, stock_quantity FROM books WHERE stock_quantity < 0');
  if (negativeRows.length > 0) {
    console.warn('! Bỏ qua CHECK stock_quantity >= 0 vì còn sách âm kho, cần sửa tay trước:', negativeRows);
  } else {
    await step(
      'CHECK books.stock_quantity >= 0',
      async () => !(await constraintExists('books', 'chk_books_stock_non_negative')),
      'ALTER TABLE books ADD CONSTRAINT chk_books_stock_non_negative CHECK (stock_quantity >= 0)'
    );
  }
}

main()
  .then(() => console.log('Migration v2 hoàn tất'))
  .catch((err) => {
    console.error('Migration v2 thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
