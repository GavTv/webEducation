const { User } = require('../db/models');
const AuthService = require('../services/AuthService');
const formatResponse = require('../utils/formatResponse');

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
          users: users.map((u) => u.get()),
        }),
      );
    } catch (error) {
      console.log('======== UserAdminController.listUsers =========');
      console.log(error);
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
      console.log('======== UserAdminController.updateUserRole =========');
      console.log(error);
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

      if (target.role === 'admin') {
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json(
            formatResponse(400, 'Нельзя удалить последнего администратора'),
          );
        }
      }

      const deleted = await AuthService.deleteUserById(targetId);
      if (!deleted) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пользователь не найден'));
      }

      return res.status(200).json(formatResponse(200, 'Пользователь удалён'));
    } catch (error) {
      console.log('======== UserAdminController.deleteUser =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении пользователя'));
    }
  }
}

module.exports = UserAdminController;
