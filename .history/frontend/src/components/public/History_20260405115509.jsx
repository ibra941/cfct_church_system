import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

const History = () => {
  const { language } = useLanguage()

  return (
    <section id="history" className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'sw' ? 'Historia Yetu' : 'Our History'}
          </h2>
          <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
        </div>
        <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {language === 'sw'
              ? 'Kanisa la Kikristo la Ushirika Tanzania (CFCT) lilianzishwa mwaka 1990 na Mchungaji Dk. John E. Mwambene. Kilianza kama kikundi kidogo cha waumini katika jiji la Dar es Salaam, na kwa neema ya Mungu, kimekua na kuwa moja ya makanisa yenye ushawishi mkubwa nchini Tanzania.'
              : 'Christian Fellowship Church Tanzania (CFCT) was founded in 1990 by Pastor Dr. John E. Mwambene. It started as a small group of believers in Dar es Salaam city, and by God\'s grace, has grown to become one of the most influential churches in Tanzania.'}
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            {language === 'sw'
              ? 'Kwa zaidi ya miaka 30, CFCT imekuwa mwangaza wa nuru na matumaini kwa jamii, kueneza injili ya Yesu Kristo na kuwajenga wanachama katika imani na maadili.'
              : 'For over 30 years, CFCT has been a beacon of light and hope to the community, spreading the gospel of Jesus Christ and building members in faith and integrity.'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default History