const express = require("express");
const router = express.Router();
const bookController = require("../controllers/book.controller");
const bookImageController = require("../controllers/bookImage.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");
const optionalAuthMiddleware = require("../middlewares/optionalAuth.middleware");
const uploadImagesMiddleware = require("../middlewares/upload.middleware");

// optionalAuthMiddleware: route vẫn public, nhưng nếu có token admin hợp lệ thì gắn req.user
// để controller cho phép xem thêm sách đã ẩn (is_active = 0).
router.get("/", optionalAuthMiddleware, bookController.getAll);
router.get("/:id", optionalAuthMiddleware, bookController.getById);
router.post("/", authMiddleware, adminMiddleware, bookController.create);
router.put("/:id", authMiddleware, adminMiddleware, bookController.update);
router.delete("/:id", authMiddleware, adminMiddleware, bookController.remove);

// Quản lý ảnh sách (mục 6.5) — chỉ admin, route upload cần thêm middleware multer để đọc file
router.post(
  "/:id/images",
  authMiddleware,
  adminMiddleware,
  uploadImagesMiddleware,
  bookImageController.uploadImages,
);
router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  adminMiddleware,
  bookImageController.deleteImage,
);
router.put(
  "/:id/images/:imageId/primary",
  authMiddleware,
  adminMiddleware,
  bookImageController.setPrimaryImage,
);

module.exports = router;
