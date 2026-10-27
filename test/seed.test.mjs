import { expect, test, vi } from 'vitest';

const { createMany } = vi.hoisted(() => ({
  createMany: vi.fn(),
}));

vi.mock('../src/prismaClient.ts', () => ({
  default: {
    product: {
      createMany,
    },
  },
}));

import '../scripts/seed.ts';

test('seed script creates the product catalogue', () => {
  expect(createMany).toHaveBeenCalledOnce();
  expect(createMany.mock.calls[0][0].data).toHaveLength(22);
  expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
    name: 'Apple',
    category: 'Fruit',
  });
});
