"""Integration tests for Twitter Clone integration with FastAPI backend."""

import base64
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import auth, main, services
from app.db import Base
from app.models import Complaint, User


@compiles(JSONB, "sqlite")
def _compile_jsonb_for_sqlite(_type, _compiler, **_kwargs):
    return "JSON"


class FakeInference:
    def embedding(self, _text):
        return np.asarray([1.0, 0.0], dtype=float)

    def text_severity(self, _embedding):
        return "High"

    def photo_severity(self, _image):
        return "High"

    def process_video(self, original_video):
        return base64.b64encode(b"frame").decode(), "Low", "words", True


class TwitterIntegrationApiTests(unittest.TestCase):
    def setUp(self):
        handle, self.database_path = tempfile.mkstemp(prefix="twitter-integ-", suffix=".sqlite")
        os.close(handle)
        self.engine = create_engine(
            f"sqlite:///{self.database_path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()

        self._old_service_key = os.environ.get("BMC_SERVICE_KEY")
        self._old_secret = os.environ.get("JWT_SECRET_KEY")
        self._old_session_local = main.SessionLocal

        os.environ["BMC_SERVICE_KEY"] = "test-bmc-service-key-2026"
        os.environ["JWT_SECRET_KEY"] = "test-secret-at-least-32-bytes-long-123456"
        main.SessionLocal = self.Session

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        main.app.dependency_overrides[main.get_db] = override_db
        main.app.dependency_overrides[auth.get_db] = override_db
        self.client = TestClient(main.app)

        self.service_headers = {"X-Service-Key": "test-bmc-service-key-2026"}

    def tearDown(self):
        main.app.dependency_overrides.clear()
        main.SessionLocal = self._old_session_local
        self.db.close()
        self.engine.dispose()

        if self._old_service_key is None:
            os.environ.pop("BMC_SERVICE_KEY", None)
        else:
            os.environ["BMC_SERVICE_KEY"] = self._old_service_key

        if self._old_secret is None:
            os.environ.pop("JWT_SECRET_KEY", None)
        else:
            os.environ["JWT_SECRET_KEY"] = self._old_secret

        try:
            os.unlink(self.database_path)
        except FileNotFoundError:
            pass

    def test_post_complaint_with_service_key_success(self):
        payload = {
            "description": "Massive garbage pile near Dadar market @bmc please clear immediately",
            "source": "Twitter Clone",
            "external_reference": "mongo_post_tweet_001",
            "user_reference": "twitter_user_sneha",
            "location_name": "Dadar West, Mumbai",
            "latitude": 19.0178,
            "longitude": 72.8478,
            "category": "Solid waste"
        }
        with patch.object(services, "get_infer", return_value=FakeInference()), patch.object(
            services, "resolve_location", return_value={"lat": None, "lng": None, "display_name": None, "source": "none"}
        ):
            res = self.client.post("/complaints", json=payload, headers=self.service_headers)
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data.get("source"), "Twitter Clone")
        self.assertEqual(data.get("external_reference"), "mongo_post_tweet_001")
        self.assertEqual(data.get("user_reference"), "twitter_user_sneha")
        self.assertEqual(data.get("location"), "Dadar West, Mumbai")

        # Verify persisted in database
        persisted = self.db.query(Complaint).filter_by(external_reference="mongo_post_tweet_001").first()
        self.assertIsNotNone(persisted)
        self.assertEqual(persisted.source, "Twitter Clone")
        self.assertEqual(persisted.user_reference, "twitter_user_sneha")
        self.assertEqual(persisted.location, "Dadar West, Mumbai")

    def test_idempotency_duplicate_submission_returns_existing_complaint(self):
        payload = {
            "description": "Broken water pipeline leaking clean water at Bandra @bmc",
            "source": "Twitter Clone",
            "external_reference": "mongo_post_duplicate_check",
            "user_reference": "twitter_user_rahul",
            "latitude": 19.0596,
            "longitude": 72.8295,
            "category": "Water supply"
        }
        with patch.object(services, "get_infer", return_value=FakeInference()), patch.object(
            services, "resolve_location", return_value={"lat": None, "lng": None, "display_name": None, "source": "none"}
        ):
            # First submission
            res1 = self.client.post("/complaints", json=payload, headers=self.service_headers)
            self.assertIn(res1.status_code, [200, 201])
            id1 = res1.json()["id"]

            # Duplicate submission with identical external_reference
            res2 = self.client.post("/complaints", json=payload, headers=self.service_headers)
            self.assertIn(res2.status_code, [200, 201])
            id2 = res2.json()["id"]

        # IDs must match
        self.assertEqual(id1, id2)

        # Database must have exactly 1 record
        count = self.db.query(Complaint).filter_by(external_reference="mongo_post_duplicate_check").count()
        self.assertEqual(count, 1)

    def test_unauthorized_without_service_key_or_staff_token(self):
        payload = {
            "description": "Unauthorized submission attempt",
            "source": "Twitter Clone",
            "external_reference": "mongo_post_unauth"
        }
        # No auth headers
        res = self.client.post("/complaints", json=payload)
        self.assertIn(res.status_code, [401, 403])

        # Invalid service key
        res_bad_key = self.client.post("/complaints", json=payload, headers={"X-Service-Key": "wrong-secret"})
        self.assertIn(res_bad_key.status_code, [401, 403])

    def test_post_complaint_missing_optional_location_and_media(self):
        payload = {
            "description": "Streetlight not working on 14th road @bmc",
            "source": "Twitter Clone",
            "external_reference": "mongo_post_no_coords"
        }
        with patch.object(services, "get_infer", return_value=FakeInference()), patch.object(
            services, "resolve_location", return_value={"lat": None, "lng": None, "display_name": None, "source": "none"}
        ):
            res = self.client.post("/complaints", json=payload, headers=self.service_headers)
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data.get("external_reference"), "mongo_post_no_coords")

        persisted = self.db.query(Complaint).filter_by(external_reference="mongo_post_no_coords").first()
        self.assertIsNotNone(persisted)
        self.assertTrue(not persisted.image_url)

    def test_citizen_token_submission_still_supported(self):
        citizen = User(
            name="citizen_user", email="citizen@example.com", password_hash="test-hash",
            role="citizen", email_verified=True, is_active=True,
        )
        self.db.add(citizen)
        self.db.commit()

        citizen_token = auth._create_access_token(citizen)
        payload = {
            "text": "Pothole submitted directly through citizen portal",
            "lat": 19.0760,
            "lng": 72.8777
        }
        with patch.object(services, "get_infer", return_value=FakeInference()), patch.object(
            services, "resolve_location", return_value={"lat": None, "lng": None, "display_name": None, "source": "none"}
        ):
            res = self.client.post(
                "/citizen/complaints",
                json=payload,
                headers={"Authorization": f"Bearer {citizen_token}"}
            )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("id", data)
        persisted = self.db.query(Complaint).filter_by(id=data["id"]).first()
        self.assertIsNotNone(persisted)
        self.assertIn(persisted.source, ("citizen", "Citizen Portal"))


if __name__ == "__main__":
    unittest.main()
