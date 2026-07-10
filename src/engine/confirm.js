// Promise-based styled confirm — replaces native confirm() (which looks
// wrong, blocks the thread, and can't be styled). Usage:
//   if (await confirm('end the game for both of you?', 'end game')) { … }
// ConfirmDialog.svelte (mounted once in App.svelte) renders the request.
import { writable } from 'svelte/store';

export const confirmRequest = writable(null);

export function confirm(message, actionLabel = 'yes', cancelLabel = 'not now') {
  return new Promise((resolve) => {
    confirmRequest.set({
      message,
      actionLabel,
      cancelLabel,
      resolve: (answer) => {
        confirmRequest.set(null);
        resolve(answer);
      }
    });
  });
}
