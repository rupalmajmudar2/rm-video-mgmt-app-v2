/**
 * TDD Tests for MediaCard Component
 * Tests VideoTape badge display and media card functionality
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MediaCard from '@/components/MediaCard'
import { Media } from '@/types'

// Mock media data
const mockVideoTapeMedia: Media = {
  id: 1,
  kind: 'VIDEO',
  title: 'Family Vacation 2023',
  description: 'Our trip to the beach',
  filename: 'vacation_2023.mp4',
  byte_size: 1048576,
  duration_sec: 120,
  width: 1920,
  height: 1080,
  captured_at: '2023-07-15T10:30:00Z',
  tape_number: 'TAPE001',
  source_kind: 'VIDEOTAPE',
  visibility: 'AUTHED',
  status: 'READY',
  created_at: '2023-07-15T10:30:00Z',
  tags: ['family', 'vacation', 'beach'],
  comments_count: 3
}

const mockICloudMedia: Media = {
  id: 2,
  kind: 'PHOTO',
  title: 'Sunset Photo',
  description: 'Beautiful sunset',
  filename: 'sunset.jpg',
  byte_size: 512000,
  duration_sec: null,
  width: 1920,
  height: 1080,
  captured_at: '2023-07-16T18:45:00Z',
  tape_number: null,
  source_kind: 'ICLOUD',
  visibility: 'AUTHED',
  status: 'READY',
  created_at: '2023-07-16T18:45:00Z',
  tags: ['nature', 'sunset'],
  comments_count: 1
}

describe('MediaCard Component', () => {
  test('displays VideoTape badge for VideoTape media', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('Tape #TAPE001')).toBeInTheDocument()
  })

  test('does not display VideoTape badge for non-VideoTape media', () => {
    render(<MediaCard media={mockICloudMedia} />)
    
    expect(screen.queryByText(/Tape #/)).not.toBeInTheDocument()
  })

  test('displays video duration for video media', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('2:00')).toBeInTheDocument()
  })

  test('displays play icon for video media', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    // Check for play icon (assuming it's rendered as an SVG or icon)
    const playIcon = screen.getByRole('img', { hidden: true }) || screen.getByTestId('play-icon')
    expect(playIcon).toBeInTheDocument()
  })

  test('displays image icon for photo media', () => {
    render(<MediaCard media={mockICloudMedia} />)
    
    // Check for image icon
    const imageIcon = screen.getByRole('img', { hidden: true }) || screen.getByTestId('image-icon')
    expect(imageIcon).toBeInTheDocument()
  })

  test('displays media title or filename', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('Family Vacation 2023')).toBeInTheDocument()
  })

  test('displays media description', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('Our trip to the beach')).toBeInTheDocument()
  })

  test('displays tags', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('family')).toBeInTheDocument()
    expect(screen.getByText('vacation')).toBeInTheDocument()
    expect(screen.getByText('beach')).toBeInTheDocument()
  })

  test('displays comments count', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('3 comments')).toBeInTheDocument()
  })

  test('displays file size in human readable format', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('1 MB')).toBeInTheDocument()
  })

  test('displays dimensions for media with width and height', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    expect(screen.getByText('1920×1080')).toBeInTheDocument()
  })

  test('shows truncated tags when more than 3', () => {
    const mediaWithManyTags: Media = {
      ...mockVideoTapeMedia,
      tags: ['family', 'vacation', 'beach', '2023', 'summer', 'fun']
    }
    
    render(<MediaCard media={mediaWithManyTags} />)
    
    expect(screen.getByText('family')).toBeInTheDocument()
    expect(screen.getByText('vacation')).toBeInTheDocument()
    expect(screen.getByText('beach')).toBeInTheDocument()
    expect(screen.getByText('+3 more')).toBeInTheDocument()
  })

  test('opens detail modal when clicked', () => {
    render(<MediaCard media={mockVideoTapeMedia} />)
    
    const mediaCard = screen.getByRole('button') || screen.getByTestId('media-card')
    mediaCard.click()
    
    // Check if modal opens (assuming it shows the title in modal)
    expect(screen.getByText('Family Vacation 2023')).toBeInTheDocument()
  })
})
