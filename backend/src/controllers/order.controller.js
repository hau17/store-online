const { success } = require('../utils/response');

function placeholder(label) {
  return (req, res) => {
    success(res, { message: `${label} - chưa triển khai (not implemented)` });
  };
}

module.exports = {
  create: placeholder('POST /api/orders'),
  getAll: placeholder('GET /api/orders'),
  getById: placeholder('GET /api/orders/:id'),
  getStatus: placeholder('GET /api/orders/:id/status'),
  updateStatus: placeholder('PUT /api/orders/:id/status'),
  cancel: placeholder('DELETE /api/orders/:id'),
};
