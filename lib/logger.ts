import { getLogger } from "jsr:@logtape/logtape";

const logger = getLogger(["lifts-fe"]);

export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  logger.info(message, context);
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  logger.warn(message, context);
}

export function logError(
  message: string,
  context?: Record<string, unknown>,
): void {
  logger.error(message, context);
}
