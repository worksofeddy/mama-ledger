'use client'

import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "How secure is my financial data?",
    answer: "Your financial data is protected with bank-level security including end-to-end encryption, two-factor authentication, and GDPR compliance. We never share your personal information with third parties."
  },
  {
    question: "Can I use Mama Ledger for business accounting?",
    answer: "Yes! Our Business plan includes team collaboration features, advanced reporting, and API access perfect for small businesses and freelancers who need professional financial management."
  },
  {
    question: "Is there a mobile app available?",
    answer: "Currently, Mama Ledger is a responsive web application that works perfectly on all devices. We're developing native mobile apps for iOS and Android that will be available soon."
  },
  {
    question: "How does the free trial work?",
    answer: "Start with our 14-day free trial of the Pro plan. No credit card required. You can upgrade, downgrade, or cancel at any time. The Free plan is always available with basic features."
  },
  {
    question: "Can I export my data?",
    answer: "Absolutely! You can export your transactions, reports, and data in multiple formats including CSV, PDF, and Excel. Your data belongs to you and we make it easy to take it with you."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through Stripe, and you can change or cancel your subscription at any time."
  }
]

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <div className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about Mama Ledger
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {item.question}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    openItems.includes(index) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                className={`transition-all duration-300 ease-in-out ${
                  openItems.includes(index) 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                } overflow-hidden`}
              >
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Still have questions? We're here to help!
          </p>
          <a
            href="#contact"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Contact Support
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
