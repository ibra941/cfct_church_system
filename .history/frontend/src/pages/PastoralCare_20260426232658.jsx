import { useLanguage } from "../contexts/LanguageContext";

const PastoralCare = () => {
  const { language } = useLanguage();

  const sections = [
    "Spiritual Care",
    "Emotional and Psychological Support",
    "Crisis and Bereavement Care",
    "Visitation Ministry",
    "Family and Relationship Support",
    "Discipleship and Mentorship",
    "Community and Social Support",
    "Ethical and Moral Guidance",
    "Confidentiality and Trust",
  ];

  const descriptions = {
    "Spiritual Care":
      "Provide prayer, scripture guidance, spiritual direction, and follow-up for personal faith growth.",
    "Emotional and Psychological Support":
      "Offer listening, basic counseling, and referrals where specialized mental health care is needed.",
    "Crisis and Bereavement Care":
      "Respond quickly during emergencies, grief, and loss with structured support and presence.",
    "Visitation Ministry":
      "Maintain regular home, hospital, and member visit schedules with recorded pastoral notes.",
    "Family and Relationship Support":
      "Support marriages, parenting, conflict resolution, and restoration through biblical and practical care.",
    "Discipleship and Mentorship":
      "Pair members with mentors, track growth plans, and strengthen maturity in doctrine and character.",
    "Community and Social Support":
      "Coordinate care networks for practical needs, welfare cases, and community integration.",
    "Ethical and Moral Guidance":
      "Teach and model godly conduct, accountability, and wise decision-making in daily life.",
    "Confidentiality and Trust":
      "Protect sensitive pastoral information and maintain ethical boundaries in all care interactions.",
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Huduma ya Kichungaji" : "Pastoral Care"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {language === "sw"
            ? "Mfumo wa huduma ya kichungaji uliopangwa, unaorekodiwa, na unaolinda utu wa waumini."
            : "Organized and well-documented pastoral care framework centered on member dignity and trust."}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {sections.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-gray-100 dark:border-gray-700 p-4"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                {language === "sw" ? item : item}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">
                {descriptions[item]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PastoralCare;
