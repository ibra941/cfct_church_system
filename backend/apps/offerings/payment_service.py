"""
Tanzania Mobile Money payment service using Azampay payment gateway.

Azampay is a Tanzanian payment aggregator supporting:
  - Vodacom M-Pesa  (provider key: "Mpesa")
  - Tigo Pesa       (provider key: "Tigo")
  - Airtel Money    (provider key: "Airtel")
  - Halopesa        (provider key: "Halopesa")

Configuration (environment variables):
  AZAMPAY_APP_NAME      – your registered application name
  AZAMPAY_CLIENT_ID     – your Azampay client ID
  AZAMPAY_CLIENT_SECRET – your Azampay client secret

Docs: https://developerdocs.azampay.co.tz/
"""

import datetime
import logging
import uuid

import requests
from django.conf import settings
from apps.churches.models import ChurchPaymentDetails

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Azampay endpoints
# ---------------------------------------------------------------------------
_AUTH_URL = "https://authenticator.azampay.co.tz/AppRegistration/GenerateToken"
_MNO_CHECKOUT_URL = "https://checkout.azampay.co.tz/azampay/mno/checkout"

# Map internal operator codes → Azampay provider names
OPERATOR_PROVIDER_MAP: dict[str, str] = {
    "vodacom": "Mpesa",
    "tigo": "Tigo",
    "airtel": "Airtel",
    "halotel": "Halopesa",
}

DEMO_PAYMENT_DEFAULTS = {
    "vodacom_lipa_number": "715001",
    "tigo_lipa_number": "715002",
    "airtel_lipa_number": "715003",
    "halotel_lipa_number": "715004",
    "bank_name": "NMB Bank",
    "bank_account_number": "0150012345678",
    "bank_account_name": "CFCT Church Demo Account",
    "bank_branch": "Dar es Salaam Main Branch",
    "bank_swift_code": "NMIBTZTZ",
}

MOBILE_OPERATOR_SETTINGS_MAP = {
    "vodacom": ("Vodacom M-Pesa", "vodacom_lipa_number"),
    "tigo": ("Tigo Pesa", "tigo_lipa_number"),
    "airtel": ("Airtel Money", "airtel_lipa_number"),
    "halotel": ("Halopesa", "halotel_lipa_number"),
}


class AzampayService:
    """Initiate mobile-money STK pushes via the Azampay aggregator."""

    def __init__(self):
        self.app_name: str = getattr(settings, "AZAMPAY_APP_NAME", "")
        self.client_id: str = getattr(settings, "AZAMPAY_CLIENT_ID", "")
        self.client_secret: str = getattr(settings, "AZAMPAY_CLIENT_SECRET", "")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def initiate_push(
        self, phone: str, amount: str, external_id: str, operator: str
    ) -> dict:
        """
        Send an STK push to the customer's mobile wallet.

        Args:
            phone:       Customer phone (07XXXXXXXX or 255XXXXXXXXX).
            amount:      Amount string in TZS (e.g. "5000").
            external_id: Unique reference that Azampay echoes back in callbacks.
            operator:    One of vodacom | tigo | airtel | halotel.

        Returns:
            Azampay JSON response dict.

        Raises:
            requests.RequestException on network / HTTP errors.
            ValueError if credentials are not configured.
        """
        if not all([self.app_name, self.client_id, self.client_secret]):
            raise ValueError(
                "Azampay credentials are not configured. "
                "Set AZAMPAY_APP_NAME, AZAMPAY_CLIENT_ID and AZAMPAY_CLIENT_SECRET "
                "in environment variables."
            )

        provider = OPERATOR_PROVIDER_MAP.get(operator.lower(), "Mpesa")
        normalized_phone = self._normalize_phone(phone)
        token = self._get_token()

        resp = requests.post(
            _MNO_CHECKOUT_URL,
            json={
                "accountNumber": normalized_phone,
                "amount": str(amount),
                "currency": "TZS",
                "externalId": external_id,
                "provider": provider,
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_token(self) -> str:
        """Authenticate with Azampay and return a bearer token."""
        try:
            resp = requests.post(
                _AUTH_URL,
                json={
                    "appName": self.app_name,
                    "clientId": self.client_id,
                    "clientSecret": self.client_secret,
                },
                timeout=30,
            )
            resp.raise_for_status()
            token = resp.json().get("data", {}).get("accessToken")
            if not token:
                raise ValueError("Azampay returned no access token")
            return token
        except requests.RequestException as exc:
            logger.error("Azampay token error: %s", exc)
            raise

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """
        Convert any TZ phone format to 255XXXXXXXXX.
        Accepted inputs: 07XXXXXXXX  |  255XXXXXXXXX  |  +255XXXXXXXXX
        """
        phone = str(phone).strip().replace(" ", "").replace("-", "")
        if phone.startswith("+"):
            phone = phone[1:]
        elif phone.startswith("0"):
            phone = "255" + phone[1:]
        return phone


# ---------------------------------------------------------------------------
# Bank transfer helpers (no external API – Tanzania banks lack public APIs)
# ---------------------------------------------------------------------------


def generate_bank_reference() -> str:
    """
    Generate a unique, human-readable bank-transfer reference.
    Format: CFCT-YYYYMMDD-XXXXXX  (XXXXXX = 6 uppercase hex chars)
    Example: CFCT-20241215-A3F79C
    """
    today = datetime.date.today().strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CFCT-{today}-{suffix}"


def get_or_create_church_payment_details(church):
    if church is None:
        return None
    payment_details, _ = ChurchPaymentDetails.objects.get_or_create(
        church=church,
        defaults=DEMO_PAYMENT_DEFAULTS,
    )
    return payment_details


def get_church_mobile_money_details(church) -> dict:
    payment_details = get_or_create_church_payment_details(church)
    if payment_details is None:
        return {}

    return {
        operator: {
            "label": label,
            "lipa_number": getattr(payment_details, field_name, ""),
        }
        for operator, (label, field_name) in MOBILE_OPERATOR_SETTINGS_MAP.items()
    }


def get_church_bank_details(church=None) -> dict:
    payment_details = get_or_create_church_payment_details(church)
    if payment_details is None:
        return {
            "bank_name": getattr(settings, "CHURCH_BANK_NAME", "NMB Bank"),
            "account_number": getattr(settings, "CHURCH_BANK_ACCOUNT_NUMBER", DEMO_PAYMENT_DEFAULTS["bank_account_number"]),
            "account_name": getattr(settings, "CHURCH_BANK_ACCOUNT_NAME", "CFCT Church Demo Account"),
            "branch": getattr(settings, "CHURCH_BANK_BRANCH", "Dar es Salaam Main Branch"),
            "swift_code": getattr(settings, "CHURCH_BANK_SWIFT_CODE", "NMIBTZTZ"),
        }

    return {
        "bank_name": payment_details.bank_name,
        "account_number": payment_details.bank_account_number,
        "account_name": payment_details.bank_account_name,
        "branch": payment_details.bank_branch,
        "swift_code": payment_details.bank_swift_code,
    }
