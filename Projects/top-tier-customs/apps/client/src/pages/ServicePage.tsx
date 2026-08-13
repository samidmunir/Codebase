import type { Service } from "../types/service";

interface ServicePageProps {
  service: Service;
}

const ServicePage = ({ service }: ServicePageProps) => {
  return (
    <main>
      <header>
        <h1>{service.name}</h1>
        <p>{service.shortDescription}</p>
      </header>
      <section>
        {/* image(s) container*/}
        <div></div>
        <div>
          <h2>{service.category}</h2>
          <div>
            {service.tags.map((tag) => (
              <p>{tag}</p>
            ))}
          </div>
          <div>
            <p>{service.description}</p>
          </div>
        </div>
      </section>
      <div>{/* FAQ section here... */}</div>
    </main>
  );
};

export default ServicePage;
