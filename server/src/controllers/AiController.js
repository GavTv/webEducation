const GeminiService = require('../services/GeminiService');

class AiController {
  static async chat(req, res) {
    try {
      const message =
        typeof req.body?.message === 'string' ? req.body.message.trim() : '';

      if (!message) {
        return res.status(400).json({
          error: 'MESSAGE_REQUIRED',
          answer: 'Напиши сообщение для бота.',
        });
      }

      if (message.length > 1500) {
        return res.status(400).json({
          error: 'MESSAGE_TOO_LONG',
          answer: 'Сообщение слишком длинное. Сократи вопрос до 1500 символов.',
        });
      }

      const userId = res.locals.user?.id;
      const limit = GeminiService.checkDailyLimit(userId);

      if (!limit.allowed) {
        return res.status(429).json({
          error: 'DAILY_LIMIT_REACHED',
          answer: `Лимит AI-запросов на сегодня исчерпан: ${limit.used}/${limit.limit}. Попробуй завтра.`,
          used: limit.used,
          limit: limit.limit,
        });
      }

      if (!GeminiService.isConfigured()) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY_NOT_SET',
          answer: GeminiService.getMissingKeyMessage(),
          used: limit.used,
          limit: limit.limit,
        });
      }

      try {
        const answer = await GeminiService.chat(message);

        return res.status(200).json({
          answer,
          used: limit.used,
          limit: limit.limit,
        });
      } catch (error) {
        console.error('[AiController.chat]', error);

        if (error.code === 'GEMINI_API_KEY_NOT_SET') {
          return res.status(503).json({
            error: 'GEMINI_API_KEY_NOT_SET',
            answer: GeminiService.getMissingKeyMessage(),
            used: limit.used,
            limit: limit.limit,
          });
        }

        const answer =
          error.code === 'GEMINI_API_ERROR'
            ? GeminiService.formatGeminiError(error.message)
            : 'Сейчас AI не ответил. Попробуй позже.';

        return res.status(500).json({
          error: 'GEMINI_ERROR',
          answer,
          used: limit.used,
          limit: limit.limit,
        });
      }
    } catch (error) {
      console.error('[AiController.chat]', error);
      return res.status(500).json({
        error: 'AI_ROUTE_ERROR',
        answer: 'Ошибка AI route.',
      });
    }
  }
}

module.exports = AiController;
