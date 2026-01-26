import { GoArrowBoth } from "react-icons/go";
import { FaRegCalendar } from "react-icons/fa";

const LandingPage = () => {
  return (
    <main className="min-h-screen">
      <FlightSearch />
      <Hero />
    </main>
  );
};

const FlightSearch = () => {
  return (
    <main className="bg-zinc-950 w-full px-32 py-16 border-t-3 border-zinc-900">
      <section className="flex items-center justify-center space-x-64">
        {/* Departure/Arrival Form */}
        <div className="flex items-center gap-4">
          {/* Departure */}
          <div>
            <h1 className="text-zinc-100 font-bold text-[48px]">EWR</h1>
            <p className="text-zinc-500 font-semibold text-[16px]">
              Newark, NJ
            </p>
          </div>
          {/* Arrow Icon */}
          <GoArrowBoth size={60} className="text-sky-500" />
          <div>
            <h1 className="text-zinc-100 font-bold text-[48px]">To</h1>
            <p className="text-zinc-500 font-semibold text-[16px]">
              Your Destination
            </p>
          </div>
        </div>
        {/* Flight Options */}
        <div className="flex items-center gap-4">
          <div className="border-b-2 border-zinc-100 py-2">
            <label className="text-zinc-100">Round Trip</label>
            <select className="text-sky-500"></select>
          </div>
          <div className="border-b-2 border-zinc-100 py-2 flex items-center gap-4">
            <label className="text-zinc-100">Depart - Return</label>
            <FaRegCalendar size={24} className="text-sky-500" />
          </div>
          <div className="border-b-2 border-zinc-100 py-2">
            <label className="text-zinc-100">1 Passenger</label>
            <select className="text-sky-500"></select>
          </div>
        </div>
        {/* Search Flights Button */}
        <div>
          <button
            type="button"
            className="text-zinc-100 uppercase font-medium bg-red-500 px-3 py-1.5 text-[24px]"
          >
            Search
          </button>
        </div>
      </section>
      {/* Advanced Search Controls */}
      <section className="flex items-center justify-center space-x-53 mt-16">
        <p className="text-zinc-500">Search Options</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" />
            <label className="text-zinc-300">Shop with Miles</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" />
            <label className="text-zinc-300">My dates are flexible</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" />
            <label className="text-zinc-300">Exclude Main Basic</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" />
            <label className="text-zinc-300">Refundable Only</label>
          </div>
        </div>
        <div className="border-b-2 border-zinc-100 py-2">
          <label className="text-zinc-100">Advanced Search</label>
          <select className="text-sky-500"></select>
        </div>
      </section>
    </main>
  );
};

const Hero = () => {
  return (
    <main className="relative w-full h-150 overflow-hidden">
      {/* Background Image */}
      <section
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.trvl-media.com/place/180023/95ef1260-b69c-42e7-94b7-804f81f1d796.jpg')",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/80" />
      {/* Floating Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="ml-40">
          <h1 className="text-[48px] font-bold uppercase text-zinc-100">
            Book your next trip
          </h1>
          <p className="text-[24px] font-bold text-zinc-100">
            Explore our current flight deals and <br /> plan your next
            adventure.
          </p>
          <button
            type="button"
            className="text-zinc-100 uppercase font-medium bg-red-500 px-3 py-1.5 text-[24px] mt-4"
          >
            Explore Offers
          </button>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
