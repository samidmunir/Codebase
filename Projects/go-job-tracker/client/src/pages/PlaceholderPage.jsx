export default function PlaceholderPage({ title, description }) {
  return (
    <section className="placeholder-page">
      <span>Coming soon</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
