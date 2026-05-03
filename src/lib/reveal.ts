// Vanilla IntersectionObserver replacement for the React `Reveal` hook in
// homepage-a.html. Targets every element with [data-reveal]; once intersected,
// adds .is-visible and stops watching that element (one-shot).

export function initReveal(): void {
  if (typeof window === 'undefined') return;

  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!els.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Mirror prototype: trigger when element top is within vh * 0.92 of viewport.
  // rootMargin bottom of -8% achieves the same effect via IntersectionObserver.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.01, rootMargin: '0px 0px -8% 0px' }
  );

  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
      el.classList.add('is-visible');
    } else {
      io.observe(el);
    }
  });
}
