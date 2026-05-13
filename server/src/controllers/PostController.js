const PostService = require('../services/PostService');
const formatResponse = require('../utils/formatResponse');

class PostController {
  static async getAll(req, res) {
    try {
      const posts = await PostService.getAllPosts();

      if (posts.length === 0) {
        return res.status(200).json(formatResponse(200, 'Посты отсутствуют'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Посты получены', posts));
    } catch (error) {
      console.log('======== PostController.getAll =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при получении постов'));
    }
  }

  static async getOne(req, res) {
    const { id } = req.params;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const post = await PostService.getPostById(Number(id));

      if (!post) {
        return res.status(404).json(formatResponse(404, 'Пост не найден'));
      }

      return res.status(200).json(formatResponse(200, 'Пост получен', post));
    } catch (error) {
      console.log('======== PostController.getOne =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при получении поста'));
    }
  }

  static async create(req, res) {
    const { title, text } = req.body;
    const { user } = res.locals;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res
        .status(400)
        .json(formatResponse(400, 'Название поста обязательно'));
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res
        .status(400)
        .json(formatResponse(400, 'Описание поста обязательно'));
    }

    try {
      const newPost = await PostService.createPost({
        title,
        text,
        user_id: user.id,
      });

      return res
        .status(201)
        .json(formatResponse(201, 'Пост создан', newPost));
    } catch (error) {
      console.log('======== PostController.create =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при создании нового поста'));
    }
  }

  static async update(req, res) {
    const { title, text } = req.body;
    const { id } = req.params;
    const { user } = res.locals;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const updatedPost = await PostService.updatePost(
        Number(id),
        {
          title,
          text,
        },
        user.id,
      );

      if (!updatedPost) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пост для обновления не найден'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Пост изменен', updatedPost));
    } catch (error) {
      console.log('======== PostController.update =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при обновлении поста'));
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    const { user } = res.locals;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const deleted = await PostService.deletePost(Number(id), user.id);

      if (!deleted) {
        return res
          .status(404)
          .json(formatResponse(404, 'Пост для удаления не найден'));
      }

      return res.status(200).json(formatResponse(200, 'Пост удален'));
    } catch (error) {
      console.log('======== PostController.delete =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении поста'));
    }
  }
}

module.exports = PostController;
