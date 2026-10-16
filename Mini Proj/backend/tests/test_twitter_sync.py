import os
import unittest
from unittest.mock import MagicMock, patch
import requests

from app.twitter_sync import notify_twitter_complaint_status


class TwitterSyncTests(unittest.TestCase):
    def setUp(self):
        self._old_url = os.environ.get("TWITTER_API_URL")
        self._old_key = os.environ.get("BMC_SERVICE_KEY")
        os.environ["TWITTER_API_URL"] = "http://localhost:5000"
        os.environ["BMC_SERVICE_KEY"] = "bmc_shared_service_key_2026"

    def tearDown(self):
        if self._old_url is None:
            os.environ.pop("TWITTER_API_URL", None)
        else:
            os.environ["TWITTER_API_URL"] = self._old_url
        if self._old_key is None:
            os.environ.pop("BMC_SERVICE_KEY", None)
        else:
            os.environ["BMC_SERVICE_KEY"] = self._old_key

    def test_ignores_complaints_without_external_reference(self):
        result = notify_twitter_complaint_status(
            complaint_id="CMP-100",
            external_reference=None,
            old_status="open",
            new_status="resolved",
            event_key="evt-1",
        )
        self.assertFalse(result)

    @patch("requests.post")
    def test_successful_notification_sends_headers_and_payload(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = '{"success": true}'
        mock_post.return_value = mock_resp

        result = notify_twitter_complaint_status(
            complaint_id="CMP-12345",
            external_reference="661a2b3c4d5e6f7a8b9c0d1e",
            old_status="open",
            new_status="resolved",
            event_key="status:CMP-12345:open:resolved:2026-10-16",
        )

        self.assertTrue(result)
        self.assertEqual(mock_post.call_count, 1)

        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "http://localhost:5000/api/posts/bmc-resolve")
        self.assertEqual(kwargs["headers"]["X-Service-Key"], "bmc_shared_service_key_2026")
        self.assertEqual(kwargs["json"]["complaintId"], "CMP-12345")
        self.assertEqual(kwargs["json"]["externalReference"], "661a2b3c4d5e6f7a8b9c0d1e")
        self.assertEqual(kwargs["json"]["newStatus"], "resolved")

    @patch("time.sleep", return_value=None)
    @patch("requests.post")
    def test_retries_on_network_failure_and_recovers(self, mock_post, mock_sleep):
        fail_resp = requests.RequestException("Connection refused")
        ok_resp = MagicMock()
        ok_resp.status_code = 200
        ok_resp.text = '{"success": true}'

        mock_post.side_effect = [fail_resp, ok_resp]

        result = notify_twitter_complaint_status(
            complaint_id="CMP-12345",
            external_reference="661a2b3c4d5e6f7a8b9c0d1e",
            old_status="open",
            new_status="resolved",
            event_key="evt-retry",
            max_retries=3,
        )

        self.assertTrue(result)
        self.assertEqual(mock_post.call_count, 2)
        mock_sleep.assert_called_once()

    @patch("time.sleep", return_value=None)
    @patch("requests.post")
    def test_handles_exhausted_retries_without_raising_exception(self, mock_post, mock_sleep):
        mock_post.side_effect = requests.RequestException("Persistent timeout")

        result = notify_twitter_complaint_status(
            complaint_id="CMP-12345",
            external_reference="661a2b3c4d5e6f7a8b9c0d1e",
            old_status="open",
            new_status="resolved",
            event_key="evt-fail",
            max_retries=3,
        )

        self.assertFalse(result)
        self.assertEqual(mock_post.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)


if __name__ == "__main__":
    unittest.main()
