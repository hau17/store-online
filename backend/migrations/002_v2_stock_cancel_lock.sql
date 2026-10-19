-- Migration v1 -> v2 (spec-bookstore-project.md mục 4).
-- Chạy bằng: npm run migrate:v2 (script tự bỏ qua các bước đã áp dụng), hoặc chạy tay từng câu dưới đây.

ALTER TABLE users
    ADD COLUMN locked_reason VARCHAR(255) NULL AFTER is_active,
    ADD COLUMN locked_at DATETIME NULL AFTER locked_reason;

ALTER TABLE payments
    MODIFY status ENUM('pending','success','failed','cancelled') NOT NULL DEFAULT 'pending';

ALTER TABLE order_status_history
    MODIFY changed_by ENUM('system','admin','customer') NOT NULL DEFAULT 'system';

-- Phải không còn dòng nào âm kho thì mới thêm được CHECK:
-- SELECT id, title, stock_quantity FROM books WHERE stock_quantity < 0;
ALTER TABLE books
    ADD CONSTRAINT chk_books_stock_non_negative CHECK (stock_quantity >= 0);
