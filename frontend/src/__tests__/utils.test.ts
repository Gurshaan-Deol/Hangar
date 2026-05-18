import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'not-included', 'included')).toBe('base included')
  })

  it('resolves tailwind conflicts correctly', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })
})
