// Animations-Setup: Lenis (Smooth Scroll) + GSAP.
// Hero-Intro mit SplitText-Buchstaben-Pop, Parallax, Float-/Wiggle-Loops,
// orchestrierte Termin-Sequenz, generische Scroll-Reveals.
// Respektiert prefers-reduced-motion vollständig (dann: alles statisch).

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const isDesktop = window.matchMedia('(min-width: 900px)').matches;

  // ── Smooth Scroll ──────────────────────────────────────────────
  const lenis = new Lenis({ lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anker-Links über Lenis scrollen (statt hartem Sprung)
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector<HTMLElement>(
        a.getAttribute('href') ?? ''
      );
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -12 });
    });
  });

  // ── Hero-Intro ─────────────────────────────────────────────────
  // "ROGER G." poppt Buchstabe für Buchstabe rein wie aufgeklebte Sticker.
  // A11y: statt SplitTexts aria-label (auf <span> verboten) bekommt der
  // Screenreader eine sr-only-Kopie, die Buchstaben-Spans werden versteckt.
  const nameEl = document.querySelector<HTMLElement>('[data-hero="name"]');
  const split = new SplitText(nameEl, { type: 'chars', aria: 'none' });
  if (nameEl) {
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = nameEl.textContent;
    nameEl.setAttribute('aria-hidden', 'true');
    nameEl.before(sr);
  }

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .from('[data-hero="kicker"]', { y: -22, autoAlpha: 0, duration: 0.45 })
    .from(
      split.chars,
      {
        yPercent: 55,
        scale: 0.3,
        rotation: () => gsap.utils.random(-22, 22),
        autoAlpha: 0,
        duration: 0.65,
        ease: 'back.out(1.9)',
        stagger: 0.055,
      },
      '-=0.15'
    )
    .from('[data-hero="line"]', { y: 26, autoAlpha: 0, duration: 0.5 }, '-=0.3')
    .from('[data-hero="sub"]', { y: 20, autoAlpha: 0, duration: 0.45 }, '-=0.25')
    .from(
      '[data-hero="cta"] > a',
      { y: 18, autoAlpha: 0, duration: 0.4, stagger: 0.08 },
      '-=0.25'
    )
    .from('[data-hero="next"]', { autoAlpha: 0, duration: 0.4 }, '-=0.15')
    // Sticker knallt wie ein Stempel drauf
    .from(
      '[data-hero="sticker"]',
      {
        scale: 2.4,
        rotation: 45,
        autoAlpha: 0,
        duration: 0.4,
        ease: 'back.in(1.7)',
      },
      '-=0.2'
    )
    .from(
      '.hero-star',
      { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.5)', stagger: 0.08 },
      '<'
    );

  // Plakatmotiv: Desktop schwebt rein, mobil sanfter Ken-Burns-Zoom.
  // Bewusst OHNE Alpha, damit das LCP-Bild nie versteckt wird.
  if (isDesktop) {
    intro.from(
      '[data-hero="stage"]',
      { y: 54, rotate: 7, duration: 0.8, ease: 'back.out(1.2)' },
      0.3
    );
  } else {
    intro.from(
      '[data-hero="media"] img',
      { scale: 1.14, duration: 1.6, ease: 'power2.out' },
      0
    );
  }

  // ── Dauer-Loops (dezent, nach dem Intro) ───────────────────────
  if (isDesktop) {
    gsap.to('[data-hero="stage"]', {
      y: 12,
      duration: 2.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 1.4,
    });
  }
  gsap.to('[data-hero="sticker"]', {
    rotation: '+=5',
    duration: 1.9,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
    delay: 1.6,
  });
  gsap.utils.toArray<HTMLElement>('.hero-star').forEach((el, i) => {
    gsap.to(el, {
      scale: 0.7,
      opacity: 0.55,
      duration: 1.2 + i * 0.3,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 1.2 + i * 0.4,
    });
  });

  // ── Hero-Parallax beim Wegscrollen ─────────────────────────────
  const heroScrub = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
  heroScrub.to('.hero-inner', { yPercent: -12, autoAlpha: 0.25 }, 0);
  if (isDesktop) {
    heroScrub.to('[data-hero="stage"]', { yPercent: 10, rotate: 4.5 }, 0);
  } else {
    heroScrub.to('[data-hero="media"] img', { yPercent: -6 }, 0);
  }

  // ── Termin-Sektion: EINE orchestrierte Scroll-Sequenz ──────────
  // Headline zieht auf, Reihen kaskadieren, die Bubble-Daten "stempeln" nach.
  if (document.querySelector('#termine')) {
    const datesTl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '#termine', start: 'top 75%' },
    });
    datesTl
      .from('#termine .section-title', { y: 40, autoAlpha: 0, duration: 0.5 })
      .from('#termine .annotation', { x: -18, autoAlpha: 0, duration: 0.4 }, '-=0.25')
      .from(
        '#termine .date-row',
        { y: 36, autoAlpha: 0, duration: 0.55, stagger: 0.09 },
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

    // Watermark "26" wandert langsam mit dem Scroll
    gsap.to('.dates-watermark', {
      yPercent: 24,
      ease: 'none',
      scrollTrigger: {
        trigger: '#termine',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // ── Generische Scroll-Reveals ──────────────────────────────────
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}
