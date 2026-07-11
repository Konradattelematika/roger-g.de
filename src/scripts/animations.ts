// Animations-Setup: Lenis (Smooth Scroll) + GSAP (Hero-Sequenz, Scroll-Reveals).
// Respektiert prefers-reduced-motion vollständig.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  // Smooth Scroll
  const lenis = new Lenis({ lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Hero-Load-Sequenz
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('[data-hero="kicker"]', { y: 20, opacity: 0, duration: 0.5 })
    .from(
      '[data-hero="line"]',
      { y: 60, opacity: 0, duration: 0.7, stagger: 0.12 },
      '-=0.2'
    )
    .from('[data-hero="sub"]', { y: 24, opacity: 0, duration: 0.5 }, '-=0.35')
    .from('[data-hero="cta"]', { y: 16, opacity: 0, duration: 0.4 }, '-=0.25')
    .from(
      '[data-hero="poster"]',
      { y: 40, opacity: 0, rotate: 6, duration: 0.6, ease: 'back.out(1.4)' },
      '-=0.3'
    )
    .from(
      '[data-hero="stamp"]',
      { scale: 2.4, opacity: 0, rotate: 25, duration: 0.35, ease: 'power4.in' },
      '-=0.1'
    );

  // Termin-Sektion: EINE orchestrierte Scroll-Sequenz (statt Einzel-Reveals) –
  // Headline zieht auf, Reihen kaskadieren, die Bubble-Daten "stempeln" nach.
  if (document.querySelector('#termine')) {
    const datesTl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '#termine', start: 'top 75%' },
    });
    datesTl
      .from('#termine .section-title', { y: 40, opacity: 0, duration: 0.5 })
      .from(
        '#termine .date-row',
        { y: 36, opacity: 0, duration: 0.55, stagger: 0.09 },
        '-=0.15'
      )
      .from(
        '#termine .date-big',
        {
          scale: 0.55,
          rotate: -6,
          transformOrigin: 'left center',
          ease: 'back.out(2)',
          duration: 0.45,
          stagger: 0.09,
        },
        '<0.12'
      );
  }

  // Scroll-Reveals für alle Elemente mit data-reveal
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}
