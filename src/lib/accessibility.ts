import type React from 'react';

export const keyboardHelper = {
  isEnter(event: Pick<KeyboardEvent, 'key'> | Pick<React.KeyboardEvent, 'key'>): boolean {
    return event.key === 'Enter';
  },

  isSpace(event: Pick<KeyboardEvent, 'key'> | Pick<React.KeyboardEvent, 'key'>): boolean {
    return event.key === ' ' || event.key === 'Spacebar';
  },
};
