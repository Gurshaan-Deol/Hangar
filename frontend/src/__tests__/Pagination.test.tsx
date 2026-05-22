import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '@/components/ui/Pagination'

describe('Pagination', () => {
  it('does not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not render when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={jest.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders correct number of page buttons for small page count', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={jest.fn()} />)
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument()
  })

  it('disables the Previous button on the first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />)
    const prev = screen.getByLabelText('Previous page')
    expect(prev).toBeDisabled()
  })

  it('disables the Next button on the last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />)
    const next = screen.getByLabelText('Next page')
    expect(next).toBeDisabled()
  })

  it('calls onPageChange with the next page number when Next is clicked', async () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with the previous page number when Previous is clicked', async () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByLabelText('Previous page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with the correct page when a page button is clicked', async () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByLabelText('Page 3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('marks the current page button with aria-current', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={jest.fn()} />)
    expect(screen.getByLabelText('Page 2')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Page 1')).not.toHaveAttribute('aria-current')
  })

  it('shows ellipsis for large page ranges', () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={jest.fn()} />)
    const ellipses = screen.getAllByText('…')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})
