import { relativeTime } from '@/lib/relativeTime'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
}
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString()
}
function secondsAgo(n: number): string {
  return new Date(Date.now() - n * 1000).toISOString()
}

describe('relativeTime', () => {
  it('returns "Just now" for very recent dates (< 60s)', () => {
    expect(relativeTime(secondsAgo(30))).toBe('Just now')
    expect(relativeTime(secondsAgo(59))).toBe('Just now')
  })

  it('returns "Just now" for future dates (clock skew guard)', () => {
    const future = new Date(Date.now() + 5000).toISOString()
    expect(relativeTime(future)).toBe('Just now')
  })

  it('returns minutes ago for dates within the last hour', () => {
    expect(relativeTime(minutesAgo(1))).toBe('1 minute ago')
    expect(relativeTime(minutesAgo(45))).toBe('45 minutes ago')
  })

  it('returns hours ago for dates within the last day', () => {
    expect(relativeTime(hoursAgo(1))).toBe('1 hour ago')
    expect(relativeTime(hoursAgo(23))).toBe('23 hours ago')
  })

  it('returns "Yesterday" for dates exactly 1 day ago', () => {
    expect(relativeTime(daysAgo(1))).toBe('Yesterday')
  })

  it('returns days ago for dates within the last week', () => {
    expect(relativeTime(daysAgo(2))).toBe('2 days ago')
    expect(relativeTime(daysAgo(6))).toBe('6 days ago')
  })

  it('returns weeks ago for dates within the last ~5 weeks', () => {
    expect(relativeTime(daysAgo(7))).toBe('1 week ago')
    expect(relativeTime(daysAgo(14))).toBe('2 weeks ago')
  })

  it('returns months ago for dates between ~5 weeks and 6 months', () => {
    expect(relativeTime(daysAgo(40))).toBe('1 month ago')
    expect(relativeTime(daysAgo(90))).toBe('3 months ago')
  })

  it('returns a formatted date string for dates older than 6 months', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
    const result = relativeTime(old)
    // Should be a locale date string, not a relative expression
    expect(result).not.toMatch(/ago|now|Yesterday/)
    expect(result.length).toBeGreaterThan(0)
  })
})
