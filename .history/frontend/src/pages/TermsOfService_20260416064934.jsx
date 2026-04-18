const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-5 text-gray-700 dark:text-gray-200">
          <p>
            These terms govern the use of CFCT Management System by church leaders, staff, and
            members.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Authorized Use</h2>
          <p>
            You must only access data and features that match your assigned role and legitimate
            ministry responsibilities.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Responsibility</h2>
          <p>
            Users are responsible for safeguarding login credentials and immediately reporting
            unauthorized access or suspicious activity.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data Accuracy</h2>
          <p>
            Users should submit accurate records for members, financial entries, and approvals.
            Deliberate falsification is prohibited.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Service Changes</h2>
          <p>
            Administrators may update, suspend, or restrict features for security, compliance, or
            maintenance reasons.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Termination</h2>
          <p>
            Access may be revoked for policy violations, misuse, or leadership directive.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
