const { User } = require('../db/models');

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

class AvatarController {
  static async getAvatar(req, res) {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).end();
    }

    try {
      const user = await User.findByPk(userId, {
        attributes: ['avatarData', 'avatarMimeType'],
      });

      if (
        !user?.avatarData ||
        !ALLOWED_AVATAR_TYPES.has(user.avatarMimeType)
      ) {
        return res.status(404).end();
      }

      const image = Buffer.isBuffer(user.avatarData)
        ? user.avatarData
        : Buffer.from(user.avatarData);

      if (image.length === 0 || image.length > 2 * 1024 * 1024) {
        return res.status(404).end();
      }

      res.set({
        'Content-Type': user.avatarMimeType,
        'Content-Length': String(image.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      });

      return res.status(200).send(image);
    } catch (error) {
      console.error('[AvatarController] Не удалось загрузить аватар:', error);
      return res.status(500).end();
    }
  }
}

module.exports = AvatarController;
