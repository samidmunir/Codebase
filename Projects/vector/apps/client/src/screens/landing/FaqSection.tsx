import faq from './faq.json';

/** Questions people ask before they try Vector (also in the page's FAQ data for search engines). */
export function FaqSection() {
  return (
    <section className="landing-section landing-faq" aria-labelledby="faq-title">
      <p className="hero__eyebrow" data-reveal>
        Questions
      </p>
      <h2 id="faq-title" className="landing-section__title" data-reveal>
        Before you take the frequency
      </h2>
      <div className="landing-faq__list" data-reveal>
        {faq.map((item) => (
          <details key={item.question} className="landing-faq__item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
