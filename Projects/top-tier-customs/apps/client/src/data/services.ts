import type { Service } from "../types/service";

export const services: Service[] = [
  {
    id: "service-001",

    slug: "ambient-lighting-installation",
    name: "Ambient Lighting Installation",

    shortDescription:
      "Transform your vehicle interior with professionally installed customizable ambient lighting.",

    category: "Lighting",

    tags: ["Ambient Lighting", "Interior", "LED", "Custom Lighting"],

    priceType: "starting-at",
    price: 249,
    priceLabel: "Starting from £249",

    estimatedDuration: "3–6 hours",

    thumbnail: "/assets/services/ambient-lighting/thumbnail.jpg",

    images: [
      "/assets/services/ambient-lighting/ambient-1.jpg",
      "/assets/services/ambient-lighting/ambient-2.jpg",
      "/assets/services/ambient-lighting/ambient-3.jpg",
    ],

    description:
      "Give your vehicle interior a premium, modern appearance with a professionally installed ambient lighting system. Our installations are carefully integrated into your vehicle's dashboard, door panels, centre console and other interior trim areas for a clean OEM-inspired finish.",

    features: [
      {
        id: "ambient-feature-001",
        title: "Multi-Colour Lighting",
        description:
          "Choose from a wide range of colours to match your interior or mood.",
      },
      {
        id: "ambient-feature-002",
        title: "App Control",
        description:
          "Control brightness, colours and lighting effects from your smartphone.",
      },
      {
        id: "ambient-feature-003",
        title: "OEM-Style Installation",
        description:
          "Wiring and lighting components are discreetly integrated into the vehicle.",
      },
    ],

    includes: [
      "Professional installation",
      "Ambient LED lighting kit",
      "Hidden wiring",
      "System configuration",
      "Functionality testing",
    ],

    faqs: [
      {
        id: "ambient-faq-001",
        question: "Can ambient lighting be installed in any vehicle?",
        answer:
          "Most vehicles can accommodate an ambient lighting installation, although available lighting locations can vary depending on the interior design.",
      },
      {
        id: "ambient-faq-002",
        question: "Can I change the lighting colours?",
        answer:
          "Yes. Depending on the selected kit, colours, brightness and lighting effects can be controlled through an app or dedicated controller.",
      },
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 1,
  },

  {
    id: "service-002",

    slug: "starlight-headliner-installation",
    name: "Starlight Headliner Installation",

    shortDescription:
      "Create a luxury Rolls-Royce-inspired cabin with hundreds of individually installed fibre-optic stars.",

    category: "Interior",

    tags: ["Starlight", "Headliner", "Interior", "Fibre Optic", "Luxury"],

    priceType: "starting-at",
    price: 499,
    priceLabel: "Starting from £499",

    estimatedDuration: "1–2 days",

    thumbnail: "/assets/services/starlight-headliner/thumbnail.jpg",

    images: [
      "/assets/services/starlight-headliner/starlight-1.jpg",
      "/assets/services/starlight-headliner/starlight-2.jpg",
      "/assets/services/starlight-headliner/starlight-3.jpg",
    ],

    description:
      "Upgrade your vehicle interior with a custom fibre-optic starlight headliner. Each installation is individually designed and carefully fitted into the existing or retrimmed roof liner to create a dramatic luxury atmosphere.",

    features: [
      {
        id: "starlight-feature-001",
        title: "Hundreds of Fibre Optic Stars",
        description:
          "Individual fibres create an authentic star-filled roof effect.",
      },
      {
        id: "starlight-feature-002",
        title: "Custom Star Density",
        description:
          "Choose the number and distribution of stars based on your desired appearance.",
      },
      {
        id: "starlight-feature-003",
        title: "Colour Control",
        description:
          "Compatible systems can offer colour changing and adjustable brightness.",
      },
      {
        id: "starlight-feature-004",
        title: "Shooting Star Effects",
        description:
          "Optional animated shooting-star effects can be added to selected installations.",
      },
    ],

    includes: [
      "Headliner removal",
      "Fibre-optic installation",
      "Lighting module installation",
      "Hidden electrical wiring",
      "Headliner refitting",
      "Final system testing",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 2,
  },

  {
    id: "service-003",

    slug: "window-tinting",
    name: "Window Tinting",

    shortDescription:
      "Premium automotive window tinting for enhanced appearance, privacy and cabin comfort.",

    category: "Styling",

    tags: ["Tint", "Windows", "Privacy", "Styling", "Protection"],

    priceType: "starting-at",
    price: 149,
    priceLabel: "Starting from £149",

    estimatedDuration: "2–4 hours",

    thumbnail: "/assets/services/window-tinting/thumbnail.jpg",

    images: [
      "/assets/services/window-tinting/tint-1.jpg",
      "/assets/services/window-tinting/tint-2.jpg",
      "/assets/services/window-tinting/tint-3.jpg",
    ],

    description:
      "Enhance your vehicle's appearance while improving privacy and reducing interior heat with professionally installed automotive window film.",

    features: [
      {
        id: "tint-feature-001",
        title: "Professional Film Installation",
      },
      {
        id: "tint-feature-002",
        title: "Multiple Tint Shades",
      },
      {
        id: "tint-feature-003",
        title: "UV Protection",
      },
      {
        id: "tint-feature-004",
        title: "Reduced Interior Glare",
      },
    ],

    includes: [
      "Window preparation",
      "Professional tint application",
      "Edge finishing",
      "Quality inspection",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 3,
  },

  {
    id: "service-004",

    slug: "reverse-camera-installation",
    name: "Reverse Camera Installation",

    shortDescription:
      "Improve parking visibility and confidence with a professionally integrated reversing camera.",

    category: "Electronics",

    tags: ["Reverse Camera", "Parking", "Electronics", "Safety", "Camera"],

    priceType: "starting-at",
    price: 199,
    priceLabel: "Starting from £199",

    estimatedDuration: "2–4 hours",

    thumbnail: "/assets/services/reverse-camera/thumbnail.jpg",

    images: [
      "/assets/services/reverse-camera/reverse-camera-1.jpg",
      "/assets/services/reverse-camera/reverse-camera-2.jpg",
    ],

    description:
      "Our reverse camera installations provide improved rear visibility while maintaining a clean, factory-style finish. Depending on your vehicle, the camera can integrate with an existing infotainment display or an aftermarket screen.",

    features: [
      {
        id: "camera-feature-001",
        title: "Wide-Angle Rear View",
      },
      {
        id: "camera-feature-002",
        title: "OEM-Style Integration",
      },
      {
        id: "camera-feature-003",
        title: "Automatic Reverse Activation",
      },
      {
        id: "camera-feature-004",
        title: "Hidden Wiring",
      },
    ],

    includes: [
      "Camera installation",
      "Electrical wiring",
      "Display integration",
      "Reverse signal configuration",
      "System testing",
    ],

    featured: false,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 4,
  },

  {
    id: "service-005",

    slug: "air-conditioning-recharge",
    name: "Air Conditioning Recharge",

    shortDescription:
      "Restore your vehicle's air-conditioning performance with a professional refrigerant recharge.",

    category: "Climate",

    tags: ["Air Conditioning", "AC", "Recharge", "Climate", "Maintenance"],

    priceType: "starting-at",
    price: 79,
    priceLabel: "Starting from £79",

    estimatedDuration: "45–90 minutes",

    thumbnail: "/assets/services/ac-recharge/thumbnail.jpg",

    images: [
      "/assets/services/ac-recharge/ac-1.jpg",
      "/assets/services/ac-recharge/ac-2.jpg",
    ],

    description:
      "If your vehicle's air conditioning is no longer producing sufficiently cold air, an AC recharge can help restore system performance. Our service includes refrigerant replacement and basic system checks.",

    features: [
      {
        id: "ac-feature-001",
        title: "Refrigerant Recharge",
      },
      {
        id: "ac-feature-002",
        title: "System Pressure Check",
      },
      {
        id: "ac-feature-003",
        title: "Cooling Performance Test",
      },
    ],

    includes: [
      "Initial AC inspection",
      "Refrigerant recharge",
      "Pressure verification",
      "Temperature performance test",
    ],

    featured: false,
    popular: false,
    bookable: true,
    active: true,

    displayOrder: 5,
  },

  {
    id: "service-006",

    slug: "custom-aero-installation",
    name: "Custom Aero Installation",

    shortDescription:
      "Professionally install splitters, diffusers, spoilers, wings and other exterior aerodynamic components.",

    category: "Exterior",

    tags: ["Aero", "Splitter", "Diffuser", "Spoiler", "Wing", "Exterior"],

    priceType: "estimate",
    priceLabel: "Request an estimate",

    estimatedDuration: "2 hours – 1 day",

    thumbnail: "/assets/services/custom-aero/thumbnail.jpg",

    images: [
      "/assets/services/custom-aero/aero-1.jpg",
      "/assets/services/custom-aero/aero-2.jpg",
      "/assets/services/custom-aero/aero-3.jpg",
    ],

    description:
      "Upgrade your vehicle's exterior with professionally installed aerodynamic components. Whether you're fitting a front splitter, rear diffuser, spoiler or full aero package, we focus on accurate alignment and a clean finished appearance.",

    features: [
      {
        id: "aero-feature-001",
        title: "Front Splitter Installation",
      },
      {
        id: "aero-feature-002",
        title: "Rear Diffuser Installation",
      },
      {
        id: "aero-feature-003",
        title: "Spoiler & Wing Installation",
      },
      {
        id: "aero-feature-004",
        title: "Side Skirt Installation",
      },
    ],

    includes: [
      "Component inspection",
      "Vehicle preparation",
      "Alignment and fitment",
      "Professional mounting",
      "Final fitment inspection",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 6,
  },
];
