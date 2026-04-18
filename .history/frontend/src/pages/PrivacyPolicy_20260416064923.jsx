const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-5 text-gray-700 dark:text-gray-200">
          <p>
            CFCT Management System collects personal and church administration data to manage
            membership, events, offerings, reports, and communication workflows.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data We Process</h2>
          <p>
            We process account details, profile information, registration records, attendance and
            contribution records, and activity logs required for church governance and reporting.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How Data Is Used</h2>
          <p>
            Data is used for member management, approvals, communication, safeguarding, financial
            reporting, and operational decision-making within authorized leadership roles.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access and Retention</h2>
          <p>
            Access is role-based. Records are retained according to church policy and legal
            obligations, and may be exported or deleted upon valid data-subject requests.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact</h2>
          <p>
            For privacy requests, contact your system administrator or designated church data
            protection officer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
