import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadApp() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
              Get the ZeroBroker App
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Search properties, schedule visits, and connect with owners on the go. 
              Download our app for a seamless experience.
            </p>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-foreground text-background px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                  <path d="M17.5 12.5c0-1.58-.79-2.98-2-3.82l-.01-.01-.02-.02c-.07-.05-.15-.09-.22-.14-.08-.05-.15-.1-.23-.15l-.02-.01c-.15-.09-.3-.17-.46-.25l-.03-.01c-.15-.07-.31-.13-.47-.19l-.04-.02c-.16-.05-.32-.1-.49-.14l-.04-.01c-.17-.04-.34-.07-.51-.09h-.04c-.18-.02-.36-.03-.54-.03s-.36.01-.54.03h-.04c-.17.02-.34.05-.51.09l-.04.01c-.17.04-.33.09-.49.14l-.04.02c-.16.06-.32.12-.47.19l-.03.01c-.16.08-.31.16-.46.25l-.02.01c-.08.05-.15.1-.23.15-.07.05-.15.09-.22.14l-.02.02-.01.01c-1.21.84-2 2.24-2 3.82 0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-80">Download on the</p>
                  <p className="text-lg font-semibold -mt-1">App Store</p>
                </div>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-foreground text-background px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-80">Get it on</p>
                  <p className="text-lg font-semibold -mt-1">Google Play</p>
                </div>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10">
              <div>
                <p className="text-3xl font-bold text-foreground">4.5★</p>
                <p className="text-sm text-muted-foreground">App Rating</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">10M+</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-72 h-[580px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-6 py-4 pt-12">
                    <p className="text-lg font-semibold">Find Properties</p>
                    <p className="text-sm opacity-80">in Bangalore</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-xl p-3 border border-border">
                        <div className="flex gap-3">
                          <div className="w-20 h-16 bg-muted rounded-lg" />
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-2 bg-muted rounded w-1/2 mb-2" />
                            <div className="h-4 bg-accent/20 rounded w-16" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                className="absolute -top-6 -right-6 bg-success text-success-foreground px-4 py-2 rounded-full shadow-lg"
              >
                <span className="text-sm font-medium">50L+ Users</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
