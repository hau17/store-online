const { success } = require('../utils/response');

function placeholder(label) {
  return (req, res) => {
    success(res, { message: `${label} - chưa triển khai (not implemented)` });
  };
}

module.exports = {
  getCart: placeholder('GET /api/cart'),
  addItem: placeholder('POST /api/cart'),
  updateItem: placeholder('PUT /api/cart/:bookId'),
  removeItem: placeholder('DELETE /api/cart/:bookId'),
  clearCart: placeholder('DELETE /api/cart'),
};
