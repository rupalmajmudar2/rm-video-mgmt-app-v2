/**
 * TDD Tests for FilterSidebar Component
 * Tests filtering functionality for VideoTape and other sources
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import FilterSidebar from '@/components/FilterSidebar'
import { MediaFilters } from '@/types'

const mockOnFilterChange = jest.fn()

const defaultProps = {
  filters: {
    skip: 0,
    limit: 50
  } as MediaFilters,
  onFilterChange: mockOnFilterChange
}

describe('FilterSidebar Component', () => {
  beforeEach(() => {
    mockOnFilterChange.mockClear()
  })

  test('renders source filter dropdown', () => {
    render(<FilterSidebar {...defaultProps} />)
    
    expect(screen.getByLabelText('Source')).toBeInTheDocument()
    expect(screen.getByDisplayValue('All Sources')).toBeInTheDocument()
  })

  test('shows VideoTape source options', () => {
    render(<FilterSidebar {...defaultProps} />)
    
    const sourceSelect = screen.getByLabelText('Source')
    fireEvent.click(sourceSelect)
    
    expect(screen.getByText('Video Tapes')).toBeInTheDocument()
    expect(screen.getByText('iCloud')).toBeInTheDocument()
    expect(screen.getByText('Google Photos')).toBeInTheDocument()
  })

  test('shows tape number filter when VideoTape source is selected', () => {
    const filtersWithVideoTape = {
      ...defaultProps.filters,
      source: 'VIDEOTAPE'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithVideoTape} />)
    
    expect(screen.getByLabelText('Tape Number')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter tape number')).toBeInTheDocument()
  })

  test('does not show tape number filter for non-VideoTape sources', () => {
    const filtersWithICloud = {
      ...defaultProps.filters,
      source: 'ICLOUD'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithICloud} />)
    
    expect(screen.queryByLabelText('Tape Number')).not.toBeInTheDocument()
  })

  test('calls onFilterChange when source changes', () => {
    render(<FilterSidebar {...defaultProps} />)
    
    const sourceSelect = screen.getByLabelText('Source')
    fireEvent.change(sourceSelect, { target: { value: 'VIDEOTAPE' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({ source: 'VIDEOTAPE' })
  })

  test('calls onFilterChange when tape number changes', () => {
    const filtersWithVideoTape = {
      ...defaultProps.filters,
      source: 'VIDEOTAPE'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithVideoTape} />)
    
    const tapeNumberInput = screen.getByPlaceholderText('Enter tape number')
    fireEvent.change(tapeNumberInput, { target: { value: 'TAPE001' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({ tape_number: 'TAPE001' })
  })

  test('calls onFilterChange when date range changes', () => {
    render(<FilterSidebar {...defaultProps} />)
    
    const dateFromInput = screen.getByDisplayValue('')
    fireEvent.change(dateFromInput, { target: { value: '2023-01-01' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({ date_from: '2023-01-01' })
  })

  test('shows clear filters button when filters are active', () => {
    const filtersWithActiveFilters = {
      ...defaultProps.filters,
      source: 'VIDEOTAPE',
      tape_number: 'TAPE001'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithActiveFilters} />)
    
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument()
  })

  test('does not show clear filters button when no filters are active', () => {
    render(<FilterSidebar {...defaultProps} />)
    
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument()
  })

  test('clears all filters when clear button is clicked', () => {
    const filtersWithActiveFilters = {
      ...defaultProps.filters,
      source: 'VIDEOTAPE',
      tape_number: 'TAPE001',
      date_from: '2023-01-01'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithActiveFilters} />)
    
    const clearButton = screen.getByText('Clear All Filters')
    fireEvent.click(clearButton)
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      date_from: undefined,
      date_to: undefined,
      source: undefined,
      tape_number: undefined,
      tag_ids: undefined
    })
  })

  test('displays current filter values', () => {
    const filtersWithValues = {
      ...defaultProps.filters,
      source: 'VIDEOTAPE',
      tape_number: 'TAPE001',
      date_from: '2023-01-01',
      date_to: '2023-12-31'
    }
    
    render(<FilterSidebar {...defaultProps} filters={filtersWithValues} />)
    
    expect(screen.getByDisplayValue('VIDEOTAPE')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TAPE001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2023-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2023-12-31')).toBeInTheDocument()
  })
})
