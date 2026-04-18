import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import Navbar from '../common/Navbar'
import PopupNews from '../common/PopupNews'
import Footer from './Footer'

const HomePage = () => {
  const { language, t } = useLanguage()
  const [showPopup, setShowPopup] = useState(true)

  useEffect(() => {
    // Check if popup was closed before
    const popupClosed = localStorage.getItem('popupClosed')
    if (popupClosed === 'true') {
      setShowPopup(false)
    }
  }, [])

  const closePopup = () => {
    setShowPopup(false)
    localStorage.setItem('popupClosed', 'true')
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Popup News */}
      {showPopup && <PopupNews onClose={closePopup} />}
      
      {/* Hero Section */}
      <div 
        className="relative h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: 'url("/images/church-bg.jpg")',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backgroundBlend: 'overlay'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-white text-center px-4">
          <img 
            src="/icons/icon-192x192.png" 
            alt="CFCT Logo" 
            className="w-24 h-24 mb-6 animate-bounce"
          />
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Christian Fellowship Church Tanzania
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl">
            {language === 'sw' 
              ? 'Kuanzisha Kanisa Linalozingatia Kristo, Kuwafikia Watu kwa Injili'
              : 'Building a Christ-Centered Church, Reaching People with the Gospel'}
          </p>
          <div className="space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              {language === 'sw' ? 'Jiunge Nasi' : 'Join Us'}
            </Link>
            <Link to="/about" className="btn-secondary text-lg px-8 py-3">
              {language === 'sw' ? 'Jua Zaidi' : 'Learn More'}
            </Link>
          </div>
        </div>
      </div>

      {/* Vision & Mission Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Dira na Lengo Letu' : 'Our Vision & Mission'}
            </h2>
            <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card transform hover:scale-105 transition duration-300">
              <div className="text-center">
                <div className="text-5xl mb-4">👁️</div>
                <h3 className="text-2xl font-bold text-primary-600 mb-4">
                  {language === 'sw' ? 'Dira Yetu' : 'Our Vision'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {language === 'sw'
                    ? 'Kuwa Kanisa la Kwanza katika Kueneza Injili na Kujenga Watu wenye Maadili Katika Tanzania na Dunia Nzima'
                    : 'To be the Leading Church in Spreading the Gospel and Building People of Integrity in Tanzania and Worldwide'}
                </p>
              </div>
            </div>
            
            <div className="card transform hover:scale-105 transition duration-300">
              <div className="text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-primary-600 mb-4">
                  {language === 'sw' ? 'Lengo Letu' : 'Our Mission'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {language === 'sw'
                    ? 'Kuwafikia watu kwa upendo wa Kristo, Kuwafundisha Neno la Mungu, na Kuwatayarisha kwa Huduma'
                    : 'To reach people with the love of Christ, teach the Word of God, and equip them for ministry'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Founder Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Mwanzilishi Wetu' : 'Our Founder'}
            </h2>
            <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <img 
              src="/images/founder.jpg" 
              alt="Founder" 
              className="w-64 h-64 rounded-full object-cover shadow-xl"
            />
            <div className="max-w-2xl text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Rev. Dr. John E. Mwambene
              </h3>
              <p className="text-primary-600 mb-4">Founder & Presiding Bishop</p>
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'sw'
                  ? 'Mwanzilishi wa Kanisa la CFCT, amehudumu kwa zaidi ya miaka 30 katika kueneza Injili na kujenga viongozi wa kanisa.'
                  : 'Founder of CFCT Church, has served for over 30 years in spreading the Gospel and building church leaders.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default HomePage