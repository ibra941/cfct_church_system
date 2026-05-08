import { useEffect, useMemo, useState } from "react";
import {
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaPhone,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  getContactInfo,
  getFooterLinks,
  getSiteSettings,
  getSocialLinks,
} from "../../services/cms";

const Footer = () => {
  const { language } = useLanguage();
  const [socialLinks, setSocialLinks] = useState([]);
  const [footerLinks, setFooterLinks] = useState([]);
  const [contactEntries, setContactEntries] = useState([]);
  const [siteSettingsMap, setSiteSettingsMap] = useState({});

  useEffect(() => {
    const loadFooterData = async () => {
      try {
        const [social, footer, contact, settings] = await Promise.all([
          getSocialLinks(),
          getFooterLinks(),
          getContactInfo(),
          getSiteSettings(),
        ]);

        setSocialLinks(Array.isArray(social) ? social : []);
        setFooterLinks(Array.isArray(footer) ? footer : []);
        setContactEntries(Array.isArray(contact) ? contact : []);

        const normalizedSettings = (
          Array.isArray(settings) ? settings : []
        ).reduce((acc, item) => {
          if (item?.key) {
            acc[item.key] = item.value;
          }
          return acc;
        }, {});
        setSiteSettingsMap(normalizedSettings);
      } catch {
        setSocialLinks([]);
        setFooterLinks([]);
        setContactEntries([]);
        setSiteSettingsMap({});
      }
    };

    loadFooterData();
  }, []);

  const contactMap = useMemo(
    () =>
      contactEntries.reduce((acc, item) => {
        if (item?.contact_type) {
          acc[item.contact_type] = item.value;
        }
        return acc;
      }, {}),
    [contactEntries],
  );

  const iconByPlatform = {
    facebook: FaFacebook,
    twitter: FaTwitter,
    instagram: FaInstagram,
    youtube: FaYoutube,
  };

  const quickLinks =
    footerLinks.length > 0
      ? footerLinks
      : [
          { title: "About Us", url: "/about", is_external: false },
          { title: "Events", url: "/events", is_external: false },
          { title: "Contact", url: "/contact", is_external: false },
        ];

  const displayName = siteSettingsMap.site_name || "CFCT";
  const tagline =
    siteSettingsMap.site_tagline ||
    (language === "sw"
      ? "Kanisa la Kikristo la Ushirika Tanzania"
      : "Christian Fellowship Church Tanzania");
  const copyrightText =
    siteSettingsMap.copyright_text ||
    `© ${new Date().getFullYear()} CFCT. All rights reserved.`;

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{displayName}</h3>
            <p className="text-gray-400">{tagline}</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === "sw" ? "Viungo" : "Quick Links"}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  {item.is_external ? (
                    <a
                      href={item.url}
                      className="text-gray-400 hover:text-white"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <Link
                      to={item.url}
                      className="text-gray-400 hover:text-white"
                    >
                      {item.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === "sw" ? "Wasiliana Nasi" : "Contact Us"}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <FaEnvelope className="text-gray-400" />
                <span className="text-gray-400">
                  {contactMap.email || "cfctanzaniahq2019@gmail.com"}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <FaPhone className="text-gray-400" />
                <span className="text-gray-400">
                  {contactMap.phone || "+255 767 911 316"}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">
              {language === "sw" ? "Mitandao ya Kijamii" : "Social Media"}
            </h3>
            <div className="flex space-x-4">
              {(socialLinks.length > 0
                ? socialLinks
                : [
                    { platform: "facebook", url: "#" },
                    { platform: "twitter", url: "#" },
                    { platform: "instagram", url: "#" },
                    { platform: "youtube", url: "#" },
                  ]
              ).map((social, index) => {
                const Icon = iconByPlatform[social.platform] || FaFacebook;
                return (
                  <a
                    key={`${social.platform}-${index}`}
                    href={social.url}
                    className="text-gray-400 hover:text-white text-2xl"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
