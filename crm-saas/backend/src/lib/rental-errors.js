export class RentalError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
export const invalid = (message) => {
  throw new RentalError(400, "VALIDATION_ERROR", message);
};
export const notFound = () => {
  throw new RentalError(404, "NOT_FOUND", "Resource not found.");
};
export const conflict = (code, message) => {
  throw new RentalError(409, code, message);
};
export const route = (handler) => (req, res, next) =>
  Promise.resolve()
    .then(() => handler(req, res))
    .catch(next);
export function rentalErrors(error, req, res, next) {
  if (error instanceof RentalError)
    return res
      .status(error.status)
      .json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      });
  if (
    req.path.startsWith("/api/ai/") ||
    req.path.startsWith("/api/vehicles") ||
    req.path.startsWith("/api/reservations") ||
    req.path.startsWith("/api/fleet")
  ) {
    if (error.code === "P2002")
      return res
        .status(409)
        .json({
          error: {
            code: "DUPLICATE",
            message: "License plate already exists in your company.",
          },
        });
    if (error.code === "P2003")
      return res
        .status(409)
        .json({
          error: {
            code: "RESOURCE_REFERENCED",
            message:
              "Resource has reservation history or a related record changed. Refresh and try again.",
          },
        });
    if (error.code === "P2025")
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
    if (error.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ error: { code: "INVALID_JSON", message: "Invalid JSON." } });
    console.error("Rental API failure:", error.code || error.name);
    return res
      .status(503)
      .json({
        error: {
          code: "TEMPORARILY_UNAVAILABLE",
          message: "Rental service unavailable. Please retry.",
        },
      });
  }
  next(error);
}
