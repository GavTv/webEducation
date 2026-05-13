const removeXPoweredHeader = (req, res, next) => {
  res.setHeader('X-Powered-By', '');
  next();
};

module.exports = removeXPoweredHeader;
