'use client';

import { ListChecks, Building2, Calendar, FileClock, MapPin, Headset } from 'lucide-react';

const features = [
    {
        icon: ListChecks,
        title: 'Eligible Colleges for Your Rank',
        description: 'Get a list of medical colleges where you have a chance based on your NEET rank and details.',
    },
    {
        icon: Building2,
        title: 'All Types of Medical Colleges',
        description: 'View government, private, and deemed medical colleges in one place.',
    },
    {
        icon: Calendar,
        title: 'Current Year Predictions',
        description: 'See colleges you may get this year based on historical cut-off trends.',
    },
    {
        icon: FileClock,
        title: 'Previous Year College Lists',
        description: 'Compare with colleges you could have got in previous years for the same rank.',
    },
    {
        icon: MapPin,
        title: 'State-wise Filtering',
        description: 'Filter colleges by state to explore options based on location preference.',
    },
    {
        icon: Headset,
        title: 'Guidance When You Need It',
        description: 'Request a callback and get guidance if you\'re unsure about your options.',
    },
];

export function Features() {
    return (
        <section className="py-6 md:py-24 bg-[#F9FAFB] font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-6 md:mb-16">
                    <h2 className="text-3xl sm:text-5xl font-bold text-[#2D119A] mb-6">What You&apos;ll Get</h2>
                    <p className="text-slate-600 text-sm md:text-lg max-w-2xl mx-auto">
                        Clear insights to help you make informed decisions after NEET results.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 md:gap-8 gap-4 max-w-6xl mx-auto">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl md:p-8 p-6 shadow-sm border-b-4 border-[#3B82F6] hover:shadow-md transition-shadow group"
                        >
                            <div className="flex gap-4 items-start">
                                <div className="shrink-0 p-1">
                                    <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-[#2D119A]" />
                                </div>
                                <div>
                                    <h3 className=" text-base md:text-xl font-semibold text-slate-900 mb-2 group-hover:text-[#2D119A] transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-600 text-xs md:text-base leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
