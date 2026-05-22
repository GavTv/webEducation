const { User } = require('../db/models');
const AuthService = require('../services/AuthService');
const formatResponse = require('../utils/formatResponse');
const {
  isProtectedMockAdmin,
  protectedMockAdminMessage,
} = require('../utils/protectedUsers');

const ALLOWED_ROLES = ['student', 'teacher', 'admin'];

class UserAdminController {
  static async listUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'username', 'role', 'createdAt'],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json(
        formatResponse(200, 'Список пользователей', {
          users: users.map((u) => {
            const row = u.get();
            return {
              ...row,
              isProtected: isProtectedMockAdmin(u),
            };
          }),
        }),
      );
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при загрузке пользователей'));
    }
  }

  static async updateUserRole(req, res) {
    try {
      const targetId = Number(req.params.id);
      const { role } = req.body ?? {};

      if (!ALLOWED_ROLES.includes(role)) {
        return res
          .status(400)
          .json(formatResponse(400, 'Недопустимая роль'));
      }

      const target = await User.findByPk(targetId);
      if (!target) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      if (isProtectedMockAdmin(target)) {
        return res
          .status(403)
          .json(
            formatResponse(
              403,
              'Нельзя изменить роль системного администратора',
            ),
          );
      }

      if (target.role === 'admin' && role !== 'admin') {
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json(
            formatResponse(
              400,
              'Нельзя снять роль администратора у последнего админа',
            ),
          );
        }
      }

      await target.update({ role });
      const user = await AuthService.findPublicUserById(targetId);

      return res.status(200).json(
        formatResponse(200, 'Роль обновлена', { user }),
      );
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при смене роли'));
    }
  }

  static async deleteUser(req, res) {
    try {
      const actor = res.locals.user;
      const targetId = Number(req.params.id);

      if (!Number.isFinite(targetId)) {
        return res
          .status(400)
          .json(formatResponse(400, 'Некорректный id пользователя'));
      }

      if (actor?.id === targetId) {
        return res.status(400).json(
          formatResponse(400, 'Нельзя удалить свой аккаунт из панели администратора'),
        );
      }

      const target = await User.findByPk(targetId);
      if (!target) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      if (isProtectedMockAdmin(target)) {
        return res
          .status(403)
          .json(formatResponse(403, protectedMockAdminMessage()));
      }

      if (target.role === 'admin') {
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json(
            formatResponse(400, 'Нельзя удалить последнего администратора'),
          );
        }
      }

      let deleted;
      try {
        deleted = await AuthService.deleteUserById(targetId);
      } catch (error) {
        if (error?.code === 'PROTECTED_MOCK_ADMIN') {
          return res
            .status(403)
            .json(formatResponse(403, protectedMockAdminMessage()));
        }
        throw error;
      }
      if (!deleted) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      return res.status(200).json(formatResponse(200, 'Пользователь удалён'));
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении пользователя'));
    }
  }
}

module.exports = UserAdminController;
