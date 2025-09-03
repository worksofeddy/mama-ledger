import { render, screen } from '@testing-library/react'
import HomePage from '../../app/page'

// Mock the components that might cause issues
jest.mock('../../app/components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>
  }
})

jest.mock('../../app/components/NewsletterSignup', () => {
  return function MockNewsletterSignup() {
    return <div data-testid="newsletter-signup">Newsletter Signup</div>
  }
})

jest.mock('../../app/components/FAQ', () => {
  return function MockFAQ() {
    return <div data-testid="faq">FAQ</div>
  }
})

jest.mock('../../app/components/ContactSection', () => {
  return function MockContactSection() {
    return <div data-testid="contact-section">Contact Section</div>
  }
})

describe('HomePage', () => {
  it('renders the main heading correctly', () => {
    render(<HomePage />)
    
    expect(screen.getByText(/Track your daily money/i)).toBeInTheDocument()
    expect(screen.getByText(/grow your business/i)).toBeInTheDocument()
  })

  it('displays the hero badge', () => {
    render(<HomePage />)
    
    expect(screen.getByText('✅ Simple Daily Money Tracking')).toBeInTheDocument()
  })

  it('shows the main description', () => {
    render(<HomePage />)
    
    expect(screen.getByText(/Mama Ledger helps you see your daily income and expenses/i)).toBeInTheDocument()
    expect(screen.getByText(/Simple, safe, and made for women like you/i)).toBeInTheDocument()
  })

  it('renders call-to-action buttons', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Start for Free')).toBeInTheDocument()
    // Use getAllByText since there are multiple "See How It Works" buttons
    const seeHowButtons = screen.getAllByText('See How It Works')
    expect(seeHowButtons.length).toBeGreaterThan(0)
  })

  it('displays the free forever message', () => {
    render(<HomePage />)
    
    expect(screen.getByText('100% Free Forever • No payment needed')).toBeInTheDocument()
  })

  it('shows statistics section', () => {
    render(<HomePage />)
    
    expect(screen.getByText('10K+')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('$2M+')).toBeInTheDocument()
    expect(screen.getByText('Tracked')).toBeInTheDocument()
  })

  it('renders features section', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Everything you need to track your money')).toBeInTheDocument()
    expect(screen.getByText('Simple Money Tracking')).toBeInTheDocument()
    expect(screen.getByText('Daily Money Summary')).toBeInTheDocument()
    expect(screen.getByText('Your Money is Safe')).toBeInTheDocument()
  })

  it('displays testimonials', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Market Vendor')).toBeInTheDocument()
    expect(screen.getByText('Shop Owner')).toBeInTheDocument()
  })

  it('shows footer with correct copyright', () => {
    render(<HomePage />)
    
    // Check for the Sheeofoundation.org link instead of the full copyright text
    expect(screen.getByText('Sheeofoundation.org')).toBeInTheDocument()
    expect(screen.getByText('Sheeofoundation.org')).toHaveAttribute('href', 'https://sheeofoundation.org')
  })

  it('renders all major sections', () => {
    render(<HomePage />)
    
    expect(screen.getByTestId('navigation')).toBeInTheDocument()
    expect(screen.getByTestId('newsletter-signup')).toBeInTheDocument()
    expect(screen.getByTestId('faq')).toBeInTheDocument()
    expect(screen.getByTestId('contact-section')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<HomePage />)
    
    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toBeInTheDocument()
    
    // Check for proper link roles (since CTA buttons are actually links)
    const ctaLinks = screen.getAllByRole('link')
    expect(ctaLinks.length).toBeGreaterThan(0)
    
    // Check that the main CTA links have proper href attributes
    const startForFreeLink = screen.getByText('Start for Free')
    expect(startForFreeLink).toHaveAttribute('href', '/register')
  })
})
