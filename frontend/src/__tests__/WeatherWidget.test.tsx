import React from 'react'
import { render, screen } from '@testing-library/react'
import { WeatherWidget } from '@/components/recommendations/WeatherWidget'
import type { WeatherData } from '@/types/recommendations'

// Use whole-number temperatures so Math.round() doesn't change the value
// and the assertions can match the exact digit rendered.
const mockWeather: WeatherData = {
  temperature: 18,
  feels_like: 16,
  condition: 'clear',
  humidity: 65,
  wind_speed: 12,
  is_daytime: true,
  location: '43.7,-79.4',
  fetched_at: new Date().toISOString(),
}

describe('WeatherWidget', () => {
  it('displays temperature', () => {
    render(<WeatherWidget weather={mockWeather} />)
    expect(screen.getByText(/18/)).toBeInTheDocument()
  })

  it('displays feels like temperature', () => {
    render(<WeatherWidget weather={mockWeather} />)
    expect(screen.getByText(/feels like/i)).toBeInTheDocument()
  })

  it('displays condition', () => {
    render(<WeatherWidget weather={mockWeather} />)
    expect(screen.getByText(/clear/i)).toBeInTheDocument()
  })
})
