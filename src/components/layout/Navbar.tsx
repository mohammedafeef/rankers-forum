'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
    user: any;
    loading: boolean;
    onLoginClick: () => void;
    onRegisterClick: () => void;
}

export function Navbar({ user, loading, onLoginClick, onRegisterClick }: NavbarProps) {
    const router = useRouter();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 h-20 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/">
                            <Image
                                src="/logoBlue.svg"
                                alt="Rankers Forum Logo"
                                width={160}
                                height={45}
                                className="object-contain w-[100px] h-[32px] md:w-[160px] md:h-[45px]"
                                priority
                            />
                        </Link>
                    </div>

                    <div className="flex items-center md:gap-4 gap-2">
                        <a
                            href="tel:+919876543210"
                            className="md:w-11 md:h-11 w-9 h-9 rounded-full bg-linear-to-br from-[#2F129B] to-[#3B82F6] flex items-center justify-center text-white shadow-md hover:opacity-90 transition-all active:scale-95"
                        >
                            <Phone className="md:w-5 md:h-5 w-3 h-3 fill-white" />
                        </a>

                        {loading ? null : user ? (
                            <Button
                                onClick={() => router.push('/student/info')}
                                className="rounded-full bg-linear-to-br from-[#2F129B] to-[#3B82F6] text-white px-8 py-6 text-lg font-medium hover:opacity-90 shadow-lg transition-all active:scale-95 flex items-center gap-2 border-0"
                            >
                                Dashboard <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button
                                onClick={onLoginClick}
                                className="rounded-full bg-linear-to-br from-[#2F129B]
                                 to-[#3B82F6] text-white px-8 py-1 md:py-6 lg:text-lg font-medium 
                                 hover:opacity-90 shadow-lg text-xs md:text-base transition-all active:scale-95 
                                 flex items-center gap-2 border-0 h-10"
                            >
                                Login
                                <ArrowRight className="md:w-5 md:h-5 w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
