const cartItemModel = require('../models/cartItem.model');
const { success, error } = require('../utils/response');

function calcTotalAmount(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
}

function validateQuantity(quantity) {
  const q = Number(quantity);
  return Number.isInteger(q) && q > 0;
}

// GET /api/cart
async function getCart(req, res, next) {
  try {
    const items = await cartItemModel.findByUserId(req.user.id);
    return success(res, {
      message: 'Lấy giỏ hàng thành công',
      data: { items, total_amount: calcTotalAmount(items) },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/cart — { book_id, quantity }
async function addToCart(req, res, next) {
  try {
    const { book_id, quantity } = req.body;
    if (!book_id || !validateQuantity(quantity)) {
      return error(res, {
        message: 'book_id và quantity (số nguyên > 0) là bắt buộc',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    await cartItemModel.upsert(req.user.id, book_id, Number(quantity));
    const items = await cartItemModel.findByUserId(req.user.id);
    return success(res, {
      message: 'Thêm vào giỏ hàng thành công',
      statusCode: 201,
      data: { items, total_amount: calcTotalAmount(items) },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/cart/:bookId — { quantity }
async function updateCartItem(req, res, next) {
  try {
    const { quantity } = req.body;
    if (!validateQuantity(quantity)) {
      return error(res, {
        message: 'quantity phải là số nguyên > 0',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const updated = await cartItemModel.updateQuantity(req.user.id, req.params.bookId, Number(quantity));
    if (!updated) {
      return error(res, {
        message: 'Sách không có trong giỏ hàng',
        errorCode: 'CART_ITEM_NOT_FOUND',
        statusCode: 404,
      });
    }

    const items = await cartItemModel.findByUserId(req.user.id);
    return success(res, {
      message: 'Cập nhật giỏ hàng thành công',
      data: { items, total_amount: calcTotalAmount(items) },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart/:bookId
async function removeCartItem(req, res, next) {
  try {
    await cartItemModel.removeItem(req.user.id, req.params.bookId);
    const items = await cartItemModel.findByUserId(req.user.id);
    return success(res, {
      message: 'Xóa sách khỏi giỏ hàng thành công',
      data: { items, total_amount: calcTotalAmount(items) },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart
async function clearCart(req, res, next) {
  try {
    await cartItemModel.clearCart(req.user.id);
    return success(res, { message: 'Đã xóa toàn bộ giỏ hàng', data: { items: [], total_amount: 0 } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
