const formatResponse = require('../utils/formatResponse');
const AiService = require('../services/AiService');

class AiController {
  static async getAiResponse(req, res) {
    const { title, text } = req.body;

    if (!title || !text) {
      return res
        .status(400)
        .json(
          formatResponse(
            400,
            'Заголовок и текст обязательны',
            null,
            'Заголовок и текст обязательны',
          ),
        );
    }

    if (text.length > 200 || title.length > 100) {
      return res
        .status(400)
        .json(
          formatResponse(
            400,
            'Заголовок и текст не должны превышать 100 и 200 символов соответственно',
            null,
            'Заголовок и текст не должны превышать 100 и 200 символов соответственно',
          ),
        );
    }

    try {
      const result = await AiService.generateText({ title, text });

      if (!result) {
        return res
          .status(500)
          .json(
            formatResponse(
              500,
              'Ошибка при генерации текста',
              null,
              'Ошибка при генерации текста',
            ),
          );
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Ответ получен', result, null));
    } catch (error) {
      console.log('==== AiController.getAiResponse ==== ');
      console.log(error);
      res
        .status(500)
        .json(formatResponse(500, 'Внутренняя ошибка сервера', null, error));
    }
  }
}

module.exports = AiController;
