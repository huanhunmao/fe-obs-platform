import type { Plugin } from '@fe/core';

export default function ConsoleLog(): Plugin {
  return {
    name: 'console-log',
    onEvent(evt) {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        console.debug('[feobs]', evt);
      }
    }
  }
}