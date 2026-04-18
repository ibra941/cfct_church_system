import { useLanguage } from "../../contexts/LanguageContext";

const History = () => {
  const { language } = useLanguage();

  return (
    <section id="history" className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Historia Yetu" : "Our History"}
          </h2>
          <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
        </div>
        <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {language === "sw"
              ? "Christians Fellowship Church Tanzania (CFCT) ni Kanisa lenye Imani ya kipentekoste, Lilianzishwa rasmi 12.12.2019.Mwanzilishi na mbeba maono wa Kanisa hili ni Mchungaji George Kagusa Kilomo.Kanisa linapatikana katika Mtaa wa Nshinde,Kata ya Nyankumbu,Halmashauri ya Manispaa ya Geita na Mkoa wa Geita."
              : "Christians Fellowship Church Tanzania (CFCT) is a Spirit-filled church, founded in 2019 by Pastor George Kagusa Kilomo . We believe in spreading the gospel, building communities, and preparing future leaders."}
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            {language === "sw"
              ? "Kwa zaidi ya miaka 30, CFCT imekuwa mwangaza wa nuru na matumaini kwa jamii, kueneza injili ya Yesu Kristo na kuwajenga wanachama katika imani na maadili."
              : "For over 30 years, CFCT has been a beacon of light and hope to the community, spreading the gospel of Jesus Christ and building members in faith and integrity."}
          </p>
        </div>
      </div>
    </section>
  );
};

export default History;
