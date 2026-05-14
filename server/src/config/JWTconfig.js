module.exports = {
  accessToken: { expiresIn: 60 * 5 },
  /** Короткая сессия без «Запомнить меня» */
  refreshTokenSession: { expiresIn: 60 * 60 * 24 * 7 },
  /** Долгий refresh при «Запомнить меня» */
  refreshTokenRemember: { expiresIn: 60 * 60 * 24 * 90 },
};
