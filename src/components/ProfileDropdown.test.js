import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import ProfileDropdown from './ProfileDropdown';

// Mock Firebase auth
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null
  }
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock signOut
const mockSignOut = jest.fn();
jest.mock('firebase/auth', () => ({
  signOut: mockSignOut,
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('ProfileDropdown', () => {
  const mockCurrentUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null
  };

  const mockUserProfile = {
    fullName: 'Test User',
    email: 'test@example.com',
    role: 'Admin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders profile button', () => {
    render(
      <TestWrapper>
        <ProfileDropdown 
          currentUser={mockCurrentUser} 
          userProfile={mockUserProfile}
        />
      </TestWrapper>
    );

    const profileButton = screen.getByRole('button', { name: /account/i });
    expect(profileButton).toBeInTheDocument();
  });

  test('opens dropdown menu when profile button is clicked', () => {
    render(
      <TestWrapper>
        <ProfileDropdown 
          currentUser={mockCurrentUser} 
          userProfile={mockUserProfile}
        />
      </TestWrapper>
    );

    const profileButton = screen.getByRole('button', { name: /account/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('shows theme toggle in dropdown', () => {
    render(
      <TestWrapper>
        <ProfileDropdown 
          currentUser={mockCurrentUser} 
          userProfile={mockUserProfile}
        />
      </TestWrapper>
    );

    const profileButton = screen.getByRole('button', { name: /account/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });

  test('shows profile settings option', () => {
    render(
      <TestWrapper>
        <ProfileDropdown 
          currentUser={mockCurrentUser} 
          userProfile={mockUserProfile}
        />
      </TestWrapper>
    );

    const profileButton = screen.getByRole('button', { name: /account/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
  });

  test('shows logout option', () => {
    render(
      <TestWrapper>
        <ProfileDropdown 
          currentUser={mockCurrentUser} 
          userProfile={mockUserProfile}
        />
      </TestWrapper>
    );

    const profileButton = screen.getByRole('button', { name: /account/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});

