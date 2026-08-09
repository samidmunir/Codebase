import logo from "../../assets/images/logo/top-tier-customs_logo.jpg";
import { Clock8, Mail, MapPin, Phone } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full px-8 py-4 bg-white/60 dark:bg-black/90 text-zinc-950 dark:text-zinc-50 border-t border-black/10 dark:border-white/10 transition-all duration-300">
      <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
        {/* Company Info */}
        <div className="">
          <div className="flex items-center space-x-2">
            <img
              src={logo}
              alt="Top Tier Customs Logo"
              className="w-12 h-12 rounded-full border-3 border-sky-500 dark:border-rose-500 transition-all duration-300"
            />
            <h1 className="text-2xl font-bold uppercase text-transparent bg-clip-text bg-linear-to-r from-zinc-950 to-sky-500 dark:from-red-500 dark:to-zinc-50 transition-all duration-300">
              Top Tier Customs
            </h1>
          </div>
          <p className="mt-4 text-md">
            Premium services for your automotive needs-from performance upgrades
            to sleek customizations.
          </p>
          <div className="mt-4 tracking-widest">
            <p className="flex items-center gap-2">
              <MapPin size={20} />
              <span className="text-md">Wokingham RG40</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone size={20} />
              <span className="text-md">07990284333</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock8 size={20} />
              <span className="text-md">8:00 - 16:00</span>
            </p>
          </div>
        </div>
        {/* Customer Care */}
        <div className="">
          <h3 className="font-semibold mb-3 text-xl">Customer Care</h3>
          <ul className="space-y-2 text-md">
            <li>
              <a href="/support" className="hover:underline">
                Help & Support
              </a>
            </li>
            <li>
              <a href="/track-order" className="hover:underline">
                Track Order
              </a>
            </li>
            <li>
              <a href="/returns" className="hover:underline">
                Returns
              </a>
            </li>
            <li>
              <a href="/faq" className="hover:underline">
                FAQ
              </a>
            </li>
          </ul>
        </div>
        {/* Legal */}
        <div className="">
          <h3 className="font-semibold mb-3 text-xl">Legal</h3>
          <ul className="space-y-2 text-md">
            <li>
              <a href="/privacy-policy" className="hover:underline">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="hover:underline">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="/cookies" className="hover:underline">
                Cookie Policy
              </a>
            </li>
          </ul>
        </div>
        {/* Socials */}
        <div className="">
          <h3 className="font-semibold mb-3 text-xl">Connect With Us</h3>
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              <FaFacebook className="w-5 h-5 hover:text-blue-500 transition" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <FaInstagram className="w-5 h-5 hover:text-pink-500 transition" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <FaTwitter className="w-5 h-5 hover:text-sky-400 transition" />
            </a>
            <a href="mailto:support@maravex.com">
              <Mail className="w-5 h-5 hover:text-green-400 transition" />
            </a>
          </div>
        </div>
      </div>
      {/* Bottom Footer */}
      <div className="text-center text-sm mt-12 border-t pt-6 border-zinc-400/20">
        <p>
          &copy; {year} <span className={`font-semibold`}>Zephiron</span> Inc.
          All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
