import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const PopupNews = ({ onClose }) => {
  const { language } = useLanguage();
  const [popups, setPopups] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopupNews();
  }, []);

  const fetchPopupNews = async () => {
    try {
      // Use the dedicated popup endpoint
      const response = await api.get("/events/popup/");
      if (response.data && response.data.length > 0) {
        setPopups(response.data);
      }
    } catch (error) {
      console.error("Error fetching popup news:", error);
      // Fallback to query parameter method
      try {
        const fallbackResponse = await api.get("/events/?is_popup_news=true");
        if (fallbackResponse.data && fallbackResponse.data.length > 0) {
          setPopups(fallbackResponse.data);
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < popups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // If at last popup, close after showing all
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    // Store in localStorage to prevent showing again for this session
    localStorage.setItem("popupClosed", "true");
    localStorage.setItem("popupClosedTime", Date.now().toString());
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!popups.length || !popups[currentIndex]) {
    return null;
  }

  const currentPopup = popups[currentIndex];
  const hasMultiple = popups.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-800 rounded-full p-1"
        >
          <FaTimes />
        </button>

        {/* Image */}
        {currentPopup.images && currentPopup.images[0] && (
          <img
            src={currentPopup.images[0]}
            alt={currentPopup.title}
            className="w-full h-48 object-cover"
          />
        )}

        {/* Content */}
        <div className="p-6">
          {/* Event Type Badge */}
          {currentPopup.event_type && (
            <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 mb-3">
              {currentPopup.event_type_display || currentPopup.event_type}
            </span>
          )}

          {/* Title */}
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {currentPopup.title}
          </h4>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {currentPopup.description}
          </p>

          {/* Date */}
          {currentPopup.start_date && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center">
              <span className="mr-2">📅</span>
              {new Date(currentPopup.start_date).toLocaleDateString()}
              {currentPopup.end_date && (
                <> - {new Date(currentPopup.end_date).toLocaleDateString()}</>
              )}
            </p>
          )}

          {/* Venue */}
          {currentPopup.venue && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center">
              <span className="mr-2">📍</span>
              {currentPopup.venue}
            </p>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
          <div className="flex-1">
            {hasMultiple && (
              <div className="flex justify-center space-x-1">
                {popups.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex
                        ? "w-6 bg-primary-600"
                        : "w-2 bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            {hasMultiple && currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="btn-secondary flex items-center space-x-1"
              >
                <FaChevronLeft className="text-sm" />
                <span>{language === "sw" ? "Nyuma" : "Previous"}</span>
              </button>
            )}

            <button
              onClick={hasMultiple ? handleNext : handleClose}
              className="btn-primary"
            >
              {hasMultiple && currentIndex < popups.length - 1
                ? language === "sw"
                  ? "Inayofuata"
                  : "Next"
                : language === "sw"
                  ? "Funga"
                  : "Close"}
              {hasMultiple && currentIndex < popups.length - 1 && (
                <FaChevronRight className="ml-2 inline" />
              )}
            </button>
          </div>
        </div>

        {/* Progress indicator for multiple popups */}
        {hasMultiple && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / popups.length) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupNews;
