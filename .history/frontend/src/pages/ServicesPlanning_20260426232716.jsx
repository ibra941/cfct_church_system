import { useLanguage } from "../contexts/LanguageContext";

const ServicesPlanning = () => {
  const { language } = useLanguage();

  const sections = [
    {
      title: "Purpose",
      body: "Define the spiritual objective of each service and align all elements toward that purpose.",
    },
    {
      title: "Responsibility",
      body: "Assign accountable leaders for coordination, preparation, follow-up, and service review.",
    },
    {
      title: "Order of Service",
      body: "Design clear service flow: opening, worship, prayer, word, response, announcements, and closing.",
    },
    {
      title: "Scheduling",
      body: "Maintain consistent calendar planning for weekly services, special events, and rehearsal timelines.",
    },
    {
      title: "Participation and Roles",
      body: "Clarify role allocation for worship team, ushers, media, prayer team, and preaching support.",
    },
    {
      title: "Doctrinal Integrity",
      body: "Ensure messages, songs, and teaching materials are theologically sound and church-aligned.",
    },
    {
      title: "Decorum and Conduct",
      body: "Uphold reverence, order, punctuality, and proper conduct throughout service environments.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Mipango ya Ibada" : "Services Planning"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {language === "sw"
            ? "Muundo wa kupanga ibada kwa utaratibu, ubora wa huduma, na uaminifu wa mafundisho."
            : "Structured planning framework for orderly, high-quality, and doctrinally faithful church services."}
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-5"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {section.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesPlanning;
