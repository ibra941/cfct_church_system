import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const PAGE_TYPE = "financial_oversight";

const defaultSections = [
  {
    title_en: "Budgeting",
    title_sw: "Bajeti",
    body_en:
      "Prepare annual budgets, break them down by ministry/unit, and track variance monthly.",
    body_sw:
      "Tengeneza bajeti ya mwaka, gawanya kwa idara, na fuatilia utekelezaji kila mwezi.",
  },
  {
    title_en: "Income Management",
    title_sw: "Usimamizi wa Mapato",
    body_en:
      "Record all income streams including tithes, offerings, special contributions, and other verified inflows.",
    body_sw:
      "Rekodi mapato yote ya matoleo, zaka, michango maalum, na vyanzo vingine kwa uthibitisho.",
  },
  {
    title_en: "Expenditure Control",
    title_sw: "Udhibiti wa Matumizi",
    body_en:
      "Enforce spending approvals, limits, and purchase verification before payment execution.",
    body_sw:
      "Tumia idhini za matumizi, viwango vya matumizi, na uthibitisho wa manunuzi kabla ya malipo.",
  },
  {
    title_en: "Financial Record Keeping",
    title_sw: "Utunzaji wa Kumbukumbu za Fedha",
    body_en:
      "Maintain receipts, vouchers, and transaction records in an audit-ready structure.",
    body_sw:
      "Hifadhi risiti, vocha, na taarifa za miamala kwa mpangilio unaoweza kukaguliwa.",
  },
  {
    title_en: "Financial Reporting",
    title_sw: "Taarifa za Fedha",
    body_en:
      "Publish monthly/quarterly reports on income, expenditure, balances, and budget performance.",
    body_sw:
      "Toa taarifa za mwezi/robo mwaka kuhusu mapato, matumizi, salio, na utekelezaji wa bajeti.",
  },
  {
    title_en: "Internal Control",
    title_sw: "Udhibiti wa Ndani",
    body_en:
      "Separate duties for receiving, approving, paying, and reconciling to reduce control risk.",
    body_sw:
      "Tenganisha majukumu ya kupokea, kuidhinisha, kulipa, na kupatanisha ili kupunguza hatari.",
  },
  {
    title_en: "Auditing",
    title_sw: "Ukaguzi",
    body_en: "Run periodic internal audits and independent audits where required.",
    body_sw:
      "Fanya ukaguzi wa ndani wa mara kwa mara na ukaguzi huru inapohitajika.",
  },
  {
    title_en: "Asset Management",
    title_sw: "Usimamizi wa Mali",
    body_en:
      "Track church assets through registers, condition checks, utilization, and maintenance schedules.",
    body_sw:
      "Sajili mali za kanisa, fuatilia hali yake, matumizi, na matengenezo yake.",
  },
  {
    title_en: "Banking and Cash Management",
    title_sw: "Usimamizi wa Benki na Fedha Taslimu",
    body_en:
      "Perform bank reconciliations, cash controls, and timely deposits with documented traceability.",
    body_sw:
      "Fanya upatanisho wa benki, udhibiti wa fedha taslimu, na amana kwa wakati.",
  },
  {
    title_en: "Legal Compliance",
    title_sw: "Uzingatiaji wa Kisheria",
    body_en:
      "Ensure compliance with tax obligations, legal regulations, and statutory financial requirements.",
    body_sw:
      "Hakikisha uzingatiaji wa kodi, sheria za taasisi, na taratibu za kifedha za nchi.",
  },
];

const emptyForm = {
  title_en: "",
  title_sw: "",
  body_en: "",
  body_sw: "",
  order: 0,
};

const FinancialOversight = () => {
  const { language } = useLanguage();
  const { user } = useAuth();

  const sections = [
    {
      title: language === "sw" ? "Bajeti" : "Budgeting",
      body:
        language === "sw"
          ? "Tengeneza bajeti ya mwaka, gawanya kwa idara, na fuatilia utekelezaji kila mwezi."
          : "Prepare annual budgets, break them down by ministry/unit, and track variance monthly.",
    },
    {
      title: language === "sw" ? "Usimamizi wa Mapato" : "Income Management",
      body:
        language === "sw"
          ? "Rekodi mapato yote ya matoleo, zaka, michango maalum, na vyanzo vingine kwa uthibitisho."
          : "Record all income streams including tithes, offerings, special contributions, and other verified inflows.",
    },
    {
      title: language === "sw" ? "Udhibiti wa Matumizi" : "Expenditure Control",
      body:
        language === "sw"
          ? "Tumia idhini za matumizi, viwango vya matumizi, na uthibitisho wa manunuzi kabla ya malipo."
          : "Enforce spending approvals, limits, and purchase verification before payment execution.",
    },
    {
      title:
        language === "sw"
          ? "Utunzaji wa Kumbukumbu za Fedha"
          : "Financial Record Keeping",
      body:
        language === "sw"
          ? "Hifadhi risiti, vocha, na taarifa za miamala kwa mpangilio unaoweza kukaguliwa."
          : "Maintain receipts, vouchers, and transaction records in an audit-ready structure.",
    },
    {
      title: language === "sw" ? "Taarifa za Fedha" : "Financial Reporting",
      body:
        language === "sw"
          ? "Toa taarifa za mwezi/robo mwaka kuhusu mapato, matumizi, salio, na utekelezaji wa bajeti."
          : "Publish monthly/quarterly reports on income, expenditure, balances, and budget performance.",
    },
    {
      title: language === "sw" ? "Udhibiti wa Ndani" : "Internal Control",
      body:
        language === "sw"
          ? "Tenganisha majukumu ya kupokea, kuidhinisha, kulipa, na kupatanisha ili kupunguza hatari."
          : "Separate duties for receiving, approving, paying, and reconciling to reduce control risk.",
    },
    {
      title: language === "sw" ? "Ukaguzi" : "Auditing",
      body:
        language === "sw"
          ? "Fanya ukaguzi wa ndani wa mara kwa mara na ukaguzi huru inapohitajika."
          : "Run periodic internal audits and independent audits where required.",
    },
    {
      title: language === "sw" ? "Usimamizi wa Mali" : "Asset Management",
      body:
        language === "sw"
          ? "Sajili mali za kanisa, fuatilia hali yake, matumizi, na matengenezo yake."
          : "Track church assets through registers, condition checks, utilization, and maintenance schedules.",
    },
    {
      title:
        language === "sw"
          ? "Usimamizi wa Benki na Fedha Taslimu"
          : "Banking and Cash Management",
      body:
        language === "sw"
          ? "Fanya upatanisho wa benki, udhibiti wa fedha taslimu, na amana kwa wakati."
          : "Perform bank reconciliations, cash controls, and timely deposits with documented traceability.",
    },
    {
      title: language === "sw" ? "Uzingatiaji wa Kisheria" : "Legal Compliance",
      body:
        language === "sw"
          ? "Hakikisha uzingatiaji wa kodi, sheria za taasisi, na taratibu za kifedha za nchi."
          : "Ensure compliance with tax obligations, legal regulations, and statutory financial requirements.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Usimamizi wa Fedha" : "Financial Oversight"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {language === "sw"
            ? "Mwongozo wa usimamizi wa fedha wa kanisa kwa uwazi, uwajibikaji, na uendelevu."
            : "Operational framework for transparent, accountable, and sustainable church finance management."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
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

export default FinancialOversight;
