import { describe, expect, it, vi } from 'vitest';

import { bindAll, bindFirst } from '../shared/bind-events';

describe('bind events helpers', () => {
  it('binds all matching elements', () => {
    const listener = vi.fn();
    const buttonA = { addEventListener: vi.fn(() => listener()) };
    const buttonB = { addEventListener: vi.fn(() => listener()) };
    const root = {
      querySelectorAll: vi.fn(() => [buttonA, buttonB]),
    } as unknown as ParentNode;

    bindAll(root, '[data-test]', (element: any) => {
      element.addEventListener('click', listener);
    });

    expect(root.querySelectorAll).toHaveBeenCalledWith('[data-test]');
    expect(buttonA.addEventListener).toHaveBeenCalled();
    expect(buttonB.addEventListener).toHaveBeenCalled();
  });

  it('binds first matching element when present', () => {
    const button = { addEventListener: vi.fn() };
    const root = {
      querySelector: vi.fn(() => button),
    } as unknown as ParentNode;

    bindFirst(root, '[data-test]', (element: any) => {
      element.addEventListener('click', () => {});
    });

    expect(root.querySelector).toHaveBeenCalledWith('[data-test]');
    expect(button.addEventListener).toHaveBeenCalled();
  });
});
