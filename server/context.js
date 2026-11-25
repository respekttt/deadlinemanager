// Контекст запиту (ADR 0010): requestId, userId і прив'язаний до них логер.
// Ініціалізує хук onRequest у main.js; читають services і repositories.
import { AsyncLocalStorage } from 'node:async_hooks';

export const als = new AsyncLocalStorage();

// Кореневий логер (поза запитом); до setRootLogger лог мовчки відкидається.
let rootLogger;

export function setRootLogger(logger) {
  rootLogger = logger;
}

export function getContext() {
  return als.getStore();
}

const current = () => getContext()?.log ?? rootLogger;

// Кожен рядок логу з будь-якого шару містить requestId/userId поточного запиту.
export const log = {
  debug: (...args) => current()?.debug(...args),
  info: (...args) => current()?.info(...args),
  warn: (...args) => current()?.warn(...args),
  error: (...args) => current()?.error(...args),
};
