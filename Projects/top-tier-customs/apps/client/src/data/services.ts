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

    thumbnail: "../assets/services/ambient-lighting/thumbnail.jpg",

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
  {
    id: "service-007",

    slug: "ghost-immobiliser-installation",

    name: "Ghost Immobiliser Installation",

    shortDescription:
      "Protect your vehicle from theft with a discreet CAN-bus immobiliser requiring a personalised PIN sequence before the engine can start.",

    category: "Security",

    tags: ["Ghost", "Immobiliser", "Security", "CAN Bus", "Anti Theft"],

    priceType: "starting-at",
    price: 399,
    priceLabel: "Starting from £399",

    estimatedDuration: "3–5 hours",

    thumbnail: "/assets/services/ghost-immobiliser/thumbnail.png",

    images: [
      "/assets/services/ghost-immobiliser/aero-1.jpg",
      "/assets/services/ghost-immobiliser/aero-2.jpg",
      "/assets/services/ghost-immobiliser/aero-3.jpg",
    ],

    description:
      "Enhance your vehicle's security with a professionally installed Ghost Immobiliser. Unlike traditional alarm systems, the Ghost communicates directly with your vehicle's CAN bus and prevents the engine from starting until the correct PIN sequence is entered using existing steering wheel or dashboard controls.",

    features: [
      {
        id: "ghost-feature-001",
        title: "No Visible Keypads",
      },
      {
        id: "ghost-feature-002",
        title: "CAN Bus Technology",
      },
      {
        id: "ghost-feature-003",
        title: "Anti Theft Protection",
      },
      {
        id: "ghost-feature-004",
        title: "Valet / Service Mode",
      },
    ],

    includes: [
      "Professional installation",
      "System configuration",
      "PIN programming",
      "Demonstration",
      "Vehicle testing",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 7,
  },
  {
    id: "service-008",

    slug: "apple-carplay-android-auto-installation",

    name: "Apple CarPlay & Android Auto Installation",

    shortDescription:
      "Upgrade your infotainment system with seamless Apple CarPlay and Android Auto integration.",

    category: "Electronics",

    tags: [
      "Apple CarPlay",
      "Android Auto",
      "Infotainment",
      "Navigation",
      "Touchscreen",
    ],

    priceType: "starting-at",
    price: 299,
    priceLabel: "Starting from £299",

    estimatedDuration: "2–5 hours",

    thumbnail: "/assets/services/car-play/thumbnail.jpg",

    images: [
      "/assets/services/car-play/aero-1.jpg",
      "/assets/services/car-play/aero-2.jpg",
      "/assets/services/car-play/aero-3.jpg",
    ],

    description:
      "Bring modern smartphone connectivity to your vehicle with Apple CarPlay or Android Auto. We professionally integrate compatible modules or replacement displays while maintaining a clean OEM appearance.",

    features: [
      {
        id: "carplay-feature-001",
        title: "Wireless CarPlay",
      },
      {
        id: "carplay-feature-002",
        title: "Android Auto",
      },
      {
        id: "carplay-feature-003",
        title: "Navigation Integration",
      },
      {
        id: "carplay-feature-004",
        title: "Steering Wheel Controls",
      },
    ],

    includes: [
      "Professional installation",
      "Module integration",
      "Vehicle coding",
      "Functionality testing",
      "Customer walkthrough",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 8,
  },
  {
    id: "service-009",

    slug: "custom-number-plates",

    name: "Custom Number Plates",

    shortDescription:
      "Finish your vehicle's appearance with premium custom registration plates manufactured and fitted professionally.",

    category: "Styling",

    tags: [
      "Number Plates",
      "Registration",
      "4D Plates",
      "Gel Plates",
      "Styling",
    ],

    priceType: "starting-at",
    price: 39,
    priceLabel: "Starting from £39",

    estimatedDuration: "30–60 minutes",

    thumbnail: "/assets/services/number-plates/thumbnail.jpg",

    images: [
      "/assets/services/number-plates/aero-1.jpg",
      "/assets/services/number-plates/aero-2.jpg",
      "/assets/services/number-plates/aero-3.jpg",
    ],

    description:
      "Choose from premium acrylic, gel or 4D number plates to complement your vehicle's styling. Professionally manufactured and installed with careful attention to alignment and finish.",

    features: [
      {
        id: "plate-feature-001",
        title: "4D Number Plates",
      },
      {
        id: "plate-feature-002",
        title: "Gel Plates",
      },
      {
        id: "plate-feature-003",
        title: "Premium Acrylic",
      },
      {
        id: "plate-feature-004",
        title: "Professional Fitment",
      },
    ],

    includes: [
      "Plate production",
      "Professional installation",
      "Alignment",
      "Quality inspection",
    ],

    featured: false,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 9,
  },
  {
    id: "service-010",

    slug: "custom-steering-wheel-installation",

    name: "Custom Steering Wheel Installation",

    shortDescription:
      "Upgrade your driving experience with a bespoke steering wheel featuring premium materials and performance-inspired styling.",

    category: "Interior",

    tags: [
      "Steering Wheel",
      "Carbon Fibre",
      "Alcantara",
      "Leather",
      "Interior",
    ],

    priceType: "starting-at",
    price: 499,
    priceLabel: "Starting from £499",

    estimatedDuration: "2–4 hours",

    thumbnail: "/assets/services/steering-wheel/thumbnail.jpg",

    images: [
      "/assets/services/steering-wheel/aero-1.jpg",
      "/assets/services/steering-wheel/aero-2.jpg",
      "/assets/services/steering-wheel/aero-3.jpg",
    ],

    description:
      "Personalise your vehicle with a custom steering wheel tailored to your style. From carbon fibre and Alcantara to premium leather and custom stitching, every installation is completed with precision for an OEM-quality finish.",

    features: [
      {
        id: "wheel-feature-001",
        title: "Carbon Fibre Options",
      },
      {
        id: "wheel-feature-002",
        title: "Premium Leather & Alcantara",
      },
      {
        id: "wheel-feature-003",
        title: "Custom Stitching",
      },
      {
        id: "wheel-feature-004",
        title: "OEM Fit & Finish",
      },
    ],

    includes: [
      "Professional fitment",
      "Airbag transfer",
      "Control integration",
      "Safety inspection",
      "Final testing",
    ],

    featured: true,
    popular: true,
    bookable: true,
    active: true,

    displayOrder: 10,
  },
];
