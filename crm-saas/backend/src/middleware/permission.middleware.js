export const requireRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res
        .status(403)
        .json({
          error: {
            code: "FORBIDDEN",
            message: "Administrator access required.",
          },
        });
    next();
  };
