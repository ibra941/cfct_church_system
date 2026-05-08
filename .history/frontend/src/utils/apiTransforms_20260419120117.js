export const extractListData = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

export const normalizeMonthlyChartData = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.monthly_income;
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    offerings: Number(item.offerings ?? item.amount ?? 0),
    amount: Number(item.amount ?? item.offerings ?? 0),
  }));
};

const OFFERING_COLORS = {
  tithe: "#3b82f6",
  offering: "#10b981",
  pledge: "#6366f1",
  building: "#f59e0b",
  mission: "#ef4444",
  benevolence: "#14b8a6",
  thanksgiving: "#ec4899",
  other: "#8b5cf6",
};

export const normalizeOfferingSummary = (payload) => {
  const items = extractListData(payload);

  return items
    .map((item) => {
      const type = item.type || item.name || "other";
      return {
        ...item,
        name: item.name || String(type).replace(/_/g, " "),
        value: Number(item.value ?? item.total ?? item.amount ?? 0),
        color: item.color || OFFERING_COLORS[type] || OFFERING_COLORS.other,
      };
    })
    .filter((item) => item.value > 0);
};