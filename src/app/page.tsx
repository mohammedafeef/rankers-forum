'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, MapPin, Phone, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks';
import { Navbar, Footer } from '@/components/layout';
import { FAQ } from '@/components/home/FAQ';
import { CTA } from '@/components/home/CTA';
import { Features } from '@/components/home/Features';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Hero } from '@/components/home/Hero';
import { LoginModal, RegisterModal, ForgotPasswordModal } from '@/components/modals';


export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleCheckColleges = () => {
    if (user) {
      router.push('/student/info');
    } else {
      setRegisterOpen(true);
    }
  };


  return (
    <div className="min-h-screen bg-white">
      <Navbar
        user={user}
        loading={loading}
        onLoginClick={() => setLoginOpen(true)}
        onRegisterClick={() => setRegisterOpen(true)}
      />

      {/* Hero Section */}
      <Hero onCheckColleges={handleCheckColleges} />

      <HowItWorks />

      <Features />

      <CTA onAction={handleCheckColleges} />

      <FAQ />

      {/* Footer */}
      <Footer />


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
