const { validate: isUuid } = require("uuid");
const { AppError } = require("../utils/apiResponse");

module.exports = (req, _res, next) => {
  const { id } = req.params;

  if (!id || !isUuid(id)) {
    next(new AppError("A valid job id is required.", 400));
    return;
  }

  next();
};
