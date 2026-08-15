const { success } = require('../utils/response');

function placeholder(label) {
  return (req, res) => {
    success(res, { message: `${label} - chưa triển khai (not implemented)` });
  };
}

module.exports = {
  sepayWebhook: placeholder('POST /api/webhook/sepay'),
};
