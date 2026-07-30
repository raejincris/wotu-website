-- Log truy vấn tìm kiếm. 1 dòng = 1 lần tìm "đã settle" hoặc Enter.
-- Chỉ q (từ khoá) + n (số kết quả) + ts (epoch ms). KHÔNG PII/IP/cookie.
CREATE TABLE IF NOT EXISTS searches (
  q  TEXT    NOT NULL,
  n  INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_searches_ts ON searches(ts);
CREATE INDEX IF NOT EXISTS idx_searches_q  ON searches(q);
