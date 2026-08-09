import { ArrowUpRight, Clock3, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Service } from "../../types/service";

interface ServiceCardProps {
  service: Service;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  return (
    <article
      className="
        group relative flex h-full flex-col overflow-hidden
        rounded-3xl border border-black/10
        bg-white/70 shadow-sm backdrop-blur-xl
        transition-all duration-500
        hover:-translate-y-2 hover:shadow-2xl

        dark:border-white/10
        dark:bg-zinc-950/70
        dark:hover:shadow-rose-950/20
      "
    >
      {/* Image */}
      <div className="relative h-72 overflow-hidden">
        <img
          src={service.thumbnail}
          alt={service.name}
          className="
            h-full w-full object-cover
            transition-transform duration-700
            group-hover:scale-110
          "
        />

        {/* Image gradient */}
        <div
          className="
            absolute inset-0
            bg-linear-to-t
            from-black/80
            via-black/10
            to-transparent
          "
        />

        {/* Category */}
        <span
          className="
            absolute left-5 top-5
            rounded-full border border-white/20
            bg-black/30 px-4 py-2
            text-xs font-semibold uppercase
            tracking-[0.18em] text-white
            backdrop-blur-lg
          "
        >
          {service.category}
        </span>

        {/* Badges */}
        <div className="absolute right-5 top-5 flex flex-col items-end gap-2">
          {service.featured && (
            <span
              className="
                flex items-center gap-1.5
                rounded-full
                bg-sky-500 px-3 py-2
                text-xs font-semibold text-white
                shadow-lg

                dark:bg-rose-500
              "
            >
              <Sparkles size={14} />
              Featured
            </span>
          )}

          {service.popular && (
            <span
              className="
                flex items-center gap-1.5
                rounded-full
                border border-white/20
                bg-black/40 px-3 py-2
                text-xs font-medium text-white
                backdrop-blur-md
              "
            >
              <Star size={14} />
              Popular
            </span>
          )}
        </div>

        {/* Price */}
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-sm text-zinc-300">
            {service.priceType === "starting-at" ? "From" : "Pricing"}
          </p>

          <p className="mt-1 text-xl font-bold text-white">
            {service.priceLabel}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex-1">
          <h2
            className="
              text-2xl font-bold tracking-tight
              text-zinc-950 transition-colors
              duration-300
              group-hover:text-sky-500

              dark:text-white
              dark:group-hover:text-rose-500
            "
          >
            {service.name}
          </h2>

          <p
            className="
              mt-3 line-clamp-3
              leading-7 text-zinc-600

              dark:text-zinc-400
            "
          >
            {service.shortDescription}
          </p>

          {/* Meta */}
          <div
            className="
              mt-5 flex items-center gap-2
              text-sm text-zinc-500

              dark:text-zinc-400
            "
          >
            <Clock3 size={17} />

            <span>{service.estimatedDuration}</span>
          </div>

          {/* Tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {service.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="
                  rounded-full
                  bg-zinc-100 px-3 py-1.5
                  text-xs font-medium text-zinc-600

                  dark:bg-zinc-900
                  dark:text-zinc-400
                "
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/services/${service.slug}`}
          className="
            mt-7 flex items-center
            justify-between rounded-2xl
            border border-black/10
            bg-zinc-950 px-5 py-4
            font-semibold text-white
            transition-all duration-300
            hover:bg-sky-500

            dark:border-white/10
            dark:bg-white
            dark:text-zinc-950
            dark:hover:bg-rose-500
            dark:hover:text-white
          "
        >
          Explore Service
          <ArrowUpRight
            size={20}
            className="
              transition-transform duration-300
              group-hover:translate-x-1
              group-hover:-translate-y-1
            "
          />
        </Link>
      </div>
    </article>
  );
};

export default ServiceCard;
