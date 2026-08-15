// Các hàm gọi API /api/stock-imports. Toàn bộ route yêu cầu admin. Không có update/delete —
// phiếu nhập không cho sửa/xóa (xem ghi chú trong stockImport.routes.js phía backend).
import api from './api';

export default {
  // params: { supplier_id, from_date, to_date, page, limit }
  getStockImports(params) {
    return api.get('/stock-imports', { params });
  },
  getStockImportById(id) {
    return api.get(`/stock-imports/${id}`);
  },
  createStockImport(data) {
    return api.post('/stock-imports', data);
  },
};
