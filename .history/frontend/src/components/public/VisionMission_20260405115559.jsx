import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

const VisionMission = () => {
  const { language } = useLanguage()

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card transform hover:scale-105 transition duration-300 text-center">
            <div className="text-5xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold text-primary-600 mb-4">{language === 'sw' ? 'Dira Yetu' : 'Our Vision'}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'sw'
                ? 'Kuwa Kanisa la Kwanza katika Kueneza Injili na Kujenga Watu wenye Maadili Katika Tanzania na Dunia Nzima'
                : 'To be the Leading Church in Spreading the Gospel and Building People of Integrity in Tanzania and Worldwide'}
            </p>
          </div>
          <div className="card transform hover:scale-105 transition duration-300 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-primary-600 mb-4">{language === 'sw' ? 'Lengo Letu' : 'Our Mission'}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'sw'
                ? 'Kuwafikia watu kwa upendo wa Kristo, Kuwafundisha Neno la Mungu, na Kuwatayarisha kwa Huduma'
                : 'To reach people with the love of Christ, teach the Word of God, and equip them for ministry'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VisionMission