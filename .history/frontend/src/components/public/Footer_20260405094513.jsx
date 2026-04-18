import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaEnvelope, FaPhone } from 'react-icons/fa'

const Footer = () => {
  const { language } = useLanguage()

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">CFCT</h3>
            <p className="text-gray-400">
              {language === 'sw'
                ? 'Kanisa la Kikristo la Ushirika Tanzania'
                : 'Christian Fellowship Church Tanzania'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === 'sw' ? 'Viungo' : 'Quick Links'}
            </h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
              <li><Link to="/events" className="text-gray-400 hover:text-white">Events</Link></li>
              <li><Link to="/sermons" className="text-gray-400 hover:text-white">Sermons</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === 'sw' ? 'Wasiliana Nasi' : 'Contact Us'}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <FaEnvelope className="text-gray-400" />
                <span className="text-gray-400">info@cfct.or.tz</span>
              </li>
              <li className="flex items-center space-x-2">
                <FaPhone className="text-gray-400" />
                <span className="text-gray-400">+255 123 456 789</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === 'sw' ? 'Mitandao ya Kijamii' : 'Social Media'}
            </h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white text-2xl">
                <FaFacebook />
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-2xl">
                <FaTwitter />
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-2xl">
                <FaInstagram />
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-2xl">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 CFCT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer