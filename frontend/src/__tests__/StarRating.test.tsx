import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from '@/components/ui/StarRating'

describe('StarRating', () => {
  it('renders exactly 5 star buttons', () => {
    render(<StarRating value={null} onChange={jest.fn()} />)
    const stars = screen.getAllByRole('button')
    expect(stars).toHaveLength(5)
  })

  it('fills stars up to the current value', () => {
    render(<StarRating value={3} onChange={jest.fn()} />)
    // Stars 1–3 are filled (amber), stars 4–5 are not
    const s1 = screen.getByLabelText('Rate 1 star')
    const s4 = screen.getByLabelText('Rate 4 stars')
    // The filled star SVG has fill-amber-400 class; unfilled does not
    expect(s1.querySelector('svg')).toHaveClass('fill-amber-400')
    expect(s4.querySelector('svg')).not.toHaveClass('fill-amber-400')
  })

  it('calls onChange with the correct star number when clicked', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<StarRating value={null} onChange={onChange} />)
    await act(async () => { await user.click(screen.getByLabelText('Rate 4 stars')) })
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('calls onChange with 1 when the first star is clicked', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<StarRating value={null} onChange={onChange} />)
    await act(async () => { await user.click(screen.getByLabelText('Rate 1 star')) })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('does not call onChange when readOnly is true', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<StarRating value={3} onChange={onChange} readOnly />)
    await act(async () => { await user.click(screen.getByLabelText('Rate 5 stars')) })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders no filled stars when value is null', () => {
    render(<StarRating value={null} onChange={jest.fn()} />)
    const svgs = screen.getAllByRole('button').map((b) => b.querySelector('svg'))
    svgs.forEach((svg) => {
      expect(svg).not.toHaveClass('fill-amber-400')
    })
  })

  it('shows hover state — fills stars up to hovered star', async () => {
    const user = userEvent.setup()
    render(<StarRating value={1} onChange={jest.fn()} />)
    const star5 = screen.getByLabelText('Rate 5 stars')
    await act(async () => { await user.hover(star5) })
    // After hovering star 5, all 5 stars should appear filled
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn.querySelector('svg')).toHaveClass('fill-amber-400')
    })
  })
})
