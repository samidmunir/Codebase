export type ServiceCategory =
  | "Lighting"
  | "Interior"
  | "Electronics"
  | "Climate"
  | "Exterior"
  | "Styling"
  | "Protection";

export type ServicePriceType = "fixed" | "starting-at" | "estimate" | "contact";

export interface ServiceFeature {
  id: string;
  title: string;
  description?: string;
}

export interface ServiceFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Service {
  id: string;

  // Routing / identification
  slug: string;
  name: string;

  // Card content
  shortDescription: string;
  category: ServiceCategory;
  tags: string[];

  // Pricing
  priceType: ServicePriceType;
  price?: number;
  priceLabel: string;

  // Time
  estimatedDuration: string;

  // Media
  thumbnail: string;
  images: string[];

  // Service page content
  description: string;
  features: ServiceFeature[];
  includes: string[];
  faqs?: ServiceFAQ[];

  // UI / business logic
  featured: boolean;
  popular: boolean;
  bookable: boolean;
  active: boolean;

  // Sorting
  displayOrder: number;
}
