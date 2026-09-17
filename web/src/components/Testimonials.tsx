"use client";

import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';
import Image from 'next/image';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Parent',
      image: 'https://images.unsplash.com/photo-1758685848226-eedca8f6bce7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHRlYWNoZXIlMjBzbWlsaW5nfGVufDF8fHx8MTc3NzMxMTI5M3ww&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: "MiTutora transformed my daughter's learning experience. Her grades improved dramatically, and she's now confident in Math. The tutors are highly professional and caring.",
    },
    {
      name: 'Rahul Verma',
      role: 'Student - JEE Aspirant',
      image: 'https://images.unsplash.com/photo-1659080925920-1683d25f772a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBzdHVkZW50JTIwc3VjY2VzcyUyMGdyYWR1YXRpb258ZW58MXx8fHwxNzc3MzExMjkzfDA&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: 'The NEET coaching at MiTutora helped me crack the exam with flying colors. The personalized attention and study materials were exceptional. Highly recommended!',
    },
    {
      name: 'Anjali Patel',
      role: 'Parent',
      image: 'https://images.unsplash.com/photo-1758270705172-07b53627dfcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwc3R1ZGVudHMlMjBncm91cCUyMHN0dWR5aW5nJTIwdG9nZXRoZXJ8ZW58MXx8fHwxNzc3MzExMjkzfDA&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: "Excellent service! My son's coding skills have improved tremendously. The online classes are interactive and the tutors make learning fun and engaging.",
    },
    {
      name: 'Vikram Singh',
      role: 'Tutor',
      image: 'https://images.unsplash.com/photo-1758612215020-842383aadb9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBsZWFybmluZyUyMHN0dWRlbnQlMjBsYXB0b3AlMjBzdHVkeXxlbnwxfHx8fDE3NzczMTEyOTJ8MA&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: 'As a tutor with MiTutora, I love the flexibility and support. The platform makes it easy to connect with students and the payment process is seamless.',
    },
    {
      name: 'Meera Krishnan',
      role: 'Parent',
      image: 'https://images.unsplash.com/photo-1758687126445-98edd4b15ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGVhcm5pbmclMjB0dXRvciUyMHRlYWNoaW5nJTIwcHJlbWl1bSUyMGVkdWNhdGlvbnxlbnwxfHx8fDE3NzczMTEyOTF8MA&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: 'Best decision we made for our child\'s education. The home tuition service is top-notch and very affordable. Thank you, MiTutora!',
    },
    {
      name: 'Arjun Mehta',
      role: 'Student - Class 12',
      image: 'https://images.unsplash.com/photo-1776178320111-a03c1ce2212e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB0ZWFjaGVyJTIwbWVudG9yaW5nJTIwc3R1ZGVudCUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3NzczMTEyOTJ8MA&ixlib=rb-4.1.0&q=80&w=400',
      rating: 5,
      text: 'MiTutora helped me ace my board exams! The tutors are knowledgeable and explain concepts in a way that\'s easy to understand. Five stars!',
    },
  ];

  return (
    <section id="testimonials" className="relative py-24 bg-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            What Our Students Say
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-medium">
            Real stories from real people who transformed their learning journey
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative"
            >
              <div className="relative h-full bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-300">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-full flex items-center justify-center">
                  <Quote className="w-6 h-6 text-emerald-500" />
                </div>

                {/* Rating */}
                <div className="flex space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-slate-600 leading-relaxed mb-6">
                  "{testimonial.text}"
                </p>

                {/* Author info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-500/20">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>

                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent rounded-2xl transition-all duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
