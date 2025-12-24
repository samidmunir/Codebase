// import { Link } from "react-router-dom";
// import { useTheme } from "../../contexts/Theme";
// import {
//   ArrowRight,
//   Atom,
//   Bolt,
//   Check,
//   Crown,
//   Dot,
//   ShieldCheck,
//   Wrench,
// } from "lucide-react";

// const Trust = () => {
//   const { theme } = useTheme();
//   const isDark = theme === "dark";

//   return (
//     <main
//       className={`w-full min-h-screen px-8 transition-all duration-3000 ${
//         isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950"
//       }`}
//     >
//       {/* Header */}
//       <header
//         className={`flex items-end justify-between py-4 border-b-3 border-zinc-900`}
//       >
//         {/* Header-left */}
//         <div className="w-4xl space-y-4 py-4">
//           {/* Header tags */}
//           <div className="font-medium uppercase flex items-center gap-4">
//             <p
//               className={`flex items-center border justify-center rounded-full px-3 py-2`}
//             >
//               <Dot className="text-rose-500" />
//               Precision
//             </p>
//             <p
//               className={`flex items-center border justify-center rounded-full px-3 py-2`}
//             >
//               <Dot className="text-sky-500" />
//               Protection
//             </p>
//             <p
//               className={`flex items-center border justify-center rounded-full px-3 py-2`}
//             >
//               <Dot className="text-emerald-500" />
//               Performance
//             </p>
//           </div>
//           <h1 className={`text-6xl font-bold uppercase`}>
//             Why are we <span>Top Tier?</span>
//           </h1>
//           <p className={`text-xl`}>
//             It's not hype - it's process. Premium craftsmanship, transparent
//             service, and a quality-first workflow so your build looks insane and
//             performs even better.
//           </p>
//         </div>
//         {/* Header-right */}
//         <div className={`grid grid-cols-2 grid-rows-2 gap-4`}>
//           <div className={`border-3 border-zinc-900 rounded-xl p-6 space-y-2`}>
//             <h1 className={`text-3xl font-semibold`}>Top-tier QA</h1>
//             <p className={`text-lg font-medium text-zinc-300`}>
//               Every install verified
//             </p>
//             <p className="flex items-center text-md text-zinc-500">
//               Final checks <Dot /> clean finishing
//             </p>
//           </div>
//           <div className={`border-3 border-zinc-900 rounded-xl p-6 space-y-2`}>
//             <h1 className={`text-3xl font-semibold`}>Fast turnaround</h1>
//             <p className={`text-lg font-medium text-zinc-300`}>
//               Efficient scheduling
//             </p>
//             <p className="text-md text-zinc-500">
//               Less downtimes, more drive time
//             </p>
//           </div>
//           <div className={`border-3 border-zinc-900 rounded-xl p-6 space-y-2`}>
//             <h1 className={`text-3xl font-semibold`}>Premium parts</h1>
//             <p className={`text-lg font-medium text-zinc-300`}>
//               Curated components
//             </p>
//             <p className="text-md text-zinc-500">
//               Only what we'd run ourselves
//             </p>
//           </div>
//           <div className={`border-3 border-zinc-900 rounded-xl p-6 space-y-2`}>
//             <h1 className={`text-3xl font-semibold`}>Clear comms</h1>
//             <p className={`text-lg font-medium text-zinc-300`}>No ghosting</p>
//             <p className="text-md text-zinc-500">
//               Updates, walkthroughs, receipts
//             </p>
//           </div>
//         </div>
//       </header>
//       {/* Main */}
//       <section className={`w-full flex py-4 gap-4`}>
//         {/* Main-left */}
//         <div
//           className={`w-5xl border-3 p-4 rounded-xl space-y-4 transition-all duration-1000 ${
//             isDark ? "border-zinc-900" : "border-zinc-100"
//           }`}
//         >
//           {/* Main-left-header */}
//           <div className="flex items-center justify-between">
//             <h1 className={`flex items-center gap-2 font-bold text-xl`}>
//               <Atom
//                 className={`transition-all duration-1000 ${
//                   isDark ? "text-rose-500" : "text-sky-500"
//                 }`}
//               />{" "}
//               Top-tier pillars
//             </h1>
//             <p
//               className={`text-lg transition-all duration-1000 ${
//                 isDark ? "text-rose-500" : "text-sky-500"
//               }`}
//             >
//               Four reasons to upgrade with TTC
//             </p>
//           </div>
//           {/* Main-left-content */}
//           <div className={`grid grid-cols-2 grid-rows-2 gap-4`}>
//             {/* Box 1 */}
//             <div
//               className={`border-3 rounded-xl p-4 transition-all duration-1000 ${
//                 isDark ? "border-zinc-900" : "border-zinc-100"
//               }`}
//             >
//               <div className="flex gap-4">
//                 <Crown className={`w-14 h-14 border rounded-full`} />
//                 <div>
//                   <h1 className={`text-2xl font-bold`}>
//                     Premium craftsmanship
//                   </h1>
//                   <p className={`text-md`}>
//                     Every build is treated like a flagship. Fitment, finish, and
//                     function are dialed until it's perfect.
//                   </p>
//                 </div>
//               </div>
//               <ul className="list-disc p-4">
//                 <li>Tight tolerances & clean installs</li>
//                 <li>Detail-first approach</li>
//                 <li>No shortcuts, ever</li>
//               </ul>
//               <Link className="flex items-center gap-2">
//                 Learn more <ArrowRight />
//               </Link>
//             </div>
//             {/* Box 2 */}
//             <div
//               className={`border-3 rounded-xl p-4 transition-all duration-1000 ${
//                 isDark ? "border-zinc-900" : "border-zinc-100"
//               }`}
//             >
//               <div className="flex gap-4">
//                 <ShieldCheck className={`w-14 h-14 border rounded-full`} />
//                 <div>
//                   <h1 className={`text-2xl font-bold`}>Trusted + protected</h1>
//                   <p className={`text-md`}>
//                     Transparent communication and quality guarantees come
//                     standard - your car is treated with respect.
//                   </p>
//                 </div>
//               </div>
//               <ul className="list-disc p-4">
//                 <li>Clear quotes & timelines</li>
//                 <li>Install checks & QA</li>
//                 <li>Satisfaction-based work</li>
//               </ul>
//               <Link className="flex items-center gap-2">
//                 Learn more <ArrowRight />
//               </Link>
//             </div>
//             {/* Box 3 */}
//             <div
//               className={`border-3 rounded-xl p-4 transition-all duration-1000 ${
//                 isDark ? "border-zinc-900" : "border-zinc-100"
//               }`}
//             >
//               <div className="flex gap-4">
//                 <Bolt className={`w-14 h-14 border rounded-full`} />
//                 <div>
//                   <h1 className={`text-2xl font-bold`}>
//                     Fast, clean turnaround
//                   </h1>
//                   <p className={`text-md`}>
//                     Efficient scheduling, pro tools, and experience mean less
//                     downtime and more drive time.
//                   </p>
//                 </div>
//               </div>
//               <ul className="list-disc p-4">
//                 <li>Streamlined intake</li>
//                 <li>Predictable workflow</li>
//                 <li>On-time delivery</li>
//               </ul>
//               <Link className="flex items-center gap-2">
//                 Learn more <ArrowRight />
//               </Link>
//             </div>
//             {/* Box 4 */}
//             <div
//               className={`border-3 rounded-xl p-4 transition-all duration-1000 ${
//                 isDark ? "border-zinc-900" : "border-zinc-100"
//               }`}
//             >
//               <div className="flex gap-4">
//                 <Wrench className={`w-14 h-14 border rounded-full`} />
//                 <div>
//                   <h1 className={`text-2xl font-bold`}>Built by specialists</h1>
//                   <p className={`text-md`}>
//                     We measure, plan, and execute. Real expertise across
//                     customization and performance upgrades.
//                   </p>
//                 </div>
//               </div>
//               <ul className="list-disc p-4">
//                 <li>Pro-grade tooling</li>
//                 <li>Proven processes</li>
//                 <li>Repeatable quality</li>
//               </ul>
//               <Link className="flex items-center gap-2">
//                 Learn more <ArrowRight />
//               </Link>
//             </div>
//           </div>
//         </div>
//         {/* Main-right */}
//         <div className="w-2xl space-y-4">
//           {/* Top card */}
//           <div
//             className={`space-y-4 rounded-xl border-3 p-4 transition-all duration-1000 ${
//               isDark ? "border-zinc-900" : "border-zinc-100"
//             }`}
//           >
//             {/* Top card header */}
//             <div className="flex items-center gap-2">
//               <Atom
//                 className={`w-12 h-12 transition-all duration-1000 ${
//                   isDark ? "text-rose-500" : "text-sky-500"
//                 }`}
//               />
//               <div>
//                 <h1 className="text-2xl font-bold">What you can expect</h1>
//                 <p className="text-md">No fluff - just standards.</p>
//               </div>
//             </div>
//             {/* Top card content */}
//             <div className="space-y-4">
//               {/* Item 1 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <Check
//                   className={`w-12 h-12 rounded-full p-2 transition-all duration-1000 ${
//                     isDark ? "bg-rose-500/30" : "bg-sky-500/30"
//                   }`}
//                 />
//                 <div>
//                   <h2 className={`text-xl font-semibold`}>
//                     Quality-first installs
//                   </h2>
//                   <p className={`text-md`}>
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 2 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <Check
//                   className={`w-12 h-12 rounded-full p-2 transition-all duration-1000 ${
//                     isDark ? "bg-rose-500/30" : "bg-sky-500/30"
//                   }`}
//                 />
//                 <div>
//                   <h2 className={`text-xl font-semibold`}>
//                     Quality-first installs
//                   </h2>
//                   <p className={`text-md`}>
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 3 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <Check
//                   className={`w-12 h-12 rounded-full p-2 transition-all duration-1000 ${
//                     isDark ? "bg-rose-500/30" : "bg-sky-500/30"
//                   }`}
//                 />
//                 <div>
//                   <h2 className={`text-xl font-semibold`}>
//                     Quality-first installs
//                   </h2>
//                   <p className={`text-md`}>
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 4 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <Check
//                   className={`w-12 h-12 rounded-full p-2 transition-all duration-1000 ${
//                     isDark ? "bg-rose-500/30" : "bg-sky-500/30"
//                   }`}
//                 />
//                 <div>
//                   <h2 className={`text-xl font-semibold`}>
//                     Quality-first installs
//                   </h2>
//                   <p className={`text-md`}>
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//           {/* Bottom card */}
//           <div
//             className={`space-y-4 rounded-xl border-3 p-4 transition-all duration-1000 ${
//               isDark ? "border-zinc-900" : "border-zinc-100"
//             }`}
//           >
//             {/* Header */}
//             <div className="flex items-center justify-between">
//               <div>
//                 <h1 className="text-2xl font-bold">Our process</h1>
//                 <p className={`text-md`}>
//                   Clean workflow. Predictable results.
//                 </p>
//               </div>
//               <p
//                 className={`border px-4 py-1 rounded-full transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 4 steps
//               </p>
//             </div>
//             {/* Mid section */}
//             <div className="space-y-4">
//               {/* Item 1 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <span
//                   className={`h-12 w-12 flex items-center justify-center border-2 rounded-2xl transition-all duration-1000 ${
//                     isDark
//                       ? "text-rose-500 border-zinc-900"
//                       : "text-sky-500 border-zinc-100"
//                   }`}
//                 >
//                   01
//                 </span>
//                 <div>
//                   <h2 className="text-2xl font-semibold">
//                     Quality-first installs
//                   </h2>
//                   <p className="text-md">
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 2 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <span
//                   className={`h-12 w-12 flex items-center justify-center border-2 rounded-2xl transition-all duration-1000 ${
//                     isDark
//                       ? "text-rose-500 border-zinc-900"
//                       : "text-sky-500 border-zinc-100"
//                   }`}
//                 >
//                   02
//                 </span>
//                 <div>
//                   <h2 className="text-2xl font-semibold">
//                     Quality-first installs
//                   </h2>
//                   <p className="text-md">
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 3 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <span
//                   className={`h-12 w-12 flex items-center justify-center border-2 rounded-2xl transition-all duration-1000 ${
//                     isDark
//                       ? "text-rose-500 border-zinc-900"
//                       : "text-sky-500 border-zinc-100"
//                   }`}
//                 >
//                   03
//                 </span>
//                 <div>
//                   <h2 className="text-2xl font-semibold">
//                     Quality-first installs
//                   </h2>
//                   <p className="text-md">
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//               {/* Item 4 */}
//               <div
//                 className={`flex items-center gap-2 border-3 rounded-xl p-2 transition-all duration-1000 ${
//                   isDark ? "border-zinc-900" : "border-zinc-100"
//                 }`}
//               >
//                 <span
//                   className={`h-12 w-12 flex items-center justify-center border-2 rounded-2xl transition-all duration-1000 ${
//                     isDark
//                       ? "text-rose-500 border-zinc-900"
//                       : "text-sky-500 border-zinc-100"
//                   }`}
//                 >
//                   04
//                 </span>
//                 <div>
//                   <h2 className="text-2xl font-semibold">
//                     Quality-first installs
//                   </h2>
//                   <p className="text-md">
//                     Clean routing, secure mounting, and tested resulsts.
//                   </p>
//                 </div>
//               </div>
//             </div>
//             {/* CTA buttons */}
//             <div className="flex items-center gap-4">
//               <button
//                 className={`flex items-center gap-2 text-lg font-semibold border-3 border-rose-500 rounded-full px-3 py-2 transition-all duration-1000 ${
//                   isDark ? "" : ""
//                 }`}
//               >
//                 Explore services <ArrowRight />
//               </button>
//               <button
//                 className={`flex items-center gap-2 text-lg font-semibold border-3 border-sky-500 rounded-full px-3 py-2 transition-all duration-1000 ${
//                   isDark ? "" : ""
//                 }`}
//               >
//                 Get a quote <ArrowRight />
//               </button>
//             </div>
//           </div>
//         </div>
//       </section>
//     </main>
//   );
// };

// export default Trust;

// src/components/Trust.jsx
import { Link } from "react-router-dom";
import { useTheme } from "../../contexts/Theme";
import {
  ArrowRight,
  Atom,
  Bolt,
  Check,
  Crown,
  Dot,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const Trust = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const surface = isDark
    ? "border-zinc-900 bg-zinc-950/40"
    : "border-zinc-200 bg-white/60";

  const surfaceInner = isDark
    ? "border-zinc-900 bg-zinc-950/30"
    : "border-zinc-200 bg-white/50";

  const muted = isDark ? "text-zinc-300" : "text-zinc-700";
  const subtle = isDark ? "text-zinc-500" : "text-zinc-500";

  return (
    <section
      className={[
        "w-full px-8 transition-all duration-3000",
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950",
      ].join(" ")}
    >
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-16">
        {/* Header */}
        <header
          className={[
            "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
            "border-b-2 pb-6",
            isDark ? "border-zinc-900" : "border-zinc-200",
          ].join(" ")}
        >
          {/* Header-left */}
          <div className="max-w-2xl space-y-4">
            {/* Header tags */}
            <div className="flex flex-wrap items-center gap-3 font-medium uppercase">
              <p
                className={[
                  "flex items-center gap-2 border rounded-full px-3 py-2",
                  isDark ? "border-zinc-900" : "border-zinc-200",
                ].join(" ")}
              >
                <Dot className="text-rose-500" />
                Precision
              </p>
              <p
                className={[
                  "flex items-center gap-2 border rounded-full px-3 py-2",
                  isDark ? "border-zinc-900" : "border-zinc-200",
                ].join(" ")}
              >
                <Dot className="text-sky-500" />
                Protection
              </p>
              <p
                className={[
                  "flex items-center gap-2 border rounded-full px-3 py-2",
                  isDark ? "border-zinc-900" : "border-zinc-200",
                ].join(" ")}
              >
                <Dot className="text-emerald-500" />
                Performance
              </p>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-tight">
              Why are we{" "}
              <span className="bg-gradient-to-r from-rose-300 to-sky-200 bg-clip-text text-transparent">
                Top Tier?
              </span>
            </h2>

            <p
              className={["text-base sm:text-lg leading-relaxed", muted].join(
                " "
              )}
            >
              It&apos;s not hype — it&apos;s process. Premium craftsmanship,
              transparent service, and a quality-first workflow so your build
              looks insane and performs even better.
            </p>
          </div>

          {/* Header-right stats */}
          <div className="w-full lg:max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={[
                  "border-2 rounded-xl p-5 sm:p-6 space-y-2",
                  surface,
                ].join(" ")}
              >
                <h3 className="text-2xl font-semibold">Top-tier QA</h3>
                <p className={["text-base font-medium", muted].join(" ")}>
                  Every install verified
                </p>
                <p
                  className={["flex items-center gap-2 text-sm", subtle].join(
                    " "
                  )}
                >
                  Final checks <Dot className="w-4 h-4" /> clean finishing
                </p>
              </div>

              <div
                className={[
                  "border-2 rounded-xl p-5 sm:p-6 space-y-2",
                  surface,
                ].join(" ")}
              >
                <h3 className="text-2xl font-semibold">Fast turnaround</h3>
                <p className={["text-base font-medium", muted].join(" ")}>
                  Efficient scheduling
                </p>
                <p className={["text-sm", subtle].join(" ")}>
                  Less downtime, more drive time
                </p>
              </div>

              <div
                className={[
                  "border-2 rounded-xl p-5 sm:p-6 space-y-2",
                  surface,
                ].join(" ")}
              >
                <h3 className="text-2xl font-semibold">Premium parts</h3>
                <p className={["text-base font-medium", muted].join(" ")}>
                  Curated components
                </p>
                <p className={["text-sm", subtle].join(" ")}>
                  Only what we&apos;d run ourselves
                </p>
              </div>

              <div
                className={[
                  "border-2 rounded-xl p-5 sm:p-6 space-y-2",
                  surface,
                ].join(" ")}
              >
                <h3 className="text-2xl font-semibold">Clear comms</h3>
                <p className={["text-base font-medium", muted].join(" ")}>
                  No ghosting
                </p>
                <p className={["text-sm", subtle].join(" ")}>
                  Updates, walkthroughs, receipts
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main-left */}
          <div className="lg:col-span-8">
            <div
              className={[
                "border-2 rounded-xl p-4 sm:p-5 space-y-4 transition-all duration-1000",
                surface,
              ].join(" ")}
            >
              {/* Main-left-header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 font-bold text-lg sm:text-xl">
                  <Atom
                    className={[
                      "transition-all duration-1000",
                      isDark ? "text-rose-500" : "text-sky-500",
                    ].join(" ")}
                  />
                  Top-tier pillars
                </h3>

                <p
                  className={[
                    "text-sm sm:text-base transition-all duration-1000",
                    isDark ? "text-rose-500" : "text-sky-500",
                  ].join(" ")}
                >
                  Four reasons to upgrade with TTC
                </p>
              </div>

              {/* Main-left-content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Box 1 */}
                <div
                  className={[
                    "border-2 rounded-xl p-4 transition-all duration-1000",
                    surfaceInner,
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <Crown
                      className={[
                        "w-12 h-12 sm:w-14 sm:h-14 border rounded-full p-2",
                        isDark ? "border-zinc-900" : "border-zinc-200",
                      ].join(" ")}
                    />
                    <div className="space-y-1">
                      <h4 className="text-xl sm:text-2xl font-bold">
                        Premium craftsmanship
                      </h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        Every build is treated like a flagship. Fitment, finish,
                        and function are dialed until it&apos;s perfect.
                      </p>
                    </div>
                  </div>
                  <ul
                    className={[
                      "list-disc pl-6 pt-3 space-y-1 text-sm sm:text-base",
                      muted,
                    ].join(" ")}
                  >
                    <li>Tight tolerances & clean installs</li>
                    <li>Detail-first approach</li>
                    <li>No shortcuts, ever</li>
                  </ul>
                  <Link
                    to="#"
                    className={[
                      "mt-3 inline-flex items-center gap-2 font-semibold",
                      isDark
                        ? "text-rose-300 hover:text-rose-200"
                        : "text-rose-600 hover:text-rose-700",
                    ].join(" ")}
                  >
                    Learn more <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Box 2 */}
                <div
                  className={[
                    "border-2 rounded-xl p-4 transition-all duration-1000",
                    surfaceInner,
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <ShieldCheck
                      className={[
                        "w-12 h-12 sm:w-14 sm:h-14 border rounded-full p-2",
                        isDark ? "border-zinc-900" : "border-zinc-200",
                      ].join(" ")}
                    />
                    <div className="space-y-1">
                      <h4 className="text-xl sm:text-2xl font-bold">
                        Trusted + protected
                      </h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        Transparent communication and quality guarantees come
                        standard — your car is treated with respect.
                      </p>
                    </div>
                  </div>
                  <ul
                    className={[
                      "list-disc pl-6 pt-3 space-y-1 text-sm sm:text-base",
                      muted,
                    ].join(" ")}
                  >
                    <li>Clear quotes & timelines</li>
                    <li>Install checks & QA</li>
                    <li>Satisfaction-backed work</li>
                  </ul>
                  <Link
                    to="#"
                    className={[
                      "mt-3 inline-flex items-center gap-2 font-semibold",
                      isDark
                        ? "text-sky-300 hover:text-sky-200"
                        : "text-sky-600 hover:text-sky-700",
                    ].join(" ")}
                  >
                    Learn more <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Box 3 */}
                <div
                  className={[
                    "border-2 rounded-xl p-4 transition-all duration-1000",
                    surfaceInner,
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <Bolt
                      className={[
                        "w-12 h-12 sm:w-14 sm:h-14 border rounded-full p-2",
                        isDark ? "border-zinc-900" : "border-zinc-200",
                      ].join(" ")}
                    />
                    <div className="space-y-1">
                      <h4 className="text-xl sm:text-2xl font-bold">
                        Fast, clean turnaround
                      </h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        Efficient scheduling, pro tools, and experience mean
                        less downtime and more drive time.
                      </p>
                    </div>
                  </div>
                  <ul
                    className={[
                      "list-disc pl-6 pt-3 space-y-1 text-sm sm:text-base",
                      muted,
                    ].join(" ")}
                  >
                    <li>Streamlined intake</li>
                    <li>Predictable workflow</li>
                    <li>On-time delivery</li>
                  </ul>
                  <Link
                    to="#"
                    className={[
                      "mt-3 inline-flex items-center gap-2 font-semibold",
                      isDark
                        ? "text-rose-300 hover:text-rose-200"
                        : "text-rose-600 hover:text-rose-700",
                    ].join(" ")}
                  >
                    Learn more <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Box 4 */}
                <div
                  className={[
                    "border-2 rounded-xl p-4 transition-all duration-1000",
                    surfaceInner,
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <Wrench
                      className={[
                        "w-12 h-12 sm:w-14 sm:h-14 border rounded-full p-2",
                        isDark ? "border-zinc-900" : "border-zinc-200",
                      ].join(" ")}
                    />
                    <div className="space-y-1">
                      <h4 className="text-xl sm:text-2xl font-bold">
                        Built by specialists
                      </h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        We measure, plan, and execute. Real expertise across
                        customization and performance upgrades.
                      </p>
                    </div>
                  </div>
                  <ul
                    className={[
                      "list-disc pl-6 pt-3 space-y-1 text-sm sm:text-base",
                      muted,
                    ].join(" ")}
                  >
                    <li>Pro-grade tooling</li>
                    <li>Proven processes</li>
                    <li>Repeatable quality</li>
                  </ul>
                  <Link
                    to="#"
                    className={[
                      "mt-3 inline-flex items-center gap-2 font-semibold",
                      isDark
                        ? "text-sky-300 hover:text-sky-200"
                        : "text-sky-600 hover:text-sky-700",
                    ].join(" ")}
                  >
                    Learn more <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main-right */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            {/* Top card */}
            <div
              className={[
                "rounded-xl border-2 p-4 sm:p-5 transition-all duration-1000 space-y-4",
                surface,
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <Atom
                  className={[
                    "w-10 h-10 sm:w-12 sm:h-12 transition-all duration-1000",
                    isDark ? "text-rose-500" : "text-sky-500",
                  ].join(" ")}
                />
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">
                    What you can expect
                  </h3>
                  <p className={["text-sm sm:text-base", muted].join(" ")}>
                    No fluff — just standards.
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={[
                      "flex items-start gap-3 border-2 rounded-xl p-3 transition-all duration-1000",
                      surfaceInner,
                    ].join(" ")}
                  >
                    <Check
                      className={[
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full p-2 shrink-0 transition-all duration-1000",
                        isDark ? "bg-rose-500/30" : "bg-sky-500/30",
                      ].join(" ")}
                    />
                    <div>
                      <h4 className="text-lg sm:text-xl font-semibold">
                        Quality-first installs
                      </h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        Clean routing, secure mounting, and tested results.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom card */}
            <div
              className={[
                "rounded-xl border-2 p-4 sm:p-5 transition-all duration-1000 space-y-4",
                surface,
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">Our process</h3>
                  <p className={["text-sm sm:text-base", muted].join(" ")}>
                    Clean workflow. Predictable results.
                  </p>
                </div>
                <p
                  className={[
                    "border rounded-full px-3 py-1 text-xs sm:text-xs md:text-sm lg:text-sm transition-all duration-1000",
                    isDark ? "border-zinc-900" : "border-zinc-200",
                  ].join(" ")}
                >
                  4 steps
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {[
                  [
                    "01",
                    "Consult",
                    "Tell us the goal. We’ll recommend the cleanest path to get there.",
                  ],
                  [
                    "02",
                    "Plan",
                    "We map the build: parts, timeline, and the exact deliverable.",
                  ],
                  [
                    "03",
                    "Execute",
                    "Precision install + detailing. Every piece tested and verified.",
                  ],
                  [
                    "04",
                    "Deliver",
                    "Final walkthrough. You leave confident — and top tier.",
                  ],
                ].map(([k, t, d], idx) => (
                  <div
                    key={k}
                    className={[
                      "flex items-start gap-3 border-2 rounded-xl p-3 transition-all duration-1000",
                      surfaceInner,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center border-2 rounded-2xl font-semibold shrink-0",
                        isDark
                          ? "text-rose-400 border-zinc-900"
                          : "text-sky-600 border-zinc-200",
                      ].join(" ")}
                    >
                      {k}
                    </span>
                    <div>
                      <h4 className="text-lg sm:text-xl font-semibold">{t}</h4>
                      <p className={["text-sm sm:text-base", muted].join(" ")}>
                        {d}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
                <button
                  className={[
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base sm:text-lg font-semibold",
                    "border-2 border-rose-500 rounded-full px-4 py-3 transition-all duration-1000",
                    isDark ? "hover:bg-rose-500/20" : "hover:bg-rose-500/10",
                  ].join(" ")}
                >
                  Explore services <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  className={[
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base sm:text-lg font-semibold",
                    "border-2 border-sky-500 rounded-full px-4 py-3 transition-all duration-1000",
                    isDark ? "hover:bg-sky-500/20" : "hover:bg-sky-500/10",
                  ].join(" ")}
                >
                  Get a quote <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Trust;
