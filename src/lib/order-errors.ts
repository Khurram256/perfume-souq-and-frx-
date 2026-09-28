// Shared between the order server function and the cart. The server throws
// this exact message for any internal failure (database, configuration,
// network) so customers never see raw technical errors, and the cart can
// recognise it and still hand the order to WhatsApp instead of dead-ending.
export const ORDER_UNAVAILABLE_MESSAGE =
  "We couldn't record your order just now, but you can still send it on WhatsApp.";

// A problem the customer can fix themselves (bad phone, missing size, sold
// out). Its message is safe to show as-is.
export class OrderInputError extends Error {}
