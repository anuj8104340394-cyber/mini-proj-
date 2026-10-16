import logging
import os
import time
import requests

logger = logging.getLogger(__name__)

TWITTER_API_URL = os.getenv("TWITTER_API_URL", "http://localhost:5000")
BMC_SERVICE_KEY = os.getenv("BMC_SERVICE_KEY", "bmc_shared_service_key_2026")
MAX_SYNC_RETRIES = 3
INITIAL_RETRY_DELAY = 1.0


def notify_twitter_complaint_status(
    complaint_id: str,
    external_reference: str | None,
    old_status: str,
    new_status: str,
    event_key: str,
    note: str | None = None,
    max_retries: int = MAX_SYNC_RETRIES,
) -> bool:
    """Notify the Twitter Clone backend of a complaint status transition.

    Implements exponential backoff retries so temporary network hiccups
    or server restarts do not silently drop resolution/reopening events.
    """
    if not external_reference:
        # Not a complaint linked to a Twitter Clone post
        return False

    base_url = os.getenv("TWITTER_API_URL", TWITTER_API_URL).rstrip("/")
    service_key = os.getenv("BMC_SERVICE_KEY", BMC_SERVICE_KEY)
    endpoint = f"{base_url}/api/posts/bmc-resolve"

    payload = {
        "complaintId": complaint_id,
        "externalReference": external_reference,
        "oldStatus": old_status,
        "newStatus": new_status,
        "eventKey": event_key,
        "note": note,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Service-Key": service_key,
    }

    delay = INITIAL_RETRY_DELAY
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                "Notifying Twitter Clone of complaint %s status (%s -> %s), attempt %d/%d",
                complaint_id,
                old_status,
                new_status,
                attempt,
                max_retries,
            )
            response = requests.post(endpoint, json=payload, headers=headers, timeout=10)

            if response.status_code == 200:
                logger.info(
                    "Successfully synchronized status to Twitter Clone for complaint %s (status=%s): %s",
                    complaint_id,
                    new_status,
                    response.text,
                )
                return True

            logger.warning(
                "Twitter Clone API returned status %d on attempt %d: %s",
                response.status_code,
                attempt,
                response.text,
            )
            # If client error (e.g. 404 post not found, 400 bad payload), do not retry non-recoverable error
            if 400 <= response.status_code < 500 and response.status_code != 429:
                return False

        except requests.RequestException as exc:
            last_error = exc
            logger.warning(
                "Network error connecting to Twitter Clone on attempt %d/%d: %s",
                attempt,
                max_retries,
                exc,
            )

        if attempt < max_retries:
            time.sleep(delay)
            delay *= 2

    logger.error(
        "Failed to synchronize status to Twitter Clone for complaint %s after %d attempts: %s",
        complaint_id,
        max_retries,
        last_error,
    )
    return False
