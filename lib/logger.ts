import { getLogger } from "jsr:@logtape/logtape";

const logger = getLogger(["lifts-fe"]);

export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (context) {
    logger.info`${message} ${context}`;
  } else {
    logger.info(message);
  }
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (context) {
    logger.warn`${message} ${context}`;
  } else {
    logger.warn(message);
  }
}

export function logError(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (context) {
    logger.error`${message} ${context}`;
  } else {
    logger.error(message);
  }
}
