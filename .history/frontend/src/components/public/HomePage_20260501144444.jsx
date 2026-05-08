import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import churchBgImage from "../../assets/images/church-bg.jpg";
import { useLanguage } from "../../contexts/LanguageContext";
import { getHomepageContent, getSiteSettings } from "../../services/cms";
import Navbar from "../common/Navbar";
import PopupNews from "../common/PopupNews";
import Contact from "./Contact";
import Footer from "./Footer";
import History from "./History";
import NewsList from "./NewsList";
import VisionMission from "./VisionMission";

const HomePage = () => {
  const { language } = useLanguage();
  const [showPopup, setShowPopup] = useState(true);
  const [showAdminBackButton, setShowAdminBackButton] = useState(false);
  const [sectionsByKey, setSectionsByKey] = useState({});
  const [siteSettingsMap, setSiteSettingsMap] = useState({});

  useEffect(() => {
    const popupClosed = localStorage.getItem("popupClosed");
    if (popupClosed === "true") setShowPopup(false);

    const fromAdminQuery =
      new URLSearchParams(window.location.search).get("from_admin") === "1";
    const fromAdminReferrer = document.referrer.includes("/admin");

    if (fromAdminQuery || fromAdminReferrer) {
      sessionStorage.setItem("opened_from_admin", "1");
    }

    setShowAdminBackButton(sessionStorage.getItem("opened_from_admin") === "1");
  }, []);

  useEffect(() => {
    const loadCmsContent = async () => {
      try {
        const [sections, settings] = await Promise.all([
          getHomepageContent(),
          getSiteSettings(),
        ]);

        const normalizedSections = (Array.isArray(sections) ? sections : []).reduce(
          (acc, section) => {
            if (section?.section) {
              acc[section.section] = section;
            }
            return acc;
          },
          {},
        );
        setSectionsByKey(normalizedSections);

        const normalizedSettings = (Array.isArray(settings) ? settings : []).reduce(
          (acc, item) => {
            if (item?.key) {
              acc[item.key] = item.value;
            }
            return acc;
          },
          {},
        );
        setSiteSettingsMap(normalizedSettings);
      } catch {
        setSectionsByKey({});
        setSiteSettingsMap({});
      }
    };

    loadCmsContent();
  }, []);

  const heroSection = sectionsByKey.hero || {};
  const heroTitle =
    heroSection.title ||
    siteSettingsMap.hero_title ||
    "Christian Fellowship Church Tanzania";
  const heroSubtitle =
    heroSection.content ||
    siteSettingsMap.hero_subtitle ||
    (language === "sw"
      ? "Kuanzisha Kanisa Linalozingatia Kristo, Kuwafikia Watu kwa Injili"
      : "Building a Christ-Centered Church, Reaching People with the Gospel");
  const heroBackground =
    heroSection.image || siteSettingsMap.hero_background_image || churchBgImage;
  const heroLogo = siteSettingsMap.site_logo || "/icons/icon-192x192.png";

  const closePopup = () => {
    setShowPopup(false);
    localStorage.setItem("popupClosed", "true");
  };

  return (
    <div className="min-h-screen">
      {showAdminBackButton && (
        <a
          href="/admin/"
          className="fixed top-3 right-3 z-[9999] rounded-lg bg-[#0f5d89] px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#0d4f75]"
        >
          Rudi Admin
        </a>
      )}
      <Navbar />
      {showPopup && <PopupNews onClose={closePopup} />}

      {/* Hero Section */}
      <div
        className="relative h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundColor: "rgba(0,0,0,0.5)",
          backgroundBlend: "overlay",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-white text-center px-4">
          <img
            src={heroLogo}
            alt="CFCT Logo"
            className="w-24 h-24 mb-6 animate-bounce"
          />
          <h1 className="text-5xl md:text-7xl font-bold mb-4">{heroTitle}</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl">
            {heroSubtitle}
          </p>
          <div className="space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              {language === "sw" ? "Jiunge Nasi" : "Join Us"}
            </Link>
            <a href="#history" className="btn-secondary text-lg px-8 py-3">
              {language === "sw" ? "Jua Zaidi" : "Learn More"}
            </a>
          </div>
        </div>
      </div>

      <History cmsSections={sectionsByKey} />
      <VisionMission cmsSections={sectionsByKey} />
      <NewsList />
      <Contact />
      <Footer />
    </div>
  );
};

export default HomePage;
