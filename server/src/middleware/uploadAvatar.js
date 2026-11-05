const multer = require('multer');
const formatResponse = require('../utils/formatResponse');

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Можно загружать только изображения: jpg, png, webp, gif'));
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

function uploadAvatar(req, res, next) {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json(formatResponse(400, 'Файл должен быть не больше 2 МБ'));
    }

    return res
      .status(400)
      .json(formatResponse(400, error.message || 'Ошибка загрузки файла'));
  });
}

module.exports = uploadAvatar;
