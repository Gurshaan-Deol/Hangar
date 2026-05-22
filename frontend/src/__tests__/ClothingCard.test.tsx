import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ClothingItem } from '@/types/clothing'

// AnalysisStatus makes live API polling calls — replace with a static stub.
// The stub renders nothing that would conflict with badge text assertions.
jest.mock('@/components/wardrobe/AnalysisStatus', () => ({
  AnalysisStatus: ({ initialStatus }: { initialStatus: string }) => (
    <div data-testid="analysis-status" data-status={initialStatus} />
  ),
}))

// deleteClothingItem is only triggered by user interaction, not on render.
jest.mock('@/lib/api', () => ({
  deleteClothingItem: jest.fn().mockResolvedValue(undefined),
}))

// next/image has no jsdom equivalent — render a plain <img> instead.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

// Import after mocks are set up so the component picks up the stubbed modules.
import { ClothingCard } from '@/components/wardrobe/ClothingCard'

const mockItem: ClothingItem = {
  id: '123',
  user_id: 'user1',
  name: 'Blue Denim Jacket',
  category: 'jacket',
  color: 'blue',
  style: 'casual',
  season: ['fall', 'winter'],
  tags: ['weekend', 'outdoor'],
  image_endpoint: "/api/v1/clothing/123/image",
  status: 'ready',
  attempt_count: 0,
  notes: null,
  duplicate_of: null,
  duplicate_confidence: null,
  duplicate_reason: null,
  dismissed_duplicate: false,
  created_at: new Date().toISOString(),
}

describe('ClothingCard', () => {
  it('renders item name', () => {
    render(
      <ClothingCard
        item={mockItem}
        onDelete={jest.fn()}
        onClick={jest.fn()}
        onAnalysisComplete={jest.fn()}
      />,
    )
    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
  })

  it('shows Analyzing badge when status is analyzing', () => {
    const analyzing: ClothingItem = { ...mockItem, status: 'analyzing', name: null }
    render(
      <ClothingCard
        item={analyzing}
        onDelete={jest.fn()}
        onClick={jest.fn()}
        onAnalysisComplete={jest.fn()}
      />,
    )
    // The STATUS_BADGE renders "Analyzing" for non-ready items
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
  })

  it('calls onClick when the card wrapper is clicked', async () => {
    const onClick = jest.fn()
    render(
      <ClothingCard
        item={mockItem}
        onDelete={jest.fn()}
        onClick={onClick}
        onAnalysisComplete={jest.fn()}
      />,
    )
    // The card wrapper has role="button"; the delete <button> also has role="button".
    // getAllByRole returns them in DOM order — the wrapper is first.
    const [cardWrapper] = screen.getAllByRole('button')
    await userEvent.click(cardWrapper)
    expect(onClick).toHaveBeenCalledWith(mockItem)
  })

  it('shows failed overlay when status is failed', () => {
    const failed: ClothingItem = { ...mockItem, status: 'failed' }
    render(
      <ClothingCard
        item={failed}
        onDelete={jest.fn()}
        onClick={jest.fn()}
        onAnalysisComplete={jest.fn()}
      />,
    )
    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument()
  })
})
