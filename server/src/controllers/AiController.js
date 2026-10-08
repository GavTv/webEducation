const GrokService = require('../services/GrokService');

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
      const limit = GrokService.checkDailyLimit(userId);

      if (!limit.allowed) {
        return res.status(429).json({
          error: 'DAILY_LIMIT_REACHED',
          answer: `Лимит AI-запросов на сегодня исчерпан: ${limit.used}/${limit.limit}. Попробуй завтра.`,
          used: limit.used,
          limit: limit.limit,
        });
      }

      if (!GrokService.isConfigured()) {
        return res.status(503).json({
          error: 'GROK_API_KEY_NOT_SET',
          answer: GrokService.getMissingKeyMessage(),
          used: limit.used,
          limit: limit.limit,
        });
      }

      try {
        const answer = await GrokService.chat(message);

        return res.status(200).json({
          answer,
          used: limit.used,
          limit: limit.limit,
        });
      } catch (error) {
        console.error('[AiController.chat]', error);

        if (error.code === 'GROK_API_KEY_NOT_SET') {
          return res.status(503).json({
            error: 'GROK_API_KEY_NOT_SET',
            answer: GrokService.getMissingKeyMessage(),
            used: limit.used,
            limit: limit.limit,
          });
        }

        const answer =
          error.code === 'GROK_API_ERROR'
            ? GrokService.formatGrokError(error.message)
            : 'Сейчас AI не ответил. Попробуй позже.';

        return res.status(500).json({
          error: 'GROK_ERROR',
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
