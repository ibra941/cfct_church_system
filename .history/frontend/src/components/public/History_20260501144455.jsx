import founderImage from "../../assets/images/founder.jpg";
import { useLanguage } from "../../contexts/LanguageContext";

const History = ({ cmsSections = {} }) => {
  const { language } = useLanguage();
  const historySection = cmsSections.history || {};

  const historyTitle =
    historySection.title || (language === "sw" ? "Historia Yetu" : "Our History");
  const historyParagraphOne =
    historySection.content ||
    (language === "sw"
      ? "Christians Fellowship Church Tanzania (CFCT) ni Kanisa lenye Imani ya kipentekoste, Lilianzishwa rasmi 12.12.2019.Mwanzilishi na mbeba maono wa Kanisa hili ni Mchungaji George Kagusa Kilomo.Kanisa linapatikana katika Mtaa wa Nshinde,Kata ya Nyankumbu,Halmashauri ya Manispaa ya Geita na Mkoa wa Geita."
      : "Christians Fellowship Church Tanzania (CFCT) is a Spirit-filled church, founded in 2019 by Pastor George Kagusa Kilomo . We believe in spreading the gospel, building communities, and preparing future leaders.");
  const historyParagraphTwo =
    historySection.subtitle ||
    (language === "sw"
      ? "Kwa zaidi ya miaka 30, CFCT imekuwa mwangaza wa nuru na matumaini kwa jamii, kueneza injili ya Yesu Kristo na kuwajenga wanachama katika imani na maadili."
      : "For over 30 years, CFCT has been a beacon of light and hope to the community, spreading the gospel of Jesus Christ and building members in faith and integrity.");

  return (
    <section id="history" className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {historyTitle}
          </h2>
          <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
        </div>
        <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{historyParagraphOne}</p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            {historyParagraphTwo}
          </p>
        </div>

        {/* Founder Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-8 shadow-lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {language === "sw" ? "Mwanzilishi Wetu" : "Our Founder"}
              </h3>
              <div className="w-16 h-1 bg-primary-600 mx-auto"></div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary-600 shadow-lg">
                  <img
                    src={founderImage}
                    alt={
                      language === "sw"
                        ? "Mchungaji George Kagusa Kilomo"
                        : "Pastor George Kagusa Kilomo"
                    }
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNjBjLTIyLjA5IDAtNDAgMTcuOTEtNDAgNDBzMTcuOTEgNDAgNDAgNDAgNDAtMTcuOTEgNDAtNDBzLTE3LjkxLTQwLTQwem0wIDIwYzEwLjQ5IDAgMTkgOC41MSAxOSA5LjQ5IDAtMTAuOTgtOC41MS0xOS0xOS0xOXMtMTkgOC41MS0xOSA5LjQ5YzAgMTAuOTggOC41MSAxOSA5LjQ5IDE5eiIgZmlsbD0iIzk3OTdhNyIvPgo8L3N2Zz4K";
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {language === "sw"
                    ? "Mchungaji George Kagusa Kilomo"
                    : "Pastor George Kagusa Kilomo"}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {language === "sw"
                    ? "Mwanzilishi na Mbeba Maono wa Kanisa la Christians Fellowship Church Tanzania"
                    : "Founder and Vision Bearer of Christians Fellowship Church Tanzania"}
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {language === "sw"
                    ? "Mchungaji George Kagusa Kilomo ni mtu aliyeitwa na Mungu kuongoza jamii kupitia huduma ya kiroho. Kwa miaka mingi, amekuwa mwangaza wa nuru na matumaini kwa wengi, akieneza injili ya Yesu Kristo na kuwajenga watu katika imani thabiti."
                    : "Pastor George Kagusa Kilomo is a man called by God to lead the community through spiritual ministry. For many years, he has been a beacon of light and hope to many, spreading the gospel of Jesus Christ and building people in strong faith."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default History;
