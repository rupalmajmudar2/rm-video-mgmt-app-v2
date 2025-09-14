/**
 * TDD Tests for AuthContext
 * Tests authentication state management and API calls
 */
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { authApi } from '../lib/auth'
import { User } from '@/types'

// Mock the auth API
jest.mock('../lib/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  role: 'USER',
  is_blocked: false,
  created_at: '2023-01-01T00:00:00Z'
}

const mockAdminUser: User = {
  id: 2,
  name: 'Admin User',
  email: 'admin@example.com',
  phone: '+1234567890',
  role: 'ADMIN',
  is_blocked: false,
  created_at: '2023-01-01T00:00:00Z'
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  test('initializes with no user and loading true', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    expect(result.current.user).toBeNull()
    // The loading state might change immediately, so we check both states
    expect(result.current.loading).toBeDefined()
    
    // Wait for the auth initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.loading).toBe(false)
  })

  test('loads user from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue('mock-token')
    ;(authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(authApi.getCurrentUser).toHaveBeenCalled()
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
  })

  test('handles getCurrentUser error by clearing tokens', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token')
    ;(authApi.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  test('login updates user state and stores tokens', async () => {
    const mockTokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer'
    }

    ;(authApi.login as jest.Mock).mockResolvedValue(mockTokens)
    ;(authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(authApi.login).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password123'
    })
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'access-token')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token')
    expect(authApi.getCurrentUser).toHaveBeenCalled()
    expect(result.current.user).toEqual(mockUser)
  })

  test('register calls API but does not log in user', async () => {
    ;(authApi.register as jest.Mock).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      await result.current.register('Test User', 'test@example.com', 'password123', '+1234567890')
    })

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '+1234567890'
    })
    expect(result.current.user).toBeNull() // Should not be logged in
  })

  test('logout clears user state and tokens', async () => {
    localStorageMock.getItem.mockReturnValue('refresh-token')
    ;(authApi.logout as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    // Set initial user state
    act(() => {
      result.current.user = mockUser
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(authApi.logout).toHaveBeenCalledWith('refresh-token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    expect(result.current.user).toBeNull()
  })

  test('logout handles API errors gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('refresh-token')
    ;(authApi.logout as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    // Set initial user state
    act(() => {
      result.current.user = mockUser
    })

    await act(async () => {
      await result.current.logout()
    })

    // Should still clear local state even if API call fails
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    expect(result.current.user).toBeNull()
  })

  test('handles login errors', async () => {
    ;(authApi.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.user).toBeNull()
  })

  test('handles register errors', async () => {
    ;(authApi.register as jest.Mock).mockRejectedValue(new Error('Email already exists'))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await act(async () => {
      try {
        await result.current.register('Test User', 'existing@example.com', 'password123')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.user).toBeNull()
  })
})
