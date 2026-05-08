import { useLanguage } from "../../contexts/LanguageContext";

const VisionMission = ({ cmsSections = {} }) => {
  const { language } = useLanguage();
  const visionSection = cmsSections.vision || {};
  const missionSection = cmsSections.mission || {};

  const visionTitle =
    visionSection.title || (language === "sw" ? "Dira Yetu" : "Our Vision");
  const visionText =
    visionSection.content ||
    (language === "sw"
      ? "kutoa msaada wa Kiroho na Kimwili Kwa jamii ya Watanzania na nje ya Taifa la Tanzania."
      : "To provide spiritual and physical support to the Tanzanian community and beyond the borders of Tanzania.");

  const missionTitle =
    missionSection.title || (language === "sw" ? "Lengo Letu" : "Our Mission");
  const missionText =
    missionSection.content ||
    (language === "sw"
      ? "Kutoa huduma ya Kiroho inayoamini katika maandiko Matakatifu yaani Biblia."
      : "To provide spiritual services that believe in the Holy Scriptures, that is, the Bible.");

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card transform hover:scale-105 transition duration-300 text-center">
            <div className="text-5xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold text-primary-600 mb-4">
              {visionTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{visionText}</p>
          </div>
          <div className="card transform hover:scale-105 transition duration-300 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-primary-600 mb-4">
              {missionTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{missionText}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisionMission;
