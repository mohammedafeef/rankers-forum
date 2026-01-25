'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, GraduationCap, Building2, MapPin, Phone, Mail, BarChart3, ClipboardList, Users, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks';
import { LoginModal, RegisterModal, ForgotPasswordModal } from '@/components/modals';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const handleCheckColleges = () => {
    if (user) {
      router.push('/student/info');
    } else {
      setRegisterOpen(true);
    }
  };

  const faqs = [
    { question: 'Is the college prediction accurate?', answer: 'Our predictions are based on historical data and trends. While they provide a good estimate, actual cutoffs may vary.' },
    { question: 'Is this platform free to use?', answer: 'Yes, you can check your eligible colleges up to 2 times completely free.' },
    { question: 'What rank should I enter?', answer: 'Enter your NEET All India Rank (AIR) for the most accurate predictions.' },
    { question: 'Can I see colleges from previous years?', answer: 'Yes, after viewing your eligible colleges, you can access previous year data for comparison.' },
    { question: 'Will someone guide me if I\'m confused?', answer: 'Yes! You can request a callback and our counsellors will guide you through the process.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">
                Rankers<span className="text-indigo-600">Forum</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {loading ? null : user ? (
                <>
                  <Button variant="ghost" onClick={() => router.push('/student/info')}>
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setLoginOpen(true)}>
                    Login
                  </Button>
                  <Button onClick={() => setRegisterOpen(true)}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm text-indigo-700 font-medium">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                Built for medical aspirants
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Map Your Medical Career with{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Surgical Precision.
                </span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-xl">
                Cut through the noise of counselling choices. Our predictive engine analyzes every seat quota and 
                shortlists only the college you need to finalize your journey with total confidence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base h-14 px-8" onClick={handleCheckColleges}>
                  Check Your Colleges Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Trusted by</p>
                  <p className="font-semibold text-slate-900">5000+ students this year</p>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/50 to-violet-200/50 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
                <div className="aspect-square bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Your Medical Journey Starts Here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How it Works!</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Find your eligible medical colleges in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: ClipboardList,
                title: 'Enter Your Rank & Details',
                description: 'Input your NEET rank, category, domicile state, and course preferences to get started.',
                color: 'from-blue-500 to-indigo-600',
              },
              {
                step: '02',
                icon: Building2,
                title: 'Set Your Preferences',
                description: 'Choose your preferred branches, counselling type, and interested study locations.',
                color: 'from-indigo-500 to-violet-600',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'View Eligible Colleges Instantly',
                description: 'Get a curated list of colleges based on past trends with admission chance indicators.',
                color: 'from-violet-500 to-purple-600',
              },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-5xl font-bold text-slate-100 group-hover:text-indigo-100 transition-colors">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Get */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">What You'll Get</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Clear insights to help you make informed decisions after NEET results
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2, title: 'Eligible Colleges for Your Rank', description: 'See personalized college choices based on your NEET rank position.' },
              { icon: GraduationCap, title: 'All Types of Medical Colleges', description: 'Government, Private, and Deemed universities - all in one place.' },
              { icon: BarChart3, title: 'Current Year Predictions', description: 'Get predictions based on the latest counselling trends.' },
              { icon: ClipboardList, title: 'Previous Year College Lists', description: 'Compare with historical data from previous years.' },
              { icon: MapPin, title: 'State-wise Filtering', description: 'Filter colleges by state quota and location preferences.' },
              { icon: Users, title: 'Guidance When You Need It', description: 'Request callback support from our expert counsellors.' },
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Still confused about your options?
          </h2>
          <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">
            Get clarity on your medical college options based on your rank with guidance.
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-white text-indigo-600 border-white hover:bg-indigo-50 h-14 px-8 text-base"
            onClick={handleCheckColleges}
          >
            Request a Callback
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600">Answers to common questions from NEET aspirants</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                >
                  <span className="font-medium text-slate-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      activeAccordion === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeAccordion === index && (
                  <div className="px-5 pb-5 text-slate-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">RankersForum</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-sm">
                Helping medical aspirants find their dream colleges with accurate predictions and expert guidance.
              </p>
              <div className="flex gap-4">
                {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 bg-slate-600 rounded"></div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Navigation</h4>
              <ul className="space-y-3 text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact & Support</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +91 98765 43210
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@rankersforum.com
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} RankersForum. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onRegisterClick={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        onForgotPasswordClick={() => {
          setLoginOpen(false);
          setForgotPasswordOpen(true);
        }}
      />

      <RegisterModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onLoginClick={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />

      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onBackToLogin={() => {
          setForgotPasswordOpen(false);
          setLoginOpen(true);
        }}
      />
    </div>
  );
}
