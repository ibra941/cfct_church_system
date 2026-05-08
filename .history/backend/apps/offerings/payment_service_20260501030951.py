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


def get_church_bank_details() -> dict:
    """
    Return the church bank account details configured in settings.
    Church admins should set these via environment variables.
    """
    return {
        "bank_name": getattr(settings, "CHURCH_BANK_NAME", "CRDB Bank"),
        "account_number": getattr(settings, "CHURCH_BANK_ACCOUNT_NUMBER", ""),
        "account_name": getattr(settings, "CHURCH_BANK_ACCOUNT_NAME", "CFCT Church"),
        "branch": getattr(settings, "CHURCH_BANK_BRANCH", ""),
        "swift_code": getattr(settings, "CHURCH_BANK_SWIFT_CODE", ""),
    }
