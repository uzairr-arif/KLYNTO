import type { RequestMessage } from '../shared/messages';

type HandlerFor<M> = (msg: M, sender: chrome.runtime.MessageSender) => Promise<unknown> | unknown;

export type MessageHandlers = {
  [K in RequestMessage['type']]: HandlerFor<Extract<RequestMessage, { type: K }>>;
};

/**
 * Typed chrome.runtime.onMessage router. Handlers may return a promise;
 * responses are wrapped in {ok, data|error}.
 */
export function registerMessageRouter(handlers: MessageHandlers): void {
  chrome.runtime.onMessage.addListener(
    (message: RequestMessage, sender, sendResponse: (response: unknown) => void) => {
      const handler = handlers[message.type] as HandlerFor<RequestMessage> | undefined;
      if (!handler) {
        sendResponse({
          ok: false,
          error: `Unknown message type: ${String((message as { type?: string }).type)}`,
        });
        return false;
      }
      Promise.resolve()
        .then(() => handler(message, sender))
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true; // keep the channel open for the async response
    },
  );
}
