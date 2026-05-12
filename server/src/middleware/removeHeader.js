const removeXPoweredHeader = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
};

module.exports = removeXPoweredHeader;
